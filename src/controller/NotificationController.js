const Notification = require("../models/NotificationModel");

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
  } catch (error) {
    console.error("Lỗi khi tạo thông báo:", error);
  }
};
const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await Notification.find({ user: userId })
      .populate("sender", "username profilePic")
      .populate("post", "content")
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createNotification, getNotifications };
