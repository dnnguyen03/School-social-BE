const cloudinary = require("./config/cloudinaryConfig");

cloudinary.uploader.upload(
  "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  { folder: "test" },
  (error, result) => {
    if (error) console.log("Lỗi:", error);
    else console.log("Upload thành công:", result);
  }
);
