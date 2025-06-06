const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/UserModel");
const cloudinary = require("../config/cloudinaryConfig");

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

          // Upload avatar từ URL Google lên Cloudinary
          const uploadedAvatar = await cloudinary.uploader.upload(
            profile.photos[0].value,
            {
              folder: "user_avatars",
              public_id: `avatar_${profile.id}`,
            }
          );

          user = await User.create({
            fullName: profile.displayName,
            username,
            email,
            password: "GOOGLE_AUTH",
            avatarUrl: uploadedAvatar.secure_url,
          });
        } else if (
          user.avatarUrl &&
          user.avatarUrl.includes("googleusercontent.com")
        ) {
          // Nếu user cũ vẫn dùng ảnh Google → upload ngay và cập nhật
          try {
            const uploadedAvatar = await cloudinary.uploader.upload(
              user.avatarUrl,
              {
                folder: "user_avatars",
                public_id: `avatar_${user._id}`,
              }
            );

            user.avatarUrl = uploadedAvatar.secure_url;
            await user.save();

            console.log("✅ Đã cập nhật avatar Cloudinary:", user.email);
          } catch (uploadErr) {
            console.error("❌ Lỗi upload avatar cũ:", uploadErr.message);
          }
        }

        done(null, user);
      } catch (error) {
        console.error("❌ Lỗi trong GoogleStrategy:", error.message);
        done(error, null);
      }
    }
  )
);
