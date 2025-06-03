const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const UserModel = require("../models/UserModel");
dotenv.config();

const authMiddleware = (req, res, next) => {
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

const authUserMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token không tồn tại" });

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
    const user = await UserModel.findById(decoded.id);

    if (!user || user.isDeleted) {
      return res.status(403).json({ message: "Tài khoản đã bị xóa" });
    }

    if (user.isLocked) {
      return res.status(403).json({ message: "Tài khoản đang bị khóa" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token không hợp lệ" });
  }
};
module.exports = { authMiddleware, authUserMiddleware };
