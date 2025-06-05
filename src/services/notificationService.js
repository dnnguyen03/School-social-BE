const Notification = require("../models/NotificationModel");
const { io } = require("../services/socketService");

const createNotification = async (userId, senderId, type, postId, message) => {
  try {
    const newNotification = new Notification({
      user: userId,
      sender: senderId,
      type,
      post: postId,
      message,
    });

    await newNotification.save();

    const socketId = global.onlineUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit("newNotification", {
        senderId,
        type,
        postId,
        message,
      });
    }
  } catch (error) {
    console.error("Lỗi khi tạo thông báo:", error);
  }
};

module.exports = { createNotification };
