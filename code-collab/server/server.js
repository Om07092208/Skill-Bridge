const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const RUNNERS = {
  python: {
    cmd: "python",
    ext: "py",
  },

  javascript: {
    cmd: "node",
    ext: "js",
  },

  cpp: {
    cmd: "g++",
    ext: "cpp",
  },
};

// ================================
// REAL-TIME ROOM CONNECTION
// ================================

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    const room = io.sockets.adapter.rooms.get(roomId);
    const userNumber = room ? room.size : 1;

    socket.emit("user-number", userNumber);

    console.log(
      `User ${socket.id} joined room ${roomId} as User ${userNumber}`
    );

    socket.to(roomId).emit("user-joined", {
      userNumber,
    });
  });

  socket.on("send-message", ({ roomId, text, userNumber }) => {
    socket.to(roomId).emit("receive-message", {
      text,
      userNumber,
    });
  });

  // ================================
  // REAL-TIME CODE SYNCHRONIZATION
  // ================================

  socket.on("code-change", ({ roomId, code }) => {
    socket.to(roomId).emit("code-update", {
      code,
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ================================
// CODE RUNNER
// ================================

app.post("/run", (req, res) => {
  const { language, code } = req.body;
  const runner = RUNNERS[language];

  if (!runner) {
    return res.json({
      ok: false,
      output: `"${language}" isn't wired up to the local runner yet.`,
    });
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coderoom-"));
  const filePath = path.join(dir, `code.${runner.ext}`);

  fs.writeFileSync(filePath, code);

  // C++ needs to be compiled before it can be executed.
  if (language === "cpp") {
    const exeName = process.platform === "win32" ? "code.exe" : "code";
    const exePath = path.join(dir, exeName);

    const compiler = spawn("g++", [
      filePath,
      "-o",
      exePath,
    ]);

    let compileOutput = "";
    let compileError = "";

    const compileTimer = setTimeout(() => {
      compiler.kill();
      compileError +=
        "\n[compilation stopped: took longer than 5 seconds]";
    }, 5000);

    compiler.stdout.on("data", (data) => {
      compileOutput += data.toString();
    });

    compiler.stderr.on("data", (data) => {
      compileError += data.toString();
    });

    compiler.on("error", () => {
      clearTimeout(compileTimer);

      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (e) {}

      return res.json({
        ok: false,
        output:
          "Couldn't start g++. Make sure MinGW/g++ is installed and added to PATH.",
      });
    });

    compiler.on("close", (exitCode) => {
      clearTimeout(compileTimer);

      // Compilation failed.
      if (exitCode !== 0) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch (e) {}

        return res.json({
          ok: false,
          output: compileError || "C++ compilation failed.",
        });
      }

      // Compilation succeeded. Now run the executable.
      const program = spawn(exePath, []);

      let stdout = "";
      let stderr = "";

      const runTimer = setTimeout(() => {
        program.kill();
        stderr += "\n[stopped: took longer than 5 seconds]";
      }, 5000);

      program.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      program.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      program.on("error", () => {
        clearTimeout(runTimer);

        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch (e) {}

        return res.json({
          ok: false,
          output: "Couldn't start the compiled C++ program.",
        });
      });

      program.on("close", (exitCode) => {
        clearTimeout(runTimer);

        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch (e) {}

        const output =
          [stderr, stdout].filter(Boolean).join("\n") || "[no output]";

        return res.json({
          ok: exitCode === 0 && !stderr,
          output,
        });
      });
    });

    return;
  }

  // Python and JavaScript
  const child = spawn(runner.cmd, [filePath]);

  let stdout = "";
  let stderr = "";

  const timer = setTimeout(() => {
    child.kill();
    stderr += "\n[stopped: took longer than 5 seconds]";
  }, 5000);

  child.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  child.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  child.on("error", () => {
    clearTimeout(timer);

    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {}

    return res.json({
      ok: false,
      output: `Couldn't start "${runner.cmd}". Is it installed and available in your terminal?`,
    });
  });

  child.on("close", (exitCode) => {
    clearTimeout(timer);

    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {}

    res.json({
      ok: exitCode === 0 && !stderr,
      output:
        [stderr, stdout].filter(Boolean).join("\n") || "[no output]",
    });
  });
});

// IMPORTANT: Socket.IO uses this server.
server.listen(3001, () => {
  console.log(
    "Code runner + real-time server listening on http://localhost:3001"
  );
});