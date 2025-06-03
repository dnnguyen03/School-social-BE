const { Server } = require("socket.io");
const Message = require("../models/MessageModel");
const Conversation = require("../models/ConversationModel");

let onlineUsers = new Map(); // userId => socketId
let io;

const setupSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    socket.on("userOnline", (userId) => {
      onlineUsers.set(userId.toString(), socket.id); // luôn string
      socket.userId = userId;
      io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
    });

    socket.on("joinConversation", (conversationId) => {
      socket.join(conversationId);
    });

    socket.on(
      "sendMessage",
      async ({ conversationId, text, media = [], sender, clientTempId }) => {
        try {
          const userId = socket.userId || sender;

          const message = new Message({
            conversationId,
            sender: userId,
            text,
            media,
          });
          await message.save();

          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: { text, sender: userId, createdAt: new Date() },
          });

          const populated = await Message.findById(message._id).populate(
            "sender",
            "username avatarUrl"
          );

          io.to(conversationId).emit("receiveMessage", {
            ...populated.toObject(),
            clientTempId,
            senderInfo: {
              _id: populated.sender._id,
              username: populated.sender.username,
              avatarUrl: populated.sender.avatarUrl || "",
            },
          });
        } catch (err) {
          console.error("Socket sendMessage error:", err);
        }
      }
    );

    socket.on("disconnect", () => {
      const entry = Array.from(onlineUsers.entries()).find(
        ([, id]) => id === socket.id
      );
      if (entry) onlineUsers.delete(entry[0]);
      io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
    });
  });
};

const getIo = () => {
  if (!io) throw new Error("Socket.io chưa được khởi tạo!");
  return io;
};

const getSocketId = (userId) => {
  return onlineUsers.get(userId.toString()); // always string
};

module.exports = {
  setupSocket,
  getIo,
  getSocketId,
};
