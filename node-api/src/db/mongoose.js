const mongoose = require("mongoose");
const fs = require("fs");

const isDocker = fs.existsSync("/.dockerenv");

const connect = async () => {
  const url = isDocker
    ? process.env.MONGO_URL || process.env.MONGO_URL_LOCAL
    : process.env.MONGO_URL_LOCAL || process.env.MONGO_URL;

  if (!url) {
    throw new Error("Missing MongoDB connection string. Set MONGO_URL_LOCAL for local dev or MONGO_URL for Docker.");
  }

  await mongoose.connect(url);
  console.log("MongoDB connected");
};

module.exports = { connect };
