const express = require("express");
const {
  getNotifications,
  markAllAsRead,
} = require("../controller/NotificationController");
const router = express.Router();
const { authUserMiddleware } = require("../middleware/authMiddleware");

router.post("/markAllAsRead", authUserMiddleware, markAllAsRead);
router.get("/", authUserMiddleware, getNotifications);

module.exports = router;
