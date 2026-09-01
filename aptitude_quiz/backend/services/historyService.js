/**
 * History & Score Persistence Service
 * Stores match results, player lifetime statistics, and global high scores
 */

const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../data/match_history.json');

// In-memory cache synced to disk
let historyStore = {
  matches: [],
  playerStats: {}
};

/**
 * Load history from disk
 */
function initHistoryStore() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
      historyStore = JSON.parse(raw);
      console.log(`[HISTORY] Loaded ${historyStore.matches.length} past matches from ${path.basename(HISTORY_FILE)}`);
    } else {
      // Seed with initial realistic match records
      historyStore = {
        matches: [
          {
            roundId: 'rnd_seed1',
            roomCode: '7K4P9',
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
            totalQuestions: 10,
            winner: { name: 'Rahul (YOU)', score: 480 },
            leaderboard: [
              { rank: 1, playerName: 'Rahul (YOU)', score: 480, accuracy: 90, totalTime: 42 },
              { rank: 2, playerName: 'Ananya Deshmukh', score: 420, accuracy: 80, totalTime: 48 },
              { rank: 3, playerName: 'Arjun Nair', score: 360, accuracy: 70, totalTime: 55 },
              { rank: 4, playerName: 'Priya Patel', score: 300, accuracy: 60, totalTime: 62 }
            ]
          }
        ],
        playerStats: {
          'Rahul (YOU)': { matchesPlayed: 24, wins: 18, totalScore: 9680, highestScore: 560, avgAccuracy: 88 }
        }
      };
      saveToDisk();
    }
  } catch (err) {
    console.error('[HISTORY ERROR] Failed to load history:', err.message);
  }
}

/**
 * Save store to disk synchronously
 */
function saveToDisk() {
  try {
    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyStore, null, 2), 'utf8');
  } catch (err) {
    console.error('[HISTORY ERROR] Failed to save history to disk:', err.message);
  }
}

/**
 * Save completed match results
 */
function recordMatch(matchData) {
  if (!matchData) return;

  const winner = matchData.leaderboard?.[0] || { playerName: 'Unknown', score: 0 };

  const record = {
    roundId: matchData.roundId,
    roomCode: matchData.roomCode,
    timestamp: new Date().toISOString(),
    totalQuestions: matchData.playerResults?.[0]?.totalQuestions || 10,
    winner: {
      name: winner.playerName,
      score: winner.score
    },
    leaderboard: matchData.leaderboard || [],
    playerResults: matchData.playerResults || []
  };

  historyStore.matches.unshift(record);
  // Keep last 100 matches
  if (historyStore.matches.length > 100) {
    historyStore.matches = historyStore.matches.slice(0, 100);
  }

  // Update lifetime player statistics
  if (matchData.playerResults) {
    matchData.playerResults.forEach(p => {
      const name = p.name || p.playerName;
      if (!name) return;

      const current = historyStore.playerStats[name] || {
        matchesPlayed: 0,
        wins: 0,
        totalScore: 0,
        highestScore: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        avgAccuracy: 0
      };

      current.matchesPlayed += 1;
      if (p.rank === 1) current.wins += 1;
      current.totalScore += (p.score || 0);
      current.highestScore = Math.max(current.highestScore, p.score || 0);
      current.totalCorrect = (current.totalCorrect || 0) + (p.correctCount || 0);
      current.totalQuestions = (current.totalQuestions || 0) + (p.totalQuestions || 10);
      current.avgAccuracy = Math.round((current.totalCorrect / current.totalQuestions) * 100);

      historyStore.playerStats[name] = current;
    });
  }

  saveToDisk();
  console.log(`[HISTORY] Recorded match ${matchData.roundId} in ${matchData.roomCode}. Winner: ${winner.playerName}`);
}

function getMatchHistory(limit = 10) {
  return historyStore.matches.slice(0, limit);
}

function getPlayerStats(playerName) {
  return historyStore.playerStats[playerName] || null;
}

function getGlobalLeaderboard(limit = 10) {
  const list = Object.entries(historyStore.playerStats).map(([name, stats]) => ({
    name,
    ...stats
  }));

  list.sort((a, b) => b.totalScore - a.totalScore);
  return list.slice(0, limit);
}

initHistoryStore();

module.exports = {
  recordMatch,
  getMatchHistory,
  getPlayerStats,
  getGlobalLeaderboard
};
