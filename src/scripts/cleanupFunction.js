const commentSchema = require("../models/CommentSchema");
const Post = require("../models/PostModel");
const UserModel = require("../models/UserModel");

const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;

exports.autoCleanUsers = async () => {
  try {
    const deadline = new Date(Date.now() - THIRTY_DAYS);
    const users = await User.find({
      isDeleted: true,
      deletedAt: { $lt: deadline },
    });

    for (const user of users) {
      await Post.deleteMany({ userId: user._id });
      await commentSchema.deleteMany({ userId: user._id });
      await UserModel.findByIdAndDelete(user._id);
      console.log(`[XÓA USER] ${user.username} đã bị xóa vĩnh viễn`);
    }
  } catch (error) {
    console.error("Lỗi xoá tự động:", error);
  }
};
