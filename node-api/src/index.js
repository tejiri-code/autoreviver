const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });
const express = require("express");
const cors = require("cors");
const { connect } = require("./db/mongoose");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/vehicle", require("./routes/vehicle"));
app.use("/inventory", require("./routes/inventory"));
app.use("/sellers", require("./routes/sellers"));

app.get("/health", (_, res) => res.json({ status: "ok", service: "autoreviver-node" }));

const PORT = process.env.PORT || 4000;
connect().then(() => {
  app.listen(PORT, () => console.log(`Node API on :${PORT}`));
});
