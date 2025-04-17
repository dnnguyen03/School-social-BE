const userRouter = require("./UserRouter");
const postRouter = require("./PostRouter");
const notificationRoutes = require("./NotificationRoutes");

const routes = (app) => {
  app.use("/api/users", userRouter);
  app.use("/api/posts", postRouter);
  app.use("/notifications", notificationRoutes);
};

module.exports = routes;
