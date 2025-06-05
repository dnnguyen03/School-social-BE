const express = require("express");
const {
  registerUser,
  loginUser,
  getAllUsers,
  getSuggestedUsers,
  followUser,
  unfollowUser,
  searchUsers,
  getUserById,
  getMutuals,
  updateProfile,
  softDeleteUser,
  lockUser,
  restoreUser,
  checkUsername,
} = require("../controller/userController");

const {
  authUserMiddleware,
  authMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

//  Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/check-username", checkUsername);

// User-authenticated routes
router.get("/mutuals", authUserMiddleware, getMutuals);
router.get("/suggestions", authUserMiddleware, getSuggestedUsers);
router.get("/search", authUserMiddleware, searchUsers);
router.post("/:id/follow", authUserMiddleware, followUser);
router.post("/:id/unfollow", authUserMiddleware, unfollowUser);
router.put("/profile/:userId", authUserMiddleware, updateProfile);

// Admin routes
router.get("/", authMiddleware, getAllUsers);
router.delete("/:id", authMiddleware, softDeleteUser);
router.patch("/:id/lock", authMiddleware, lockUser);
router.patch("/:id/restore", authMiddleware, restoreUser);

router.get("/:id", getUserById);

module.exports = router;
