const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const routes = require("./routes");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
const { setupSocket } = require("./services/socketService");

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;
const server = http.createServer(app);

app.use(cors());
app.use(bodyParser.json());

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

server.listen(port, () => {
  console.log(`Server: ${port}`);
});
