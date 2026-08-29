/**
 * Room Service
 * In-memory room and match state machine
 */

const { generateRoomCode, generatePlayerId, generateRoundId } = require('../utils/idGenerator');
const { selectQuestionsForRound, getPublicQuestion } = require('./questionService');
const { calculateScore } = require('./scoringService');

const rooms = new Map(); // roomCode -> Room Object
const socketToRoom = new Map(); // socketId -> roomCode

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80'
];

/**
 * Create a new room
 */
function createRoom(hostName = 'Player 1', socketId, avatar) {
  const roomCode = generateRoomCode(rooms);
  const hostId = generatePlayerId();
  const roundId = generateRoundId();

  const hostPlayer = {
    id: hostId,
    name: hostName || 'Rahul (YOU)',
    socketId,
    avatar: avatar || DEFAULT_AVATARS[0],
    isHost: true,
    isReady: true,
    score: 0,
    correctCount: 0,
    totalTime: 0,
    answeredQuestions: [],
    currentQuestionAnswered: false,
    status: 'waiting'
  };

  const room = {
    roomCode,
    hostId,
    roundId,
    status: 'waiting', // 'waiting' | 'starting' | 'playing' | 'finished'
    players: [hostPlayer],
    questions: [],
    currentQuestionIndex: 0,
    questionStartedAt: 0,
    createdAt: Date.now()
  };

  rooms.set(roomCode, room);
  socketToRoom.set(socketId, roomCode);

  console.log(`[ROOM] Created ${roomCode} by ${hostName} (${socketId})`);
  return { success: true, room, player: hostPlayer };
}

/**
 * Join an existing room
 */
function joinRoom(roomCode, playerName = 'Player', socketId, avatar) {
  const code = (roomCode || '').toUpperCase().trim();
  const room = rooms.get(code);

  if (!room) {
    return { success: false, error: 'ROOM_NOT_FOUND', message: `Room "${code}" not found.` };
  }

  if (room.status === 'playing') {
    // Check if player reconnecting
    const existing = room.players.find(p => p.socketId === socketId || (p.name === playerName && p.isDisconnected));
    if (existing) {
      existing.socketId = socketId;
      existing.isDisconnected = false;
      socketToRoom.set(socketId, code);
      return { success: true, room, player: existing, isReconnect: true };
    }
    return { success: false, error: 'MATCH_IN_PROGRESS', message: 'Match already in progress.' };
  }

  if (room.players.length >= 8) {
    return { success: false, error: 'ROOM_FULL', message: 'Room has reached maximum capacity.' };
  }

  const playerId = generatePlayerId();
  const avatarUrl = avatar || DEFAULT_AVATARS[room.players.length % DEFAULT_AVATARS.length];

  const newPlayer = {
    id: playerId,
    name: playerName,
    socketId,
    avatar: avatarUrl,
    isHost: false,
    isReady: false,
    score: 0,
    correctCount: 0,
    totalTime: 0,
    answeredQuestions: [],
    currentQuestionAnswered: false,
    status: 'waiting'
  };

  room.players.push(newPlayer);
  socketToRoom.set(socketId, code);

  console.log(`[ROOM] ${playerName} joined ${code} (total players: ${room.players.length})`);
  return { success: true, room, player: newPlayer };
}

/**
 * Toggle player ready status
 */
function setPlayerReady(roomCode, socketId, isReady) {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };

  const player = room.players.find(p => p.socketId === socketId);
  if (!player) return { success: false, error: 'PLAYER_NOT_FOUND' };

  player.isReady = (isReady !== undefined) ? isReady : !player.isReady;
  return { success: true, room, player };
}

/**
 * Start game by host
 */
function startRoomGame(roomCode, socketId) {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };

  const player = room.players.find(p => p.socketId === socketId);
  if (!player || !player.isHost) {
    return { success: false, error: 'NOT_HOST', message: 'Only the host can start the game.' };
  }

  if (room.status !== 'waiting') {
    return { success: false, error: 'INVALID_STATUS', message: 'Game cannot be started in current state.' };
  }

  // Pick 10 questions for this round
  room.questions = selectQuestionsForRound(10);
  room.currentQuestionIndex = 0;
  room.status = 'starting';
  room.roundId = generateRoundId();

  // Reset players for new match
  room.players.forEach(p => {
    p.score = 0;
    p.correctCount = 0;
    p.totalTime = 0;
    p.answeredQuestions = [];
    p.currentQuestionAnswered = false;
    p.status = 'playing';
  });

  console.log(`[GAME] Match starting in room ${roomCode} with ${room.questions.length} questions.`);
  return { success: true, room };
}

/**
 * Begin active question
 */
function startQuestion(roomCode, questionIndex) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.currentQuestionIndex = questionIndex;
  room.status = 'playing';
  room.questionStartedAt = Date.now();

  room.players.forEach(p => {
    p.currentQuestionAnswered = false;
  });

  const activeQuestion = room.questions[questionIndex];
  if (!activeQuestion) return null;

  const publicQ = getPublicQuestion(activeQuestion);

  console.log(`[QUESTION] Room ${roomCode} started Q${questionIndex + 1}/${room.questions.length}: ${publicQ.prompt.substring(0, 40)}... (${publicQ.difficulty}, ${publicQ.timeLimit}s)`);

  return {
    questionNumber: questionIndex + 1,
    totalQuestions: room.questions.length,
    question: publicQ,
    startedAt: room.questionStartedAt,
    timeLimit: publicQ.timeLimit
  };
}

/**
 * Record player answer submission
 */
function recordPlayerAnswer(roomCode, socketId, questionId, selectedOption, answerReceivedAt = Date.now()) {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };

  const player = room.players.find(p => p.socketId === socketId);
  if (!player) return { success: false, error: 'PLAYER_NOT_FOUND' };

  if (player.currentQuestionAnswered) {
    return { success: false, error: 'QUESTION_ALREADY_ANSWERED', message: 'You have already submitted an answer for this question.' };
  }

  const currentQ = room.questions[room.currentQuestionIndex];
  if (!currentQ || currentQ.id !== questionId) {
    return { success: false, error: 'INVALID_QUESTION', message: 'Submitted question does not match active question.' };
  }

  // Calculate elapsed time securely on server
  const elapsedMs = Math.max(100, answerReceivedAt - room.questionStartedAt);
  const elapsedSec = Math.max(1, Math.round(elapsedMs / 1000));
  const timeLimit = currentQ.timeLimit;

  let isCorrect = false;
  let points = 0;
  let isSpeedBonus = false;
  let isTimeout = false;

  if (elapsedSec > timeLimit + 1) {
    // Late submission -> timeout
    isTimeout = true;
    isCorrect = false;
    points = 0;
  } else {
    isCorrect = (selectedOption === currentQ.correctIndex);
    const scoreResult = calculateScore(isCorrect, elapsedSec, timeLimit);
    points = scoreResult.points;
    isSpeedBonus = scoreResult.isSpeedBonus;
  }

  player.currentQuestionAnswered = true;
  player.score += points;
  player.totalTime += elapsedSec;
  if (isCorrect) player.correctCount++;

  const answerRecord = {
    questionIndex: room.currentQuestionIndex,
    questionId: currentQ.id,
    category: currentQ.category,
    selectedOption,
    isCorrect,
    timeSpent: elapsedSec,
    timedOut: isTimeout,
    points,
    isSpeedBonus
  };

  player.answeredQuestions.push(answerRecord);

  console.log(`[ANSWER] ${player.name} answered Q${room.currentQuestionIndex + 1} in room ${roomCode}: correct=${isCorrect}, time=${elapsedSec}s, pts=+${points}`);

  return {
    success: true,
    player,
    isCorrect,
    correctIndex: currentQ.correctIndex,
    points,
    isSpeedBonus,
    timeSpent: elapsedSec,
    explanation: currentQ.explanation || null
  };
}

/**
 * Record question timeout for player
 */
function recordPlayerTimeout(roomCode, socketId, questionId) {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };

  const player = room.players.find(p => p.socketId === socketId);
  if (!player) return { success: false, error: 'PLAYER_NOT_FOUND' };

  if (player.currentQuestionAnswered) {
    return { success: false, error: 'QUESTION_ALREADY_ANSWERED' };
  }

  const currentQ = room.questions[room.currentQuestionIndex];
  if (!currentQ) return { success: false, error: 'NO_ACTIVE_QUESTION' };

  const timeLimit = currentQ.timeLimit;
  player.currentQuestionAnswered = true;
  player.totalTime += timeLimit;

  player.answeredQuestions.push({
    questionIndex: room.currentQuestionIndex,
    questionId: currentQ.id,
    category: currentQ.category,
    selectedOption: -1,
    isCorrect: false,
    timeSpent: timeLimit,
    timedOut: true,
    points: 0,
    isSpeedBonus: false
  });

  return {
    success: true,
    player,
    isCorrect: false,
    correctIndex: currentQ.correctIndex,
    points: 0,
    timeSpent: timeLimit
  };
}

/**
 * Check if all players have completed current question
 */
function allPlayersAnswered(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return false;
  return room.players.filter(p => !p.isDisconnected).every(p => p.currentQuestionAnswered);
}

/**
 * Get sorted leaderboard with tie-breaking
 * (1. Score DESC, 2. CorrectCount DESC, 3. TotalTime ASC)
 */
function getSortedLeaderboard(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return [];

  const sorted = [...room.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return a.totalTime - b.totalTime;
  });

  return sorted.map((p, index) => ({
    rank: index + 1,
    playerId: p.id,
    playerName: p.name,
    socketId: p.socketId,
    avatar: p.avatar,
    score: p.score,
    correctCount: p.correctCount,
    totalTime: p.totalTime,
    isHost: p.isHost,
    isReady: p.isReady,
    isDisconnected: p.isDisconnected || false
  }));
}

/**
 * Calculate final match statistics for results view
 */
function calculateFinalResults(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.status = 'finished';
  const leaderboard = getSortedLeaderboard(roomCode);
  const totalQuestions = room.questions.length || 10;

  const playerResults = room.players.map(player => {
    const answeredCount = player.answeredQuestions.length;
    const correctCount = player.answeredQuestions.filter(a => a.isCorrect).length;
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const avgTime = answeredCount > 0 ? Math.round(player.totalTime / answeredCount) : 0;

    // Domain category breakdown
    const categories = ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'];
    const categoryStats = {};

    categories.forEach(cat => {
      const qInCat = player.answeredQuestions.filter(a => a.category === cat);
      const catCorrect = qInCat.filter(a => a.isCorrect).length;
      categoryStats[cat] = {
        total: qInCat.length,
        correct: catCorrect,
        percentage: qInCat.length > 0 ? Math.round((catCorrect / qInCat.length) * 100) : 0
      };
    });

    const rank = leaderboard.find(l => l.playerId === player.id)?.rank || 1;

    return {
      playerId: player.id,
      socketId: player.socketId,
      name: player.name,
      avatar: player.avatar,
      rank,
      score: player.score,
      correctCount,
      totalQuestions,
      accuracy,
      avgTime,
      totalTime: player.totalTime,
      categoryStats
    };
  });

  console.log(`[GAME] Match finished for room ${roomCode}. Winner: ${leaderboard[0]?.playerName} (${leaderboard[0]?.score} pts)`);

  return {
    roomCode,
    roundId: room.roundId,
    leaderboard,
    playerResults
  };
}

/**
 * Reset room for Play Again (same room code, fresh round)
 */
function resetRoomForPlayAgain(roomCode, socketId) {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: 'ROOM_NOT_FOUND' };

  room.status = 'waiting';
  room.currentQuestionIndex = 0;
  room.questions = [];
  room.roundId = generateRoundId();
  room.questionStartedAt = 0;

  room.players.forEach(p => {
    p.score = 0;
    p.correctCount = 0;
    p.totalTime = 0;
    p.answeredQuestions = [];
    p.currentQuestionAnswered = false;
    p.isReady = p.isHost; // host remains ready
    p.status = 'waiting';
  });

  console.log(`[ROOM] Room ${roomCode} reset for Play Again by ${socketId}.`);
  return { success: true, room };
}

/**
 * Handle player disconnect
 */
function handleDisconnect(socketId) {
  const roomCode = socketToRoom.get(socketId);
  if (!roomCode) return null;

  const room = rooms.get(roomCode);
  if (!room) {
    socketToRoom.delete(socketId);
    return null;
  }

  const playerIndex = room.players.findIndex(p => p.socketId === socketId);
  if (playerIndex === -1) return null;

  const player = room.players[playerIndex];

  if (room.status === 'waiting') {
    // Remove player completely
    room.players.splice(playerIndex, 1);
    socketToRoom.delete(socketId);

    // If room is empty, delete room
    if (room.players.length === 0) {
      rooms.delete(roomCode);
      console.log(`[ROOM] Room ${roomCode} closed (empty).`);
      return null;
    }

    // If host left, transfer host role
    if (player.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
      room.players[0].isReady = true;
      room.hostId = room.players[0].id;
      console.log(`[ROOM] Host role in ${roomCode} transferred to ${room.players[0].name}`);
    }

    return { roomCode, room, action: 'removed', player };
  } else {
    // In match: mark as disconnected without crashing match
    player.isDisconnected = true;
    console.log(`[ROOM] Player ${player.name} disconnected from active match in ${roomCode}`);
    return { roomCode, room, action: 'marked_disconnected', player };
  }
}

function getRoom(roomCode) {
  return rooms.get((roomCode || '').toUpperCase().trim());
}

function getRoomBySocketId(socketId) {
  const roomCode = socketToRoom.get(socketId);
  return roomCode ? rooms.get(roomCode) : null;
}

module.exports = {
  createRoom,
  joinRoom,
  setPlayerReady,
  startRoomGame,
  startQuestion,
  recordPlayerAnswer,
  recordPlayerTimeout,
  allPlayersAnswered,
  getSortedLeaderboard,
  calculateFinalResults,
  resetRoomForPlayAgain,
  handleDisconnect,
  getRoom,
  getRoomBySocketId
};
