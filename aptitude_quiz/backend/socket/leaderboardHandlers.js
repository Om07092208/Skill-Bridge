/**
 * Socket Leaderboard Handlers
 * Real-time standings polling and on-demand updates
 */

const { getSortedLeaderboard } = require('../services/roomService');

module.exports = function registerLeaderboardHandlers(io, socket) {
  /**
   * On-demand leaderboard query
   */
  socket.on('leaderboard:get', ({ roomCode }) => {
    try {
      const players = getSortedLeaderboard(roomCode);
      socket.emit('leaderboard:update', { players });
    } catch (err) {
      console.error('[SOCKET ERROR] leaderboard:get', err);
    }
  });
};
