const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema({
  vrn_hash: String,
  make: { type: String, required: true },
  model: { type: String, required: true },
  generation: String,
  year: Number,
  fuel_type: String,
  engine_size: String,
  trim: String,
  body_type: String,
  source: { type: String, default: "mock_dvla" },
  created_at: { type: Date, default: Date.now },
});

const SellerSchema = new mongoose.Schema({
  business_name: String,
  seller_type: { type: String, enum: ["private", "trade", "scrapyard"], default: "trade" },
  company_number: String,
  vat_number: String,
  location: String,
  company_verified: { type: Boolean, default: false },
  vat_verified: { type: Boolean, default: false },
  total_sales: { type: Number, default: 0 },
  wrong_part_claims: { type: Number, default: 0 },
  unresolved_disputes: { type: Number, default: 0 },
  return_policy: String,
  created_at: { type: Date, default: Date.now },
});

const InventorySchema = new mongoose.Schema({
  seller_id: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
  title: String,
  description: String,
  part_category: String,
  make: String,
  model: String,
  generation: String,
  year_from: Number,
  year_to: Number,
  fuel_type: String,
  engine_size: String,
  side: String,
  position: String,
  oem_number: String,
  part_number: String,
  condition: String,
  condition_notes: String,
  price: Number,
  donor_vehicle: Object,
  image_url: String,
  image_hashes: Object,
  compatible_vehicles: [String],
  safety_warnings: [String],
  trust_score: Number,
  listing_score: Number,
  status: { type: String, default: "active" },
  created_at: { type: Date, default: Date.now },
});

module.exports = {
  Vehicle: mongoose.model("Vehicle", VehicleSchema),
  Seller: mongoose.model("Seller", SellerSchema),
  Inventory: mongoose.model("Inventory", InventorySchema),
};
