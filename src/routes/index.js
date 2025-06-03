const userRouter = require("./UserRouter");
const postRouter = require("./PostRouter");
const notificationRoutes = require("./NotificationRoutes");
const chatRoutes = require("./ChatRouter");
const authRoutes = require("./AuthRouter");

const routes = (app) => {
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRouter);
  app.use("/api/posts", postRouter);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/chat", chatRoutes);
};

module.exports = routes;
