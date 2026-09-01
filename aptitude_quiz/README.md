# 🏆 Aptitude Quiz (Aptitude Arena)

A real-time, multiplayer competitive aptitude testing platform featuring dynamic timers, live matchmaking, server-authoritative scoring, and synchronized leaderboards.

---

## 📁 Architecture Overview

```
aptitude_quiz/
├── backend/                  # Node.js Express + Socket.IO server
│   ├── data/                 # Question bank CSV & persistent match history
│   │   ├── aptitude_quiz.csv # 60+ verified quantitative, logical & verbal questions
│   │   └── match_history.json# Recorded match telemetry & lifetime stats
│   ├── services/             # Core game logic
│   │   ├── questionService.js# CSV question loader & dynamic difficulty selector
│   │   ├── roomService.js    # Multiplayer room lifecycle state machine
│   │   ├── scoringService.js # Difficulty timing (30s/60s/90s) & speed bonuses
│   │   └── historyService.js # Persistence & leaderboard ranking
│   ├── socket/               # Real-time WebSocket event handlers
│   │   ├── roomHandlers.js   # Room create, join, leave, ready & close
│   │   ├── gameHandlers.js   # Question dispatch, answer locking & synchronization
│   │   └── leaderboardHandlers.js # Live standings updates
│   ├── server.js             # Unified single-port server (Port 3000)
│   └── package.json          # Dependencies (express, socket.io, cors, dotenv)
│
└── frontend/                 # Modern Vanilla JS Single-Page Application
    ├── index.html            # Core SPA interface
    ├── app.js                # State management, Socket.IO client, sound effects & timer engine
    ├── styles.css            # Responsive layout & animation stylesheets
    ├── components/           # Modular HTML views
    │   ├── arena-home.html   # Create/Join Room matchmaking hub
    │   ├── waiting-room.html # Live multiplayer lobby with host controls
    │   ├── live-competition.html # Live question canvas with synchronized timers
    │   └── results.html      # Final leaderboard & performance telemetry
    └── README.md             # Frontend documentation
```

---

## ⚡ Quick Start

### 1. Install & Start Backend (Port 3000)
```bash
cd aptitude_quiz/backend
npm install
node server.js
```

### 2. Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```
*(The backend serves the frontend SPA directly on root `/`, eliminating CORS issues and cross-port overhead).*

---

## 🎮 Key Features

- **Multiplayer Room System**: Create private rooms with a 5-letter room code (e.g., `7K4P9`) or join existing lobbies.
- **Host Controls**: Only the Room Host can launch the match once all contenders mark themselves as **Ready**.
- **Real-Time Synchronization**: Instant updates on player joins, player exits, and room closure when the host leaves.
- **Strict Difficulty-Based Timers**:
  - 🟢 **Easy**: 30 seconds
  - 🟡 **Medium**: 60 seconds
  - 🔴 **Hard**: 90 seconds
- **Server-Authoritative Anti-Cheat**: Answers and correct options remain strictly on the backend until scored.
- **Live Leaderboard**: Dynamic score computations with speed bonus recognition and post-match telemetry.
