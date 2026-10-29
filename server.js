
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

const rooms = new Map();

function createCode() {
  let code;
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function updateRoom(code) {
  const room = rooms.get(code);
  if (!room) return;

  io.to(code).emit("roomUpdate", {
    code,
    players: [...room.players.values()].map(player => ({
      name: player.name
    }))
  });
}

io.on("connection", socket => {
  socket.on("createRoom", (data, callback) => {
    const name = String(data?.name || "").trim().slice(0, 20);
    if (!name) return callback?.({ ok: false, error: "Ismingni yoz." });

    const code = createCode();
    const room = {
      host: socket.id,
      players: new Map(),
      started: false,
      subject: "english"
    };

    room.players.set(socket.id, { name });
    rooms.set(code, room);
    socket.join(code);
    socket.data.room = code;

    callback?.({ ok: true, code });
    updateRoom(code);
  });

  socket.on("joinRoom", (data, callback) => {
    const code = String(data?.code || "").trim().toUpperCase();
    const name = String(data?.name || "").trim().slice(0, 20);
    const room = rooms.get(code);

    if (!name) return callback?.({ ok: false, error: "Ismingni yoz." });
    if (!room) return callback?.({ ok: false, error: "Xona topilmadi." });
    if (room.started) {
      return callback?.({ ok: false, error: "Bu test allaqachon boshlangan." });
    }

    room.players.set(socket.id, { name });
    socket.join(code);
    socket.data.room = code;

    callback?.({ ok: true, code });
    updateRoom(code);
  });

  socket.on("startQuiz", (data, callback) => {
    const code = String(data?.code || "").toUpperCase();
    const room = rooms.get(code);

    if (!room) return callback?.({ ok: false, error: "Xona topilmadi." });
    if (room.host !== socket.id) {
      return callback?.({ ok: false, error: "Testni xona egasi boshlaydi." });
    }

    const allowed = ["english", "russian", "math"];
    const subject = allowed.includes(data?.subject) ? data.subject : "english";

    room.subject = subject;
    room.started = true;

    // Xona egasidan boshqa o‘yinchilarga test boshlanishini yuborish
    socket.to(code).emit("quizStarted", { subject });
    callback?.({ ok: true });
  });

  socket.on("answer", data => {
    const code = String(data?.code || "").toUpperCase();
    const room = rooms.get(code);
    if (!room || !room.players.has(socket.id)) return;

    socket.to(code).emit("playerAnswered", {
      name: room.players.get(socket.id).name
    });
  });

  socket.on("disconnect", () => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room) return;

    room.players.delete(socket.id);

    if (room.players.size === 0) {
      rooms.delete(code);
      return;
    }

    if (room.host === socket.id) {
      room.host = room.players.keys().next().value;
    }

    updateRoom(code);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`QUIZORA ishga tushdi: http://localhost:${PORT}`);
});
