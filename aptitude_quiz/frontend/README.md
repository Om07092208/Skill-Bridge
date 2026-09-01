# SkillBridge Aptitude Arena — Real-Time Multiplayer Backend & Architecture

This document describes the **Real-Time Multiplayer Architecture**, backend services, Socket.IO communication protocols, and local testing workflows for the **SkillBridge Aptitude Arena**.

---

## 1. Architecture Overview

The Aptitude Arena uses a **Server-Authoritative Real-Time Architecture**:

```text
                SkillBridge AI Prep
                        │
                        ▼
                  Skill Arena
                        │
                        ▼
                 Aptitude Arena
                        │
             ┌──────────┴──────────┐
             │                     │
      Browser Client A      Browser Client B
     (Host: e.g. Rahul)     (Player: e.g. Ananya)
             │                     │
             └──────────┬──────────┘
                        │  WebSocket (Socket.IO)
                        ▼
               Node.js Express Server
              (http://localhost:3000)
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
     Room Service   Game Engine   Scoring Engine
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                  Question Bank
            (backend/data/aptitude_quiz.csv)
```

---

## 2. Directory Structure

```text
stitch_remix_of_skillbridge_ai_prep_dashboard/
├── backend/
│   ├── .env                      # Environment config (PORT, CLIENT_URL)
│   ├── package.json              # Express, Socket.IO, CORS, Dotenv
│   ├── server.js                 # HTTP & WebSocket initialization + REST endpoints
│   ├── data/
│   │   └── aptitude_quiz.csv     # 24+ CSV Aptitude Questions
│   ├── services/
│   │   ├── questionService.js    # CSV loader, validation, public sanitizer
│   │   ├── scoringService.js     # Difficulty timers & speed bonus engine
│   │   └── roomService.js        # In-memory rooms, lobby, players, progression
│   ├── socket/
│   │   ├── roomHandlers.js       # room:create, room:join, player:ready, disconnect
│   │   ├── gameHandlers.js       # game:start, answer:submit, timeouts, playAgain
│   │   └── leaderboardHandlers.js# Real-time standings broadcast
│   └── utils/
│       └── idGenerator.js        # 5-character alphanumeric room codes (7K4P9)
└── aptitude_arena/
    ├── index.html                # Single-page app (Home, Waiting, Live, Results)
    ├── styles.css                # Design tokens & animation styles
    ├── app.js                    # Socket.IO client + fallback engine
    └── README.md
```

---

## 3. Game & Scoring Rules

| Difficulty | Allocated Time | Base Points | Speed Bonus Threshold (<30% time) | Maximum Points |
| :--- | :--- | :--- | :--- | :--- |
| **🟢 Easy** | **30 seconds** | 40 pts | < 9.0s (+20 pts) | **60 pts** |
| **🟡 Medium** | **60 seconds (1 min)** | 40 pts | < 18.0s (+20 pts) | **60 pts** |
| **🔴 Hard** | **90 seconds (1.5 min)**| 40 pts | < 27.0s (+20 pts) | **60 pts** |
| **Timeout / Incorrect** | — | **0 pts** | — | **0 pts** |

### Leaderboard Tie-Breaking Hierarchy
1. **Total Score** (Descending)
2. **Correct Answer Count** (Descending)
3. **Total Elapsed Time** (Ascending — fastest response wins)

---

## 4. Socket.IO Protocol & Event Matrix

### Client-to-Server Events
- `room:create` (`{ playerName, avatar }`): Requests new 5-character alphanumeric room code and creates host.
- `room:join` (`{ roomCode, playerName, avatar }`): Joins existing room lobby.
- `player:ready` (`{ roomCode, isReady }`): Toggles ready status.
- `game:start` (`{ roomCode }`): Host initiates 3-second countdown to live match.
- `answer:submit` (`{ roomCode, questionId, selectedOption }`): Submits selected answer index (0–3).
- `question:timeout` (`{ roomCode, questionId }`): Notifies question timeout.
- `round:playAgain` (`{ roomCode }`): Resets round within the same room.

### Server-to-Client Events
- `room:created` / `room:joined` (`{ roomCode, player, players }`)
- `room:players` (`{ roomCode, players }`)
- `game:starting` (`{ roomCode, countdownSeconds: 3 }`)
- `game:started` (`{ roomCode }`)
- `question:started` (`{ questionNumber, totalQuestions, question, timeLimit, startedAt }`)
  *(Note: Answers and `correctIndex` are **never** transmitted in this payload)*
- `answer:result` (`{ isCorrect, points, isSpeedBonus, correctIndex, timeSpent }`)
- `leaderboard:update` (`{ players: [...] }`)
- `game:finished` (`{ leaderboard, playerResults }`)
- `round:reset` (`{ roomCode, players }`)
- `server:error` (`{ error, message }`)

---

## 5. Starting the Application Locally

### 1. Start the Backend Server (Port 3000)
```powershell
cd backend
npm install
npm run dev
```

### 2. Start the Frontend Server (Port 8085)
```powershell
# From project root
python -m http.server 8085
```

Open in browser:
👉 **`http://localhost:8085/aptitude_arena/index.html`**

---

## 6. Testing Multi-Client Multiplayer

1. **Host Window**: Open `http://localhost:8085/aptitude_arena/index.html` in Chrome. Click **"Create New Room"**. Note the 5-character code (e.g. `HV6NA`).
2. **Player 2 Window**: Open the same URL in an Incognito window or second browser. Enter `HV6NA` in the **"Join with Code"** input and click **"Join"**.
3. **Synchronized Lobby**: Both players appear on the waiting room grid in real time.
4. **Ready Toggle**: Player 2 clicks **"Ready"**. Host sees all players marked ready and clicks **"Start Arena Battle"**.
5. **Simultaneous Match**: Both clients receive the 3-second countdown and Question 1 simultaneously.
6. **Live Standings**: When either player answers, the live leaderboard on both screens updates instantly.
7. **Results & Round 2**: After Question 10, final podium stats render. Clicking **"Play Again"** cleanses score history and prepares a fresh 10-question round in the same room.
