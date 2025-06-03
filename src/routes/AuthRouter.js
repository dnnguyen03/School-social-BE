const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const { authUserMiddleware } = require("../middleware/authMiddleware");
const UserModel = require("../models/UserModel");

require("../auth/passport");
const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    const user = req.user;
    const payload = {
      id: user._id,
      isAdmin: user.isAdmin,
    };

    const token = jwt.sign(payload, process.env.ACCESS_TOKEN, {
      expiresIn: "7d",
    });

    res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}`);
  }
);

router.get("/me", authUserMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id)
      .select("-password")
      .lean();
    if (!user || user.isDeleted || user.isLocked) {
      return res.status(403).json({ message: "Tài khoản không hợp lệ" });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error("Lỗi ở /auth/me:", err); // <--- THÊM DÒNG NÀY ĐỂ LOG RA LỖI
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

module.exports = router;
