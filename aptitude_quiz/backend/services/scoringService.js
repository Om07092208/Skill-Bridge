/**
 * Scoring Service
 * Server-authoritative score calculation and difficulty time limits
 */

/**
 * Get time limit in seconds for a given difficulty
 * @param {string} difficulty - 'Easy', 'Medium', or 'Hard'
 * @returns {number} Time in seconds
 */
function getTimeLimit(difficulty) {
  switch ((difficulty || '').toLowerCase()) {
    case 'hard':
      return 90; // 1.5 minutes
    case 'medium':
      return 60; // 1.0 minute
    case 'easy':
    default:
      return 30; // 30 seconds
  }
}

/**
 * Calculate points for an answer
 * @param {boolean} isCorrect - Whether the submitted answer matches correct index
 * @param {number} timeSpentSec - Elapsed time in seconds
 * @param {number} timeLimitSec - Total allowed time in seconds
 * @returns {{ points: number, isSpeedBonus: boolean }}
 */
function calculateScore(isCorrect, timeSpentSec, timeLimitSec) {
  if (!isCorrect) {
    return { points: 0, isSpeedBonus: false };
  }

  const basePoints = 40;
  // Speed bonus if answered in less than 30% of allocated time
  const speedThreshold = timeLimitSec * 0.30;
  const isSpeedBonus = timeSpentSec < speedThreshold;
  const points = isSpeedBonus ? basePoints + 20 : basePoints;

  return { points, isSpeedBonus };
}

module.exports = {
  getTimeLimit,
  calculateScore
};
