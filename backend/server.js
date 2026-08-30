/**
 * SkillBridge Aptitude Arena - Real-Time Backend Server
 * Express + Socket.IO server
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { loadQuestionBank, getQuestionCount } = require('./services/questionService');
const { getMatchHistory, getGlobalLeaderboard, getPlayerStats } = require('./services/historyService');
const registerRoomHandlers = require('./socket/roomHandlers');
const registerGameHandlers = require('./socket/gameHandlers');
const registerLeaderboardHandlers = require('./socket/leaderboardHandlers');

const path = require('path');

const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8085';

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

app.use(express.json());

// Serve static frontend files directly from backend server
app.use(express.static(path.join(__dirname, '..')));

// Default root redirect to aptitude_arena
app.get('/', (req, res) => {
  res.redirect('/aptitude_arena/index.html');
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 20000,
  pingInterval: 10000
});

// REST Health & Info Endpoints (Never expose question answers)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SkillBridge Aptitude Arena Real-Time Backend',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/questions/count', (req, res) => {
  res.json({
    count: getQuestionCount(),
    categories: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'],
    difficultyLevels: {
      'Easy': '30s',
      'Medium': '60s',
      'Hard': '90s'
    }
  });
});

// Persistent Match History & Leaderboard Database REST Endpoints
app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  res.json({
    success: true,
    matches: getMatchHistory(limit)
  });
});

app.get('/api/leaderboard/global', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  res.json({
    success: true,
    leaderboard: getGlobalLeaderboard(limit)
  });
});

app.get('/api/player/:name/stats', (req, res) => {
  const stats = getPlayerStats(req.params.name);
  if (!stats) {
    return res.status(404).json({ success: false, message: 'Player not found.' });
  }
  res.json({ success: true, stats });
});

// Register Socket.IO connection pipeline
io.on('connection', (socket) => {
  console.log(`[SOCKET CONNECT] Client connected: ${socket.id}`);

  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerLeaderboardHandlers(io, socket);
});

// Boot server
function startServer() {
  try {
    // 1. Load CSV question bank (60 questions)
    loadQuestionBank();

    // 2. Start HTTP & Socket.IO Listener
    server.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Aptitude Arena Backend running on port ${PORT}`);
      console.log(`📡 WebSocket ready for Socket.IO clients`);
      console.log(`📊 Question Bank loaded: ${getQuestionCount()} questions`);
      console.log(`🌐 Allowed Client Origins: ${CLIENT_URL}`);
      console.log(`🩺 Health check at http://localhost:${PORT}/api/health`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, io };
