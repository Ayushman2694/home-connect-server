import { Server } from "socket.io";
import { verifyToken } from "../utils/generateToken.js";

let io = null;

function roomForUser(userId) {
  return `user:${String(userId)}`;
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        (socket.handshake.headers.authorization || "").replace("Bearer ", "");
      if (!token) return next(new Error("Authentication token required"));
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(roomForUser(socket.userId));
    socket.on("disconnect", () => {});
  });

  console.log("🔌 Socket.IO initialized");
  return io;
}

export function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(roomForUser(userId)).emit(event, payload);
}
