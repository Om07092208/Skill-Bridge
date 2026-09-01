import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {};

const gdTopics = [
  "Is Artificial Intelligence a threat to jobs?",
  "Work from home vs Work from office",
  "Is social media a boon or a bane?",
  "Should coding be compulsory for all students?",
  "Should students be allowed to use AI for studies?",
  "Does money bring happiness?",
  "Is teamwork more important than individual talent?",
  "Can technology replace teachers?",
  "Is online education better than classroom education?",
  "Is social media good for students?",
];


// ==========================================
// SEND GD STATE
// ==========================================

function sendGDState(roomId) {
  const room = rooms[roomId];

  if (!room) return;

  io.to(roomId).emit("gd-state", {
    status: room.status,
    topic: room.topic,
    currentTurn: room.currentTurn,
    speaking: room.speaking,
    timeLeft: room.timeLeft,
    playerCount: room.players.size,
  });
}


// ==========================================
// SEND PLAYER ASSIGNMENTS
// ==========================================

function sendPlayerAssignments(roomId) {
  const room = rooms[roomId];

  if (!room) return;

  room.players.forEach((playerNumber, socketId) => {
    io.to(socketId).emit("player-assigned", {
      playerNumber,
    });
  });
}


// ==========================================
// NEXT PLAYER
// ==========================================

function moveToNextPlayer(roomId) {
  const room = rooms[roomId];

  if (!room) return;

  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }

  room.speaking = false;
  room.timeLeft = 60;

  room.currentTurn += 1;

  if (room.currentTurn >= 4) {
    room.status = "completed";

    sendGDState(roomId);

    return;
  }

  room.status = "ready";

  console.log(
    `Room ${roomId}: User ${room.currentTurn + 1}'s turn`
  );

  sendGDState(roomId);
}


// ==========================================
// TIMER
// ==========================================

function startTimer(roomId) {
  const room = rooms[roomId];

  if (!room) return;

  if (room.speaking) return;

  room.speaking = true;
  room.status = "speaking";
  room.timeLeft = 60;

  sendGDState(roomId);

  room.timer = setInterval(() => {

    if (!rooms[roomId]) {
      clearInterval(room.timer);
      return;
    }

    room.timeLeft -= 1;

    sendGDState(roomId);

    if (room.timeLeft <= 0) {

      clearInterval(room.timer);

      room.timer = null;

      moveToNextPlayer(roomId);
    }

  }, 1000);
}


// ==========================================
// CONNECTION
// ==========================================

io.on("connection", (socket) => {

  console.log(
    "User connected:",
    socket.id
  );


  // ========================================
  // CREATE ROOM
  // ========================================

  socket.on("create-room", (roomId) => {

    if (!rooms[roomId]) {

      rooms[roomId] = {
        players: new Map(),
        topic: null,
        status: "waiting",
        currentTurn: 0,
        speaking: false,
        timeLeft: 60,
        timer: null,
      };

    }


    const room = rooms[roomId];


    if (room.players.size >= 4) {

      socket.emit("room-full");

      return;
    }


    if (!room.players.has(socket.id)) {

      const playerNumber =
        room.players.size + 1;


      room.players.set(
        socket.id,
        playerNumber
      );


      socket.join(roomId);


      socket.data.roomId =
        roomId;


      socket.data.playerNumber =
        playerNumber;


      console.log(
        `User ${playerNumber} joined room ${roomId}`
      );

    }


    io.to(roomId).emit(
      "player-count",
      room.players.size
    );


    sendPlayerAssignments(
      roomId
    );

  });


  // ========================================
  // JOIN ROOM
  // ========================================

  socket.on("join-room", (roomId) => {

    const room =
      rooms[roomId];


    if (!room) {

      socket.emit(
        "room-not-found"
      );

      return;
    }


    if (room.players.size >= 4) {

      socket.emit(
        "room-full"
      );

      return;
    }


    if (!room.players.has(socket.id)) {

      const playerNumber =
        room.players.size + 1;


      room.players.set(
        socket.id,
        playerNumber
      );


      socket.join(roomId);


      socket.data.roomId =
        roomId;


      socket.data.playerNumber =
        playerNumber;


      console.log(
        `User ${playerNumber} joined room ${roomId}`
      );

    }


    io.to(roomId).emit(
      "player-count",
      room.players.size
    );


    sendPlayerAssignments(
      roomId
    );


    // ======================================
    // FOUR PLAYERS
    // ======================================

    if (
      room.players.size === 4 &&
      room.status === "waiting"
    ) {

      const randomIndex =
        Math.floor(
          Math.random() *
          gdTopics.length
        );


      room.topic =
        gdTopics[randomIndex];


      room.status =
        "ready";


      room.currentTurn =
        0;


      room.speaking =
        false;


      room.timeLeft =
        60;


      console.log(
        `GD started in room ${roomId}`
      );


      console.log(
        `Topic: ${room.topic}`
      );


      console.log(
        "Current turn: User 1"
      );


      sendGDState(
        roomId
      );

    }

  });


  // ========================================
  // REQUEST OTHER PLAYERS
  // ========================================

  socket.on(
    "request-room-peers",
    (roomId) => {

      const room =
        rooms[roomId];


      if (!room) return;


      room.players.forEach(
        (playerNumber, socketId) => {

          if (
            socketId !==
            socket.id
          ) {

            socket.emit(
              "existing-peer",
              {
                socketId,
              }
            );

          }

        }
      );

    }
  );


  // ========================================
  // WEBRTC SIGNAL
  // ========================================

  socket.on(
    "webrtc-signal",
    ({
      targetSocketId,
      signal,
    }) => {

      if (
        !targetSocketId ||
        !signal
      ) {

        return;
      }


      io.to(
        targetSocketId
      ).emit(
        "webrtc-signal",
        {
          senderSocketId:
            socket.id,

          signal,
        }
      );

    }
  );


  // ========================================
  // START SPEAKING
  // ========================================

  socket.on(
    "start-speaking",
    (roomId) => {

      const room =
        rooms[roomId];


      if (!room) return;


      const playerNumber =
        room.players.get(
          socket.id
        );


      if (!playerNumber) {

        console.log(
          "Player not found:",
          socket.id
        );

        return;
      }


      const playerIndex =
        playerNumber - 1;


      console.log(
        `User ${playerNumber} requested speaking. Current turn: User ${room.currentTurn + 1}`
      );


      if (
        playerIndex !==
        room.currentTurn
      ) {

        return;
      }


      if (
        room.status !==
        "ready"
      ) {

        return;
      }


      startTimer(
        roomId
      );

    }
  );


  // ========================================
  // FINISH SPEAKING
  // ========================================

  socket.on(
    "finish-speaking",
    (roomId) => {

      const room =
        rooms[roomId];


      if (!room) return;


      const playerNumber =
        room.players.get(
          socket.id
        );


      if (!playerNumber) return;


      const playerIndex =
        playerNumber - 1;


      if (
        playerIndex !==
        room.currentTurn
      ) {

        return;
      }


      if (
        !room.speaking
      ) {

        return;
      }


      console.log(
        `User ${playerNumber} finished speaking`
      );


      moveToNextPlayer(
        roomId
      );

    }
  );


  // ========================================
  // DISCONNECT
  // ========================================

  socket.on(
    "disconnect",
    () => {

      console.log(
        "User disconnected:",
        socket.id
      );


      const roomId =
        socket.data.roomId;


      if (
        !roomId ||
        !rooms[roomId]
      ) {

        return;
      }


      const room =
        rooms[roomId];


      room.players.delete(
        socket.id
      );


      if (room.timer) {

        clearInterval(
          room.timer
        );

        room.timer = null;
      }


      io.to(roomId).emit(
        "player-count",
        room.players.size
      );


      io.to(roomId).emit(
        "player-left",
        {
          socketId:
            socket.id,
        }
      );


      if (
        room.players.size === 0
      ) {

        delete rooms[
          roomId
        ];

      }

    }
  );

});


// ==========================================
// SERVER
// ==========================================

server.listen(
  3001,
  "0.0.0.0",
  () => {

    console.log(
      "GD server running on port 3001"
    );

  }
);