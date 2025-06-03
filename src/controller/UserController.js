const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createNotification } = require("./notificationController");

const registerUser = async (req, res) => {
  try {
    const { fullName, username, email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword || !fullName || !username) {
      return res
        .status(400)
        .json({ status: "ERR", message: "Các trường nhập là bắt buộc!" });
    }

    const emailRegex = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ status: "ERR", message: "Email không hợp lệ!" });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ status: "ERR", message: "Mật khẩu xác nhận không khớp!" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ status: "ERR", message: "Email hoặc username đã tồn tại!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullName,
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ status: "OK", message: "Đăng ký thành công!" });
  } catch (error) {
    res.status(500).json({ status: "ERR", message: "Lỗi server", error });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ status: "ERR", message: "Email và mật khẩu là bắt buộc!" });
    }

    const emailRegex = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ status: "ERR", message: "Email không hợp lệ!" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ status: "ERR", message: "Email hoặc mật khẩu không đúng!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ status: "ERR", message: "Email hoặc mật khẩu không đúng!" });
    }

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.ACCESS_TOKEN,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      status: "OK",
      message: "Đăng nhập thành công!",
      user: {
        ...user.toObject(),
        id: user._id,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ status: "ERR", message: "Lỗi server", error });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;
    const isAdmin = req.user.isAdmin;

    const {
      fullName,
      username,
      bio,
      avatarUrl,
      isAdmin: isAdminRequest,
      isLocked,
      isDeleted,
    } = req.body;

    if (!isAdmin && requesterId !== userId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền sửa người dùng này." });
    }

    const updateData = {
      ...(fullName && { fullName }),
      ...(username && { username }),
      ...(bio && { bio }),
      ...(avatarUrl && { avatarUrl }),
      ...(isAdmin &&
        isAdminRequest !== undefined && { isAdmin: isAdminRequest }),
      ...(typeof isLocked === "boolean" && { isLocked }),
      ...(typeof isDeleted === "boolean" && { isDeleted }),
    };

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Lỗi cập nhật hồ sơ:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const getMutuals = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).select(
      "following followers"
    );
    const mutuals = currentUser.following.filter((id) =>
      currentUser.followers.includes(id)
    );
    const users = await User.find({ _id: { $in: mutuals } }).select(
      "username avatarUrl"
    );
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy danh sách user (chỉ Admin)
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const role = req.query.role || "all";
    const skip = (page - 1) * limit;

    let filter = {};
    if (role === "admin") {
      filter.isAdmin = true;
    } else if (role === "user") {
      filter.isAdmin = false;
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter, "-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Lỗi getAllUsers:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const softDeleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    res.json({ message: "Đã xoá (soft delete)", user });
  } catch (error) {
    console.error("Lỗi soft delete:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const lockUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isLocked: true },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  res.json({ message: "Tài khoản đã bị khoá", user });
};

const restoreUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      isDeleted: false,
      isLocked: false,
      deletedAt: null,
    },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  res.json({ message: "Đã khôi phục tài khoản", user });
};

const getSuggestedUsers = async (req, res) => {
  const userId = req.user.id;
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const query = {
      _id: {
        $ne: userId,
        $nin: currentUser.following || [],
      },
      isDeleted: false,
      $or: [
        { fullName: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ],
    };

    const users = await User.find(query)
      .skip(skip)
      .limit(limit)
      .select("fullName username bio followers avatarUrl");

    const suggested = users.map((u) => ({
      _id: u._id,
      name: u.fullName,
      username: u.username,
      bio: u.bio,
      followers: `${u.followers.length} người theo dõi`,
      isFollowed: false,
      avatarUrl: u.avatarUrl,
    }));

    res.status(200).json(suggested);
  } catch (err) {
    console.error("Lỗi getSuggestedUsers:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const followUser = async (req, res) => {
  const userId = req.user.id;
  const targetUserId = req.params.id;

  if (userId === targetUserId)
    return res
      .status(400)
      .json({ message: "Bạn không thể tự theo dõi chính mình" });

  try {
    const currentUser = await User.findById(userId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại!" });
    }

    if (!currentUser.following.includes(targetUserId)) {
      currentUser.following.push(targetUserId);
      targetUser.followers.push(userId);

      await currentUser.save();
      await targetUser.save();

      await createNotification(
        targetUserId,
        userId,
        "follow",
        null,
        "đã theo dõi bạn"
      );

      return res.status(200).json({ message: "Đã theo dõi" });
    } else {
      return res.status(400).json({ message: "Đã theo dõi người này rồi" });
    }
  } catch (err) {
    console.error("Lỗi followUser:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const unfollowUser = async (req, res) => {
  const userId = req.user.id;
  const unfollowUserId = req.params.id;

  try {
    if (userId === unfollowUserId) {
      return res
        .status(400)
        .json({ message: "Không thể hủy theo dõi chính bạn!" });
    }

    const user = await User.findById(userId);
    const unfollowUser = await User.findById(unfollowUserId);

    if (!user || !unfollowUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại!" });
    }

    user.following = user.following.filter((id) => !id.equals(unfollowUserId));
    unfollowUser.followers = unfollowUser.followers.filter(
      (id) => !id.equals(userId)
    );

    await user.save();
    await unfollowUser.save();

    res.status(200).json({ message: "Đã hủy theo dõi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const searchUsers = async (req, res) => {
  try {
    const keyword = req.query.keyword || "";
    const currentUserId = req.user.id;

    if (!keyword) {
      return res.status(400).json({
        status: "ERR",
        message: "Thiếu từ khóa tìm kiếm",
      });
    }

    const users = await User.find({
      $and: [
        {
          $or: [
            { fullName: { $regex: keyword, $options: "i" } },
            { username: { $regex: keyword, $options: "i" } },
          ],
        },
        { _id: { $ne: currentUserId } },
      ],
    }).select("_id fullName username bio followers avatarUrl");

    const formatted = users.map((u) => ({
      _id: u._id,
      name: u.fullName,
      username: u.username,
      bio: u.bio,
      followers: `${u.followers.length} người theo dõi`,
      isFollowed: u.followers.includes(currentUserId),
      avatarUrl: u.avatarUrl,
    }));

    res.status(200).json({
      status: "OK",
      data: formatted,
    });
  } catch (error) {
    console.error("Lỗi khi tìm kiếm người dùng:", error);
    res.status(500).json({
      status: "ERR",
      message: "Lỗi server",
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getAllUsers,
  getSuggestedUsers,
  restoreUser,
  lockUser,
  softDeleteUser,
  followUser,
  unfollowUser,
  searchUsers,
  getUserById,
  getMutuals,
  updateProfile,
};
