/**
 * Socket Room Handlers
 * Lobby creation, joining, reconnection, ready toggles, and participant broadcasts
 */

const {
  createRoom,
  joinRoom,
  setPlayerReady,
  handleDisconnect,
  leaveRoom,
  getSortedLeaderboard
} = require('../services/roomService');

const {
  getMatchHistory,
  getGlobalLeaderboard
} = require('../services/historyService');

module.exports = function registerRoomHandlers(io, socket) {
  /**
   * Create a new room
   */
  socket.on('room:create', ({ playerName, avatar, playerId }) => {
    try {
      const result = createRoom(playerName, socket.id, avatar, playerId);
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
   * Join or reconnect to an existing room
   */
  socket.on('room:join', ({ roomCode, playerName, avatar, playerId }) => {
    try {
      const result = joinRoom(roomCode, playerName, socket.id, avatar, playerId);
      if (!result.success) {
        socket.emit('server:error', { error: result.error, message: result.message });
        return;
      }

      socket.join(result.room.roomCode);

      socket.emit('room:joined', {
        roomCode: result.room.roomCode,
        player: result.player,
        players: result.room.players,
        isReconnect: result.isReconnect || false,
        gameState: result.gameState || null
      });

      io.to(result.room.roomCode).emit('room:players', {
        roomCode: result.room.roomCode,
        players: result.room.players
      });

      // If reconnecting during active game, sync standings immediately
      if (result.isReconnect && result.gameState) {
        const leaderboard = getSortedLeaderboard(result.room.roomCode);
        socket.emit('leaderboard:update', { players: leaderboard });
      }
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
   * Explicit leave room action by player
   */
  socket.on('room:leave', () => {
    try {
      const result = leaveRoom(socket.id);
      if (!result || !result.success) return;

      if (result.action === 'room_closed') {
        io.to(result.roomCode).emit('room:closed', {
          roomCode: result.roomCode,
          message: result.player?.isHost
            ? 'The host has left and closed the room.'
            : 'The room has been closed.'
        });
      } else if (result.action === 'player_left') {
        io.to(result.roomCode).emit('room:player_left', {
          roomCode: result.roomCode,
          playerName: result.player?.name,
          players: result.room.players
        });
        io.to(result.roomCode).emit('room:players', {
          roomCode: result.roomCode,
          players: result.room.players
        });
      }
    } catch (err) {
      console.error('[SOCKET ERROR] room:leave', err);
    }
  });

  /**
   * Query match history
   */
  socket.on('history:get', () => {
    try {
      const matches = getMatchHistory(10);
      const global = getGlobalLeaderboard(10);
      socket.emit('history:data', { matches, global });
    } catch (err) {
      console.error('[SOCKET ERROR] history:get', err);
    }
  });

  /**
   * Disconnect handling
   */
  socket.on('disconnect', () => {
    try {
      const result = handleDisconnect(socket.id);
      if (result) {
        if (result.action === 'removed' && result.player?.isHost && (!result.room || result.room.players.length === 0)) {
          io.to(result.roomCode).emit('room:closed', {
            roomCode: result.roomCode,
            message: 'The host has disconnected and the room is closed.'
          });
        } else if (result.room) {
          io.to(result.roomCode).emit('room:player_left', {
            roomCode: result.roomCode,
            playerName: result.player?.name,
            players: result.room.players
          });
          io.to(result.roomCode).emit('room:players', {
            roomCode: result.roomCode,
            players: result.room.players
          });

          // Also update leaderboard if during match
          const leaderboard = getSortedLeaderboard(result.roomCode);
          io.to(result.roomCode).emit('leaderboard:update', { players: leaderboard });
        }
      }
    } catch (err) {
      console.error('[SOCKET ERROR] disconnect', err);
    }
  });
};
