/**
 * Room Service
 * In-memory room and match state machine with full reconnection and persistence integration
 */

const { generateRoomCode, generatePlayerId, generateRoundId } = require('../utils/idGenerator');
const { selectQuestionsForRound, getPublicQuestion } = require('./questionService');
const { calculateScore } = require('./scoringService');
const { recordMatch } = require('./historyService');

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
function createRoom(hostName = 'Player 1', socketId, avatar, existingPlayerId) {
  const roomCode = generateRoomCode(rooms);
  const hostId = existingPlayerId || generatePlayerId();
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
    status: 'waiting',
    isDisconnected: false
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
 * Join or reconnect to an existing room
 */
function joinRoom(roomCode, playerName = 'Player', socketId, avatar, playerId) {
  const code = (roomCode || '').toUpperCase().trim();
  const room = rooms.get(code);

  if (!room) {
    return { success: false, error: 'ROOM_NOT_FOUND', message: `Room "${code}" not found.` };
  }

  // 1. Check for Reconnection by socketId or explicit matching playerId in THIS specific room
  const existing = room.players.find(p =>
    (playerId && p.id === playerId) ||
    p.socketId === socketId
  );

  if (existing) {
    existing.socketId = socketId;
    existing.isDisconnected = false;
    socketToRoom.set(socketId, code);

    console.log(`[RECONNECT] Player ${existing.name} reconnected to room ${code} (status: ${room.status})`);

    let gameState = null;
    if (room.status === 'playing') {
      const currentQ = room.questions[room.currentQuestionIndex];
      const elapsedSec = Math.max(0, Math.round((Date.now() - room.questionStartedAt) / 1000));
      const timeRemaining = currentQ ? Math.max(0, currentQ.timeLimit - elapsedSec) : 0;

      gameState = {
        status: room.status,
        questionNumber: room.currentQuestionIndex + 1,
        totalQuestions: room.questions.length,
        question: currentQ ? getPublicQuestion(currentQ) : null,
        timeRemaining,
        timeLimit: currentQ ? currentQ.timeLimit : 30,
        isAnswered: existing.currentQuestionAnswered,
        leaderboard: getSortedLeaderboard(code)
      };
    }

    return {
      success: true,
      room,
      player: existing,
      isReconnect: true,
      gameState
    };
  }

  // 2. Reject new joins if match in progress
  if (room.status === 'playing' || room.status === 'starting') {
    return { success: false, error: 'MATCH_IN_PROGRESS', message: 'Match already in progress.' };
  }

  if (room.players.length >= 8) {
    return { success: false, error: 'ROOM_FULL', message: 'Room has reached maximum capacity.' };
  }

  // 3. Add fresh new player
  const newPlayerId = generatePlayerId();
  const avatarIndex = room.players.length % DEFAULT_AVATARS.length;
  const avatarUrl = avatar || DEFAULT_AVATARS[avatarIndex];
  const finalName = playerName || `Player ${room.players.length + 1}`;

  const newPlayer = {
    id: newPlayerId,
    name: finalName,
    socketId,
    avatar: avatarUrl,
    isHost: false,
    isReady: false,
    score: 0,
    correctCount: 0,
    totalTime: 0,
    answeredQuestions: [],
    currentQuestionAnswered: false,
    status: 'waiting',
    isDisconnected: false
  };

  room.players.push(newPlayer);
  socketToRoom.set(socketId, code);

  console.log(`[ROOM] ${finalName} (${newPlayerId}) joined ${code} (total players: ${room.players.length})`);
  return { success: true, room, player: newPlayer, isReconnect: false };
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

  // Minimum 2 players required to start match
  if (room.players.length < 2) {
    return { success: false, error: 'MIN_PLAYERS_REQUIRED', message: 'At least 2 players are required to start an Arena Battle.' };
  }

  // Pick 10 questions for this round from question bank
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
 * Check if all connected players have completed current question
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
 * Calculate final match statistics, save to persistent database store, and return results
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

  const finalData = {
    roomCode,
    roundId: room.roundId,
    leaderboard,
    playerResults
  };

  // Persist to history database file
  recordMatch(finalData);

  console.log(`[GAME] Match finished for room ${roomCode}. Winner: ${leaderboard[0]?.playerName} (${leaderboard[0]?.score} pts)`);

  return finalData;
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
    // Remove player from lobby
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
    console.log(`[ROOM] Player ${player.name} marked disconnected from active match in ${roomCode}`);
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
