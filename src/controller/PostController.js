const { createNotification } = require("./NotificationController");
const Post = require("../models/PostModel");
const User = require("../models/UserModel");

// Tạo bài viết mới
const createPost = async (req, res) => {
  try {
    const { content, privacy = "public", image, video } = req.body;
    const userId = req.user.id;

    let media = [];

    if (Array.isArray(image)) {
      image.forEach((url) => {
        media.push({ url, type: "image" });
      });
    }
    if (Array.isArray(video)) {
      video.forEach((url) => {
        media.push({ url, type: "video" });
      });
    }

    const newPost = new Post({
      userId,
      content,
      media,
      privacy,
    });

    await newPost.save();
    await newPost.populate("userId", "username avatarUrl");
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lấy bài viết từ người dùng đang theo dõi
const getFollowingPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const { lastCreatedAt } = req.query;
    const limit = 10;

    const user = await User.findById(id).select("following");
    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

    const query = {
      userId: { $in: user.following },
      privacy: "public",
    };
    if (lastCreatedAt) {
      query.createdAt = { $lt: new Date(lastCreatedAt) };
    }

    let posts = await Post.find(query)
      .populate("userId", "username avatarUrl")
      .populate("comments.userId", "username avatarUrl")
      .populate({
        path: "repost",
        populate: { path: "userId", select: "username avatarUrl" },
      })
      .sort({ createdAt: -1 })
      .limit(limit);

    posts = posts.filter((post) => post.userId);
    posts.forEach((post) => {
      post.comments = post.comments.filter((c) => c.userId);
    });

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPostsByUserId = async (req, res) => {
  try {
    const userId = req.params.id;
    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

    const posts = await Post.find({ userId })
      .populate("userId", "username avatarUrl")
      .populate("comments.userId", "username avatarUrl")
      .sort({ createdAt: -1 });

    posts.forEach((post) => {
      post.comments = post.comments.filter((c) => c.userId);
    });

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const searchPosts = async (req, res) => {
  try {
    const { query, lastCreatedAt } = req.query;
    const limit = 10;

    if (!query || !query.trim()) {
      return res
        .status(400)
        .json({ error: "Từ khóa tìm kiếm không được để trống" });
    }

    const regex = new RegExp(query.trim(), "i");

    const searchQuery = {
      content: { $regex: regex },
      privacy: "public",
      reportStatus: { $ne: "hidden" },
    };

    if (lastCreatedAt) {
      searchQuery.createdAt = { $lt: new Date(lastCreatedAt) };
    }

    const posts = await Post.find(searchQuery)
      .populate("userId", "username avatarUrl")
      .populate("comments.userId", "username avatarUrl")
      .populate({
        path: "repost",
        populate: { path: "userId", select: "username avatarUrl" },
      })
      .sort({ createdAt: -1 })
      .limit(limit);

    const result = posts.map((post) => ({
      ...post._doc,
      repostCount: post.repostCount || 0,
      likeCount: post.likes.length,
      commentCount: post.comments.length,
      likes: post.likes,
      comments: post.comments,
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Chỉnh sửa bài viết
const editPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, media, privacy } = req.body;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Bài viết không tồn tại" });

    if (post.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "Bạn không có quyền chỉnh sửa bài viết này" });
    }

    if (post.repost) {
      return res
        .status(400)
        .json({ error: "Không thể chỉnh sửa bài viết Repost" });
    }

    if (content !== undefined) post.content = content;
    if (media !== undefined) post.media = media;
    if (privacy !== undefined) post.privacy = privacy;

    await post.save();

    await post.populate([
      { path: "userId", select: "fullName username avatarUrl" },
      {
        path: "comments.userId",
        model: "User",
        select: "fullName username avatarUrl",
      },
    ]);
    post.comments = post.comments.filter((c) => c.userId);

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lấy danh sách bài viết
const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("userId", "username avatarUrl")
      .populate("comments.userId", "username avatarUrl")
      .populate({
        path: "repost",
        populate: { path: "userId", select: "username avatarUrl" },
      })
      .sort({ createdAt: -1 });

    const result = posts.map((post) => ({
      ...post._doc,
      repostCount: post.repostCount,
      likeCount: post.likes.length,
      commentCount: post.comments.length,
      likes: post.likes,
      comments: post.comments,
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lấy bài viết công khai có phân trang và hỗ trợ infinite scroll
const getPublicPosts = async (req, res) => {
  try {
    const { lastCreatedAt } = req.query;
    const limit = 10;

    const query = {
      privacy: "public",
      reportStatus: { $ne: "hidden" },
    };

    if (lastCreatedAt) {
      query.createdAt = { $lt: new Date(lastCreatedAt) };
    }

    let posts = await Post.find(query)
      .populate("userId", "username avatarUrl")
      .populate("comments.userId", "username avatarUrl")
      .populate({
        path: "repost",
        select: "userId",
        populate: { path: "userId", select: "username avatarUrl" },
      })
      .sort({ createdAt: -1 })
      .limit(limit);

    posts = posts.filter((post) => post.userId);
    posts.forEach((post) => {
      post.comments = post.comments.filter((c) => c.userId);
    });
    const result = posts.map((post) => ({
      ...post._doc,
      repostCount: post.repostCount,
      likeCount: post.likes.length,
      commentCount: post.comments.length,
      likes: post.likes,
      comments: post.comments,
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const reportPost = async (req, res) => {
  try {
    const { postId, userId, reason } = req.body;

    if (!postId || !userId || !reason) {
      return res.status(400).json({ error: "Thiếu thông tin báo cáo" });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Bài viết không tồn tại" });

    const hasReported = post.reports.some(
      (r) => r.userId.toString() === userId.toString()
    );
    if (hasReported) {
      return res.status(400).json({ error: "Bạn đã báo cáo bài viết này" });
    }

    post.reports.push({
      userId,
      reason,
      reportedAt: new Date(),
    });

    if (!post.reportStatus || post.reportStatus === "ignored") {
      post.reportStatus = "pending";
    }

    await post.save();

    res.status(200).json({ message: "Đã báo cáo bài viết thành công" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi máy chủ: " + error.message });
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

const likePost = async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Bài viết không tồn tại" });

    const isLiked = post.likes.some((id) => id.toString() === userId);

    if (isLiked) {
      await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } });
    } else {
      await Post.findByIdAndUpdate(postId, { $addToSet: { likes: userId } });

      // Chỉ tạo thông báo nếu người like KHÔNG phải là chủ bài viết
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

    const updatedPost = await Post.findById(postId)
      .populate("userId", "username avatarUrl")
      .populate("likes", "username _id")
      .populate("comments.userId", "username avatarUrl");

    return res.status(200).json(updatedPost);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Bình luận bài viết
const commentPost = async (req, res) => {
  try {
    const { postId, content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res
        .status(400)
        .json({ error: "Nội dung bình luận không được để trống" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    post.comments.push({ userId, content });
    await post.save();

    if (post.userId.toString() !== userId.toString()) {
      await createNotification(
        post.userId,
        userId,
        "comment",
        postId,
        "đã bình luận về bài viết của bạn"
      );
    }

    const populatedPost = await Post.findById(postId)
      .populate("userId", "username avatarUrl")
      .populate("comments.userId", "username avatarUrl");
    post.comments = post.comments.filter((c) => c.userId);

    return res.status(200).json(populatedPost);
  } catch (error) {
    console.error("commentPost error:", error);
    return res.status(500).json({ error: error.message });
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
      repost: postId,
    });

    await newRepost.save();

    originalPost.repostCount += 1;
    await originalPost.save();

    res.status(201).json(newRepost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getReportedPosts = async (req, res) => {
  try {
    const posts = await Post.find({
      "reports.0": { $exists: true },
      reportStatus: { $in: ["pending", "hidden"] },
    })
      .sort({ updatedAt: -1 })
      .populate("userId", "username")
      .lean();

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

const ignoreReport = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { reportStatus: "ignored" },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }

    res.json({ message: "Đã bỏ qua báo cáo", post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const hidePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        reportStatus: "hidden",
        hiddenAt: new Date(),
      },
      { new: true }
    ).populate("userId", "username");

    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }

    await createNotification(
      post.userId._id,
      req.user.id,
      "warning",
      post._id,
      `Bài viết của bạn đã bị ẩn do vi phạm. Bạn có thể xem lại hoặc gửi kháng cáo trong 7 ngày.`
    );

    res.json({ message: "Bài viết đã được ẩn tạm thời", post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const unhidePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }

    if (post.reportStatus !== "hidden") {
      return res.status(400).json({ error: "Bài viết không bị ẩn" });
    }

    post.reportStatus = "pending"; // hoặc "none" nếu bạn muốn bỏ hoàn toàn
    post.hiddenAt = null;
    await post.save();

    return res.status(200).json({ message: "Đã hiển thị lại bài viết" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi máy chủ: " + error.message });
  }
};

const deleteReportedPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: "Đã xoá bài viết vĩnh viễn", postId: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id)
      .populate("userId", "username avatarUrl")
      .populate("comments.userId", "username avatarUrl")
      .populate({
        path: "repost",
        populate: { path: "userId", select: "username avatarUrl" },
      });

    if (!post) {
      return res.status(404).json({ error: "Bài viết không tồn tại" });
    }
    post.comments = post.comments.filter((c) => c.userId);

    const result = {
      ...post._doc,
      repostCount: post.repostCount || 0,
      likeCount: post.likes.length,
      commentCount: post.comments.length,
      likes: post.likes,
      comments: post.comments,
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Lỗi máy chủ: " + error.message });
  }
};

module.exports = {
  getPublicPosts,
  searchPosts,
  createPost,
  getPosts,
  deletePost,
  likePost,
  commentPost,
  repostPost,
  editPost,
  reportPost,
  getPostsByUserId,
  getFollowingPosts,
  getReportedPosts,
  deleteReportedPost,
  hidePost,
  ignoreReport,
  unhidePost,
  getPostById,
};
