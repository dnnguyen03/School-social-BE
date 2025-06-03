const mongoose = require("mongoose");
const commentSchema = require("./CommentSchema");

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, default: "" },
  media: [
    {
      url: { type: String, required: true },
      type: { type: String, enum: ["image", "video"], required: true },
    },
  ],
  repost: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
  repostCount: { type: Number, default: 0 },
  privacy: {
    type: String,
    enum: ["public", "private"],
    default: "public",
  },
  likes: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    default: [],
  },
  comments: [commentSchema],
  reports: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: String,
      reportedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  reportStatus: {
    type: String,
    enum: ["pending", "hidden", "ignored"],
  },
  hiddenAt: {
    type: Date,
    default: null,
  },
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
