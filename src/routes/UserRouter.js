const express = require("express");
const {
  registerUser,
  loginUser,
  getAllUsers,
} = require("../controller/userController");
const { authUserMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", authUserMiddleware, getAllUsers);

module.exports = router;
