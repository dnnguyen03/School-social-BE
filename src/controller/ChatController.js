const Conversation = require("../models/ConversationModel");
const Message = require("../models/MessageModel");

// Tạo hoặc lấy cuộc trò chuyện giữa 2 người
const createOrGetConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.body;

    let conversation = await Conversation.findOne({
      members: { $all: [userId, otherUserId] },
    }).populate("members", "username profilePic");

    if (!conversation) {
      conversation = new Conversation({
        members: [userId, otherUserId],
      });
      await conversation.save();
      await conversation.populate("members", "username profilePic");
    }

    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { conversationId, text, media = [] } = req.body;

    const message = new Message({
      conversationId,
      sender: senderId,
      text,
      media,
    });

    await message.save();

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        text,
        sender: senderId,
        createdAt: new Date(),
      },
    });

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "username avatarUrl"
    );

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, limit = 20 } = req.query;

    const query = { conversationId };
    if (before) query.createdAt = { $lt: new Date(before) };

    let msgs = await Message.find(query)
      .populate("sender", "username profilePic")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    msgs = msgs.reverse();

    res.status(200).json(msgs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({
      members: userId,
    })
      .sort({ updatedAt: -1 })
      .populate("members", "username profilePic");

    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createOrGetConversation,
  sendMessage,
  getMessages,
  getUserConversations,
};
