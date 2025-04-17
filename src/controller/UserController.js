const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ status: "ERR", message: "Lỗi server", error });
  }
};

// Lấy danh sách user (chỉ Admin)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password"); // Không trả về mật khẩu
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
};

module.exports = { registerUser, loginUser, getAllUsers };
