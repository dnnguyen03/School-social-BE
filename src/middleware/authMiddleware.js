const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Sử dụng "Bearer token"
  if (!token) {
    return res
      .status(401)
      .json({ message: "Token không tồn tại", status: "ERROR" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Token không hợp lệ", status: "ERROR" });
    }

    if (user.isAdmin) {
      req.user = user;
      next();
    } else {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền", status: "ERROR" });
    }
  });
};

const authUserMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token không tồn tại", status: "ERROR" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Token không hợp lệ", status: "ERROR" });
    }

    // Lấy userId từ token
    req.user = user; // Đưa thông tin người dùng vào req.user

    // Kiểm tra quyền của người dùng (Admin hoặc chính người dùng)
    next();
  });
};

module.exports = { authMiddleware, authUserMiddleware };
