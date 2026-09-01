/**
 * Socket Game Handlers
 * Game start countdown, question synchronization, server-side answer evaluation, timeouts, and Play Again
 */

const {
  startRoomGame,
  startQuestion,
  recordPlayerAnswer,
  recordPlayerTimeout,
  allPlayersAnswered,
  getSortedLeaderboard,
  calculateFinalResults,
  resetRoomForPlayAgain,
  getRoom
} = require('../services/roomService');

// Active timer trackers per room to prevent zombie intervals
const roomTimers = new Map();

function clearRoomTimer(roomCode) {
  if (roomTimers.has(roomCode)) {
    clearTimeout(roomTimers.get(roomCode));
    roomTimers.delete(roomCode);
  }
}

module.exports = function registerGameHandlers(io, socket) {
  /**
   * Host starts game
   */
  socket.on('game:start', ({ roomCode }) => {
    try {
      const result = startRoomGame(roomCode, socket.id);
      if (!result.success) {
        socket.emit('server:error', { error: result.error, message: result.message });
        return;
      }

      // Broadcast 3-second countdown starting
      io.to(roomCode).emit('game:starting', {
        roomCode,
        countdownSeconds: 3
      });

      // Start Question 1 after 3 seconds
      clearRoomTimer(roomCode);
      const timer = setTimeout(() => {
        io.to(roomCode).emit('game:started', { roomCode });
        dispatchQuestion(io, roomCode, 0);
      }, 3000);

      roomTimers.set(roomCode, timer);
    } catch (err) {
      console.error('[SOCKET ERROR] game:start', err);
      socket.emit('server:error', { error: 'INTERNAL_ERROR', message: 'Failed to start game.' });
    }
  });

  /**
   * Player submits an answer
   */
  socket.on('answer:submit', ({ roomCode, questionId, selectedOption }) => {
    try {
      const now = Date.now();
      const result = recordPlayerAnswer(roomCode, socket.id, questionId, selectedOption, now);

      if (!result.success) {
        socket.emit('server:error', { error: result.error, message: result.message });
        return;
      }

      // Send private answer feedback to submitter with correct answer & points
      socket.emit('answer:result', {
        questionId,
        selectedOption,
        isCorrect: result.isCorrect,
        correctIndex: result.correctIndex,
        points: result.points,
        isSpeedBonus: result.isSpeedBonus,
        timeSpent: result.timeSpent,
        explanation: result.explanation
      });

      // Broadcast updated leaderboard to all room players immediately
      const leaderboard = getSortedLeaderboard(roomCode);
      io.to(roomCode).emit('leaderboard:update', { players: leaderboard });

      // Check if all players have answered
      const room = getRoom(roomCode);
      if (room && allPlayersAnswered(roomCode)) {
        // Advance to next question quickly after short feedback delay (1.2s)
        clearRoomTimer(roomCode);
        const nextTimer = setTimeout(() => {
          const nextIndex = room.currentQuestionIndex + 1;
          if (nextIndex < room.questions.length) {
            dispatchQuestion(io, roomCode, nextIndex);
          } else {
            finishGame(io, roomCode);
          }
        }, 1200);
        roomTimers.set(roomCode, nextTimer);
      }
    } catch (err) {
      console.error('[SOCKET ERROR] answer:submit', err);
    }
  });

  /**
   * Question skip / timeout from client
   */
  socket.on('question:timeout', ({ roomCode, questionId }) => {
    try {
      const result = recordPlayerTimeout(roomCode, socket.id, questionId);
      if (!result.success) return;

      socket.emit('answer:result', {
        questionId,
        selectedOption: -1,
        isCorrect: false,
        correctIndex: result.correctIndex,
        points: 0,
        isSpeedBonus: false,
        timeSpent: result.timeSpent,
        timedOut: true
      });

      const leaderboard = getSortedLeaderboard(roomCode);
      io.to(roomCode).emit('leaderboard:update', { players: leaderboard });

      const room = getRoom(roomCode);
      if (room && allPlayersAnswered(roomCode)) {
        clearRoomTimer(roomCode);
        const nextTimer = setTimeout(() => {
          const nextIndex = room.currentQuestionIndex + 1;
          if (nextIndex < room.questions.length) {
            dispatchQuestion(io, roomCode, nextIndex);
          } else {
            finishGame(io, roomCode);
          }
        }, 1200);
        roomTimers.set(roomCode, nextTimer);
      }
    } catch (err) {
      console.error('[SOCKET ERROR] question:timeout', err);
    }
  });

  /**
   * Play Again / Reset Round
   */
  socket.on('round:playAgain', ({ roomCode }) => {
    try {
      clearRoomTimer(roomCode);
      const result = resetRoomForPlayAgain(roomCode, socket.id);
      if (!result.success) {
        socket.emit('server:error', { error: result.error, message: result.message });
        return;
      }

      io.to(roomCode).emit('round:reset', {
        roomCode,
        players: result.room.players
      });

      io.to(roomCode).emit('room:players', {
        roomCode,
        players: result.room.players
      });
    } catch (err) {
      console.error('[SOCKET ERROR] round:playAgain', err);
    }
  });
};

/**
 * Dispatch next question to room and set server-side timeout watchdog
 */
function dispatchQuestion(io, roomCode, questionIndex) {
  clearRoomTimer(roomCode);
  const qPayload = startQuestion(roomCode, questionIndex);
  if (!qPayload) {
    finishGame(io, roomCode);
    return;
  }

  // Broadcast sanitized question data
  io.to(roomCode).emit('question:started', qPayload);

  // Broadcast initial standings for this question
  const leaderboard = getSortedLeaderboard(roomCode);
  io.to(roomCode).emit('leaderboard:update', { players: leaderboard });

  // Server-side watchdog timeout: question timeLimit + 2s grace
  const maxWaitMs = (qPayload.timeLimit + 2) * 1000;
  const timeoutWatcher = setTimeout(() => {
    const room = getRoom(roomCode);
    if (!room || room.status !== 'playing' || room.currentQuestionIndex !== questionIndex) return;

    // Timeout remaining unanswered players
    room.players.forEach(p => {
      if (!p.currentQuestionAnswered) {
        recordPlayerTimeout(roomCode, p.socketId, qPayload.question.id);
      }
    });

    const updatedLeaderboard = getSortedLeaderboard(roomCode);
    io.to(roomCode).emit('leaderboard:update', { players: updatedLeaderboard });

    const nextIndex = questionIndex + 1;
    if (nextIndex < room.questions.length) {
      dispatchQuestion(io, roomCode, nextIndex);
    } else {
      finishGame(io, roomCode);
    }
  }, maxWaitMs);

  roomTimers.set(roomCode, timeoutWatcher);
}

/**
 * Conclude game, calculate final stats, and broadcast results
 */
function finishGame(io, roomCode) {
  clearRoomTimer(roomCode);
  const finalData = calculateFinalResults(roomCode);
  if (!finalData) return;

  io.to(roomCode).emit('game:finished', finalData);
}
