const express = require("express");
const router = express.Router();
const {
  getPosts,
  deletePost,
  createPost,
  likePost,
  commentPost,
  repostPost,
  editPost,
  reportPost,
} = require("../controller/postController");
const { authUserMiddleware } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

router.post(
  "/create",
  authUserMiddleware,
  upload.fields([{ name: "image" }, { name: "video" }]),
  createPost
);
router.get("/", authUserMiddleware, getPosts);
router.delete("/:postId", authUserMiddleware, deletePost);
router.post("/like", authUserMiddleware, likePost);
router.post("/comment", authUserMiddleware, commentPost);
router.post("/repost", authUserMiddleware, repostPost);
router.put("/:postId", authUserMiddleware, editPost);
router.post("/report", authUserMiddleware, reportPost);

module.exports = router;
