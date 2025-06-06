const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const routes = require("./routes");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
const { setupSocket } = require("./services/socketService");
const path = require("path");

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;
const server = http.createServer(app);
const cron = require("node-cron");
const { autoCleanUsers } = require("./scripts/cleanupFunction");
const passport = require("passport");
require("./auth/passport");

app.use(cors());
app.use(bodyParser.json());

app.use(passport.initialize());
routes(app);

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_DB)
  .then(() => {
    console.log("đã kết nối");
  })
  .catch((err) => {
    console.log(err);
  });

setupSocket(server);
cron.schedule("0 3 * * *", autoCleanUsers);

// server.listen(port, () => {
//   console.log(`Server: ${port}`);
// });

app.use(express.static(path.join(__dirname, "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server: ${port}`);
});
