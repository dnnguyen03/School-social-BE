const { createNotification } = require("./notificationController");
const Post = require("../models/PostModel");

// Tạo bài viết mới
const createPost = async (req, res) => {
  try {
    const { content, privacy = "public", image, video } = req.body;
    const userId = req.user.id;

    let media = [];

    // Lưu các URL hình ảnh
    if (Array.isArray(image)) {
      image.forEach((url) => {
        media.push({ url, type: "image" });
      });
    }

    // Lưu các URL video
    if (Array.isArray(video)) {
      video.forEach((url) => {
        media.push({ url, type: "video" });
      });
    }

    const newPost = new Post({
      userId,
      content,
      media,
      privacy, // Thêm quyền riêng tư
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Chỉnh sửa bài viết
const editPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, media } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Bài viết không tồn tại" });

    if (post.repost) {
      return res
        .status(400)
        .json({ error: "Không thể chỉnh sửa bài viết Repost" });
    }

    post.content = content || post.content;
    post.media = media || post.media; // Cập nhật mảng media

    await post.save();
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lấy danh sách bài viết
const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("userId", "username profilePic")
      .populate({
        path: "repost",
        populate: { path: "userId", select: "username profilePic" },
      })
      .sort({ createdAt: -1 });

    const formattedPosts = posts.map((post) => ({
      ...post._doc,
      likeCount: post.likes.length,
      commentCount: post.comments.length,
      repostCount: post.repostCount,
    }));

    res.status(200).json(formattedPosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Báo cáo bài viết
const reportPost = async (req, res) => {
  try {
    const { postId, userId, reason } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Bài viết không tồn tại" });

    post.reports.push({ userId, reason, reportedAt: new Date() });
    await post.save();

    res.status(200).json({ message: "Đã báo cáo bài viết" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Xóa bài viết
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    await Post.findByIdAndDelete(postId);
    res.status(200).json({ message: "Đã xóa bài viết" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Thích bài viết
const likePost = async (req, res) => {
  try {
    const { postId, userId } = req.body;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    const isLiked = post.likes.includes(userId);
    if (isLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId);
      if (post.userId.toString() !== userId) {
        await createNotification(
          post.userId,
          userId,
          "like",
          postId,
          "đã thích bài viết của bạn"
        );
      }
    }

    await post.save();
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bình luận bài viết
const commentPost = async (req, res) => {
  try {
    const { postId, userId, content } = req.body;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    post.comments.push({ userId, content });
    await post.save();

    if (post.userId.toString() !== userId) {
      await createNotification(
        post.userId,
        userId,
        "comment",
        postId,
        "đã bình luận về bài viết của bạn"
      );
    }

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Đăng lại bài viết
const repostPost = async (req, res) => {
  try {
    const { userId, postId } = req.body;
    const originalPost = await Post.findById(postId);

    if (!originalPost) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    const newRepost = new Post({
      userId,
      repost: postId, // Trỏ đến bài gốc
    });

    await newRepost.save();

    originalPost.repostCount += 1;
    await originalPost.save();

    res.status(201).json(newRepost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createPost,
  getPosts,
  deletePost,
  likePost,
  commentPost,
  repostPost,
  editPost,
  reportPost,
};
