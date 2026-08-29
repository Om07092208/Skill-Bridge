/**
 * Socket Room Handlers
 * Lobby creation, joining, ready toggles, and participant broadcasts
 */

const {
  createRoom,
  joinRoom,
  setPlayerReady,
  handleDisconnect,
  getSortedLeaderboard
} = require('../services/roomService');

module.exports = function registerRoomHandlers(io, socket) {
  /**
   * Create a new room
   */
  socket.on('room:create', ({ playerName, avatar }) => {
    try {
      const result = createRoom(playerName, socket.id, avatar);
      if (!result.success) {
        socket.emit('server:error', { error: result.error, message: result.message });
        return;
      }

      socket.join(result.room.roomCode);

      socket.emit('room:created', {
        roomCode: result.room.roomCode,
        player: result.player,
        players: result.room.players
      });

      io.to(result.room.roomCode).emit('room:players', {
        roomCode: result.room.roomCode,
        players: result.room.players
      });
    } catch (err) {
      console.error('[SOCKET ERROR] room:create', err);
      socket.emit('server:error', { error: 'INTERNAL_ERROR', message: 'Failed to create room.' });
    }
  });

  /**
   * Join an existing room
   */
  socket.on('room:join', ({ roomCode, playerName, avatar }) => {
    try {
      const result = joinRoom(roomCode, playerName, socket.id, avatar);
      if (!result.success) {
        socket.emit('server:error', { error: result.error, message: result.message });
        return;
      }

      socket.join(result.room.roomCode);

      socket.emit('room:joined', {
        roomCode: result.room.roomCode,
        player: result.player,
        players: result.room.players,
        isReconnect: result.isReconnect || false
      });

      io.to(result.room.roomCode).emit('room:players', {
        roomCode: result.room.roomCode,
        players: result.room.players
      });
    } catch (err) {
      console.error('[SOCKET ERROR] room:join', err);
      socket.emit('server:error', { error: 'INTERNAL_ERROR', message: 'Failed to join room.' });
    }
  });

  /**
   * Toggle player ready state
   */
  socket.on('player:ready', ({ roomCode, isReady }) => {
    try {
      const result = setPlayerReady(roomCode, socket.id, isReady);
      if (!result.success) {
        socket.emit('server:error', { error: result.error, message: result.message });
        return;
      }

      io.to(roomCode).emit('room:players', {
        roomCode,
        players: result.room.players
      });
    } catch (err) {
      console.error('[SOCKET ERROR] player:ready', err);
    }
  });

  /**
   * Disconnect handling
   */
  socket.on('disconnect', () => {
    try {
      const result = handleDisconnect(socket.id);
      if (result && result.room) {
        io.to(result.roomCode).emit('room:players', {
          roomCode: result.roomCode,
          players: result.room.players
        });

        // Also update leaderboard if during match
        const leaderboard = getSortedLeaderboard(result.roomCode);
        io.to(result.roomCode).emit('leaderboard:update', { players: leaderboard });
      }
    } catch (err) {
      console.error('[SOCKET ERROR] disconnect', err);
    }
  });
};
