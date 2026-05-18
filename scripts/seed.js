/**
 * Seed MongoDB with demo sellers and inventory listings.
 * Run: cd node-api && npm run seed
 */
const path = require("path");
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

async function seed() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected");

  await Seller.deleteMany({});
  await Inventory.deleteMany({});

  const sellers = await Seller.insertMany(SELLERS);
  console.log(`Seeded ${sellers.length} sellers`);

  const LISTINGS = [
    {
      seller_id: sellers[0]._id,
      title: "Ford Fiesta Mk7 Left Headlight Assembly 2013-2017",
      description: "Used left-side headlight assembly removed from a 2015 Ford Fiesta Mk7. Good working order. Minor surface marks only. Suitable for Fiesta Mk7 2013–2017 facelift models.",
      part_category: "headlight",
      make: "Ford",
      model: "Fiesta",
      generation: "Mk7",
      year_from: 2013,
      year_to: 2017,
      fuel_type: "Any",
      engine_size: "Any",
      side: "left",
      position: "front",
      oem_number: "8A61-13W030",
      condition: "Good",
      condition_notes: "Minor cosmetic marks. Lens intact. All connectors present.",
      price: 45,
      donor_vehicle: { make: "Ford", model: "Fiesta", year: 2015 },
      compatible_vehicles: ["Ford Fiesta 2013-2017"],
      safety_warnings: ["Confirm connector type before purchase", "Check facelift/non-facelift variant"],
      trust_score: 0.84,
      listing_score: 0.82,
      status: "active",
    },
    {
      seller_id: sellers[0]._id,
      title: "VW Golf Mk7 GTI Front Left Brake Caliper 2013-2019",
      description: "Used front left brake caliper removed from a 2017 VW Golf Mk7 GTI 2.0 TSI. Piston moves freely. Light surface rust on bracket. Compatible with Golf Mk6/7, Audi A3 8V, Seat Leon Mk3.",
      part_category: "caliper",
      make: "Volkswagen",
      model: "Golf",
      generation: "Mk7",
      year_from: 2013,
      year_to: 2019,
      fuel_type: "Any",
      engine_size: "Any",
      side: "left",
      position: "front",
      oem_number: "1K0615423N",
      condition: "Good",
      condition_notes: "Surface rust on bracket only. Piston intact and moves freely.",
      price: 55,
      donor_vehicle: { make: "Volkswagen", model: "Golf", year: 2017 },
      compatible_vehicles: ["VW Golf Mk6 2008-2012", "VW Golf Mk7 2013-2019", "Audi A3 8V 2012-2020", "Seat Leon Mk3 2012-2020"],
      safety_warnings: ["Safety-critical part — have inspected by a qualified mechanic before fitting"],
      trust_score: 0.86,
      listing_score: 0.88,
      status: "active",
    },
    {
      seller_id: sellers[1]._id,
      title: "Ford Focus Mk3 Front Bumper 2011-2014",
      description: "Used front bumper from a 2013 Ford Focus Mk3. Slight scuff on lower lip. No cracks. All mounting tabs intact. Needs a respray.",
      part_category: "bumper",
      make: "Ford",
      model: "Focus",
      generation: "Mk3",
      year_from: 2011,
      year_to: 2014,
      fuel_type: "Any",
      engine_size: "Any",
      side: "front",
      position: "front",
      condition: "Fair",
      condition_notes: "Scuff on lower lip. Will need respray. Structure intact.",
      price: 30,
      donor_vehicle: { make: "Ford", model: "Focus", year: 2013 },
      compatible_vehicles: ["Ford Focus 2011-2014"],
      safety_warnings: [],
      trust_score: 0.62,
      listing_score: 0.70,
      status: "active",
    },
    {
      seller_id: sellers[2]._id,
      title: "Car Headlight — Unknown Make",
      description: "Headlight from my old car. Not sure exactly which model it fits. Selling as spares.",
      part_category: "headlight",
      make: "",
      model: "",
      year_from: null,
      year_to: null,
      condition: "Unknown",
      condition_notes: "Sold as seen.",
      price: 10,
      compatible_vehicles: [],
      safety_warnings: ["Compatibility unverified — confirm with seller before purchase"],
      trust_score: 0.28,
      listing_score: 0.22,
      status: "active",
    },
  ];

  const listings = await Inventory.insertMany(LISTINGS);
  console.log(`Seeded ${listings.length} listings`);
  await mongoose.disconnect();
  console.log("Done");
}

seed().catch(console.error);
