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
  getPostsByUserId,
  getPublicPosts,
  getFollowingPosts,
  getReportedPosts,
  ignoreReport,
  hidePost,
  deleteReportedPost,
  unhidePost,
  getPostById,
  searchPosts,
} = require("../controller/PostController");
const {
  authUserMiddleware,
  authMiddleware,
} = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

router.post(
  "/create",
  authUserMiddleware,
  upload.fields([{ name: "image" }, { name: "video" }]),
  createPost
);
router.get("/following/:id", authUserMiddleware, getFollowingPosts);
router.get("/", authUserMiddleware, getPosts);
router.delete("/delete/:postId", authUserMiddleware, deletePost);
router.post("/like", authUserMiddleware, likePost);
router.post("/comment", authUserMiddleware, commentPost);
router.post("/repost", authUserMiddleware, repostPost);
router.put("/update/:postId", authUserMiddleware, editPost);
router.post("/report", authUserMiddleware, reportPost);
router.get("/user/:id", getPostsByUserId);
router.get("/public", authUserMiddleware, getPublicPosts);
router.get("/search", searchPosts);
router.get("/reported", authMiddleware, getReportedPosts);
router.put("/:id/report/ignore", authMiddleware, ignoreReport);
router.put("/:id/report/hide", authMiddleware, hidePost);
router.delete("/:id/report/delete", authMiddleware, deleteReportedPost);
router.put("/:id/report/unhide", authMiddleware, unhidePost);
router.get("/:id", authUserMiddleware, getPostById);

module.exports = router;
