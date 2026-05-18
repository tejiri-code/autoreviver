const mongoose = require("mongoose");

const connect = async () => {
  const url = process.env.MONGO_URL || process.env.MONGO_URL_LOCAL;
  await mongoose.connect(url);
  console.log("MongoDB connected");
};

module.exports = { connect };
