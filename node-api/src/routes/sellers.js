const router = require("express").Router();
const { Seller } = require("../db/models");

router.get("/", async (req, res) => {
  res.json(await Seller.find().limit(50));
});

router.get("/:id", async (req, res) => {
  const s = await Seller.findById(req.params.id);
  if (!s) return res.status(404).json({ error: "Not found" });
  res.json(s);
});

router.post("/", async (req, res) => {
  const seller = new Seller(req.body);
  await seller.save();
  res.status(201).json(seller);
});

module.exports = router;
