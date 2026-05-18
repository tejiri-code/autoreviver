const router = require("express").Router();
const { lookupVehicle } = require("../services/dvla");
const crypto = require("crypto");

router.post("/lookup", async (req, res) => {
  const { vrn } = req.body;
  if (!vrn) return res.status(400).json({ error: "vrn required" });

  try {
    const data = await lookupVehicle(vrn);
    res.json({
      vehicle: {
        make: data.make,
        model: data.model,
        year: data.yearOfManufacture,
        fuel_type: data.fuelType,
        engine_size_cc: data.engineCapacity,
        colour: data.colour,
        mot_status: data.motStatus,
        euro_status: data.euroStatus,
      },
      vrn_hash: crypto.createHash("sha256").update(vrn.replace(/\s/g, "").toUpperCase()).digest("hex").slice(0, 16),
      source: data._mock ? "mock_dvla" : "dvla_live",
      privacy_notice: "Registration number hashed — raw VRN not stored.",
      _mock_note: data._mock ? data._note || "Using demo data" : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: "Vehicle lookup failed", detail: err.message });
  }
});

module.exports = router;
