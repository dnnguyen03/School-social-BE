const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/UserModel");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        let user = await User.findOne({ email });

        if (!user) {
          // Tạo username không trùng
          let username = `gg_${profile.id}`;
          let count = 1;
          while (await User.findOne({ username })) {
            username = `gg_${profile.id}_${count++}`;
          }

          // ❌ Không lấy avatar từ Google nữa
          user = await User.create({
            fullName: profile.displayName,
            username,
            email,
            password: "GOOGLE_AUTH",
            avatarUrl: null, // ✅ Dùng ảnh mặc định frontend
          });
        } else if (
          user.avatarUrl &&
          user.avatarUrl.includes("googleusercontent.com")
        ) {
          // ✅ Nếu user cũ dùng avatar Google → xóa
          user.avatarUrl = null;
          await user.save();
          console.log("Đã xóa avatar Google cũ:", user.email);
        }

        done(null, user);
      } catch (error) {
        console.error("Lỗi trong GoogleStrategy:", error.message);
        done(error, null);
      }
    }
  )
);
