/**
 * Seed MongoDB with demo sellers and inventory listings.
 * Run: cd node-api && npm run seed
 */
const path = require("path");
const fs = require("fs");
const { createRequire } = require("module");

const repoRoot = path.resolve(__dirname, "..");
const apiRequire = createRequire(path.join(repoRoot, "node-api", "package.json"));

apiRequire("dotenv").config({ path: path.join(repoRoot, ".env") });
const mongoose = apiRequire("mongoose");
const { Seller, Inventory } = require(path.join(repoRoot, "node-api", "src", "db", "models"));

const MONGO_URL = process.env.MONGO_URL_LOCAL || "mongodb://autoreviver:autoreviver@localhost:27017/autoreviver?authSource=admin";

const SELLERS = [
  {
    business_name: "Midlands Auto Dismantlers",
    seller_type: "scrapyard",
    company_number: "12345678",
    vat_number: "GB123456789",
    location: "Birmingham, UK",
    company_verified: true,
    vat_verified: true,
    total_sales: 847,
    wrong_part_claims: 3,
    unresolved_disputes: 0,
    return_policy: "14-day returns on all parts",
  },
  {
    business_name: "Northern Parts Direct",
    seller_type: "trade",
    location: "Sheffield, UK",
    company_verified: true,
    vat_verified: false,
    total_sales: 312,
    wrong_part_claims: 8,
    unresolved_disputes: 1,
    return_policy: "No returns on electrical parts",
  },
  {
    business_name: "J. Smith Private Seller",
    seller_type: "private",
    location: "Leeds, UK",
    company_verified: false,
    vat_verified: false,
    total_sales: 4,
    wrong_part_claims: 0,
    unresolved_disputes: 0,
  },
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

function toNumber(value) {
  if (value === "" || value === undefined || value === null) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function splitList(value) {
  return value ? value.split("|").map((item) => item.trim()).filter(Boolean) : [];
}

async function seed() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected");

  await Seller.deleteMany({});
  await Inventory.deleteMany({});

  const sellers = await Seller.insertMany(SELLERS);
  console.log(`Seeded ${sellers.length} sellers`);

  const csvPath = path.join(repoRoot, "data", "compatibility.csv");
  const LISTINGS = parseCsv(fs.readFileSync(csvPath, "utf8")).map((row) => {
    const seller = sellers[toNumber(row.seller_index) ?? 0] || sellers[0];
    const donorYear = toNumber(row.donor_year);
    return {
      seller_id: seller._id,
      title: row.title,
      description: row.description,
      part_category: row.part_category,
      make: row.make,
      model: row.model,
      generation: row.generation,
      year_from: toNumber(row.year_from),
      year_to: toNumber(row.year_to),
      fuel_type: row.fuel_type || "Any",
      engine_size: row.engine_size || "Any",
      side: row.side,
      position: row.position,
      oem_number: row.oem_number,
      condition: row.condition,
      condition_notes: row.condition_notes,
      price: toNumber(row.price),
      image_url: row.image_url,
      donor_vehicle: row.make && row.model ? { make: row.make, model: row.model, year: donorYear } : undefined,
      compatible_vehicles: splitList(row.compatible_vehicles),
      safety_warnings: splitList(row.safety_warnings),
      trust_score: toNumber(row.trust_score),
      listing_score: toNumber(row.listing_score),
      status: "active",
    };
  });

  const listings = await Inventory.insertMany(LISTINGS);
  console.log(`Seeded ${listings.length} listings`);
  await mongoose.disconnect();
  console.log("Done");
}

seed().catch(console.error);
