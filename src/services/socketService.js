const { Server } = require("socket.io");

let onlineUsers = new Map();
let io;

const setupSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  global.onlineUsers = onlineUsers;

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("userOnline", (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log("Online Users:", onlineUsers);
      io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
    });

    socket.on("disconnect", () => {
      let userId = [...onlineUsers.entries()].find(
        ([_, id]) => id === socket.id
      );
      if (userId) {
        onlineUsers.delete(userId[0]);
      }
      console.log("User disconnected:", socket.id);
      io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
    });
  });

  global.io = io;
};

const getIo = () => {
  if (!io) {
    throw new Error("Socket.io chưa được khởi tạo!");
  }
  return io;
};

module.exports = { setupSocket, getIo };
