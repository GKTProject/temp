import "dotenv/config";
import express from "express";
import router from "./routes.js";
import { connectUsingMongoose } from "./config/mongoose.config.js";
import bodyParser from "body-parser";
import path from "path";
import cors from "cors";

const port = process.env.PORT || 3000;

import { fileURLToPath } from "url"; // Import URL module to get the directory name
import { dirname } from "path"; // Import dirname to construct the directory path
// Get the directory name from the module's URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = express();

server.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));

//Default route
server.get("/", (req, res) => {
  res.send("Welcome to the server");
});

// Serve static files from the public directory
server.use(express.static(path.join(__dirname, "client", "build")));
server.use("/uploads", express.static(path.join("uploads")));

server.use("/api", router);

// // Serve the React app for any other requests
// server.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "client", "build", "index.html"));
// });

//Error handling middleware
server.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong",
  });
});

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
  connectUsingMongoose();
});
