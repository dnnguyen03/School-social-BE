const express = require("express");
const {
  createOrGetConversation,
  getUserConversations,
  getMessages,
  sendMessage,
} = require("../controller/ChatController");
const { authUserMiddleware } = require("../middleware/authMiddleware");
const router = express.Router();

// Conversations
router.post("/conversation", authUserMiddleware, createOrGetConversation);
router.get("/conversation", authUserMiddleware, getUserConversations);

// Messages
router.post("/message", authUserMiddleware, sendMessage);
router.get("/message/:conversationId", authUserMiddleware, getMessages);

module.exports = router;
