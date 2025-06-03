const Notification = require("../models/NotificationModel");
const User = require("../models/UserModel");
const Post = require("../models/PostModel");
const { getIo, getSocketId } = require("../services/socketService");

const createNotification = async (userId, senderId, type, postId, message) => {
  try {
    if (userId.toString() === senderId.toString()) return;
    if (type === "message") return;

    if (type === "like" && postId) {
      const post = await Post.findById(postId);
      if (!post || !post.likes.includes(senderId)) return;
    }

    if (!message || message === "") {
      switch (type) {
        case "warning":
          message =
            "Bài viết của bạn đã bị ẩn do vi phạm. Bạn có thể xem lại hoặc gửi kháng cáo trong 7 ngày.";
          break;
        case "like":
          message = "đã thích bài viết của bạn";
          break;
        case "comment":
          message = "đã bình luận về bài viết của bạn";
          break;
        case "follow":
          message = "đã theo dõi bạn";
          break;
        default:
          message = "";
      }
    }

    const senderUser = await User.findById(senderId).select("username");
    const senderName = senderUser ? senderUser.username : "";

    let updatedNotification;

    if (type !== "follow") {
      const existing = await Notification.findOne({
        user: userId,
        type,
        post: postId,
      });

      if (existing) {
        if (type === "warning") {
          existing.message = message;
          existing.updatedAt = new Date();
          existing.isRead = false;
          await existing.save();
          updatedNotification = existing;
        } else if (!existing.sender.includes(senderId)) {
          existing.sender = [senderId, ...existing.sender];
          existing.updatedAt = new Date();
          existing.message = message;
          existing.isRead = false;
          await existing.save();
          updatedNotification = existing;
        } else {
          existing.updatedAt = new Date();
          existing.isRead = false;
          await existing.save();
          updatedNotification = existing;
        }
      } else {
        updatedNotification = await new Notification({
          user: userId,
          sender: [senderId],
          senderName: senderName,
          type,
          post: postId,
          message,
          isRead: false,
        }).save();
      }
    } else {
      updatedNotification = await new Notification({
        user: userId,
        sender: [senderId],
        senderName: senderName,
        type,
        post: postId,
        message,
        isRead: false,
      }).save();
    }

    const io = getIo();
    const socketId = getSocketId(userId.toString());
    if (socketId) {
      const populatedNotification = await Notification.findById(
        updatedNotification._id
      )
        .populate("sender", "username avatarUrl")
        .populate("post", "content");

      const senders = populatedNotification.sender.map((s) => s.username);
      let realtimeMessage = populatedNotification.message;

      if (["like", "comment", "follow"].includes(populatedNotification.type)) {
        if (senders.length === 1) {
          realtimeMessage = `${senders[0]} ${
            populatedNotification.type === "like"
              ? "đã thích"
              : populatedNotification.type === "comment"
              ? "đã bình luận về"
              : "đã theo dõi bạn"
          } ${
            populatedNotification.type === "follow" ? "" : "bài viết của bạn"
          }`;
        } else if (senders.length === 2) {
          realtimeMessage = `${senders[0]}, ${senders[1]} ${
            populatedNotification.type === "like"
              ? "đã thích"
              : populatedNotification.type === "comment"
              ? "đã bình luận về"
              : "đã theo dõi bạn"
          } ${
            populatedNotification.type === "follow" ? "" : "bài viết của bạn"
          }`;
        } else {
          realtimeMessage = `${senders[0]}, ${senders[1]} và ${
            senders.length - 2
          } người khác ${
            populatedNotification.type === "like"
              ? "đã thích"
              : populatedNotification.type === "comment"
              ? "đã bình luận về"
              : "đã theo dõi bạn"
          } ${
            populatedNotification.type === "follow" ? "" : "bài viết của bạn"
          }`;
        }
      }

      populatedNotification.message = realtimeMessage;

      const plainNotification = populatedNotification.toObject();
      plainNotification.isRead = plainNotification.isRead ?? false;

      io.to(socketId).emit("newNotification", plainNotification);
    }
  } catch (error) {
    console.error("Lỗi khi tạo thông báo:", error);
  }
};
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const { lastSeenAt } = req.query;

    const query = { user: userId };
    if (lastSeenAt) {
      query.updatedAt = { $lt: new Date(lastSeenAt) };
    }

    const notifications = await Notification.find(query)
      .populate("sender", "username avatarUrl")
      .populate("post", "content")
      .sort({ updatedAt: -1 })
      .limit(10);

    const formatted = notifications.map((n) => {
      const senders = n.sender.map((s) => s.username);
      let message = n.message;

      if (["like", "comment", "follow"].includes(n.type)) {
        if (senders.length === 1) {
          message = `${senders[0]} ${
            n.type === "like"
              ? "đã thích"
              : n.type === "comment"
              ? "đã bình luận về"
              : "đã theo dõi bạn"
          } ${n.type === "follow" ? "" : "bài viết của bạn"}`;
        } else if (senders.length === 2) {
          message = `${senders[0]}, ${senders[1]} ${
            n.type === "like"
              ? "đã thích"
              : n.type === "comment"
              ? "đã bình luận về"
              : "đã theo dõi bạn"
          } ${n.type === "follow" ? "" : "bài viết của bạn"}`;
        } else {
          message = `${senders[0]}, ${senders[1]} và ${
            senders.length - 2
          } người khác ${
            n.type === "like"
              ? "đã thích"
              : n.type === "comment"
              ? "đã bình luận về"
              : "đã theo dõi bạn"
          } ${n.type === "follow" ? "" : "bài viết của bạn"}`;
        }
      }

      return {
        ...n._doc,
        message,
      };
    });

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );
    res
      .status(200)
      .json({ message: "Tất cả thông báo đã được đánh dấu là đã đọc." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createNotification, getNotifications, markAllAsRead };
