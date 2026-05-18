/**
 * Vehicle lookup service.
 *
 * Priority order:
 * 1. ukvehicledata.co.uk (free tier, instant signup — use for hackathon)
 * 2. Official DVLA VES API (application pending)
 * 3. Mock data (fallback for demo)
 *
 * Sign up at: https://ukvehicledata.co.uk/ → API → get free key
 */

const axios = require("axios");

const MOCK_VEHICLES = {
  AB12CDE: { make: "FORD", model: "FIESTA", fuelType: "PETROL", engineCapacity: 998, yearOfManufacture: 2016, colour: "SILVER", motStatus: "Valid" },
  WN67DSO: { make: "VOLKSWAGEN", model: "GOLF", fuelType: "DIESEL", engineCapacity: 1968, yearOfManufacture: 2017, colour: "GREY", motStatus: "Valid" },
  LK12ABC: { make: "FORD", model: "FIESTA", fuelType: "PETROL", engineCapacity: 998, yearOfManufacture: 2015, colour: "BLUE", motStatus: "Valid" },
  DK19XYZ: { make: "VAUXHALL", model: "CORSA", fuelType: "PETROL", engineCapacity: 1199, yearOfManufacture: 2019, colour: "RED", motStatus: "Valid" },
  BV65FGH: { make: "BMW", model: "3 SERIES", fuelType: "DIESEL", engineCapacity: 1995, yearOfManufacture: 2015, colour: "BLACK", motStatus: "Valid" },
  YE18RST: { make: "NISSAN", model: "QASHQAI", fuelType: "PETROL", engineCapacity: 1332, yearOfManufacture: 2018, colour: "WHITE", motStatus: "Valid" },
};

const normalise = (vrn) => vrn.replace(/\s+/g, "").toUpperCase();

async function lookupViaUKVehicleData(reg) {
  // API docs: https://ukvehicledata.co.uk/
  // Endpoint: GET https://v1.motorcheck.ukvehicledata.co.uk/v1/motorcheck?vrm={VRM}&auth_apikey={KEY}
  const resp = await axios.get("https://v1.motorcheck.ukvehicledata.co.uk/v1/motorcheck", {
    params: { vrm: reg, auth_apikey: process.env.UKVD_API_KEY },
    timeout: 10000,
  });

  const d = resp.data?.Response?.DataItems;
  if (!d) throw new Error("No data returned from ukvehicledata.co.uk");

  const vi = d.VehicleIdentifier || {};
  const cs = d.VehicleStatus?.MotVed || {};

  return {
    make: vi.Make || "UNKNOWN",
    model: vi.Model || "UNKNOWN",
    fuelType: vi.FuelType || "UNKNOWN",
    engineCapacity: vi.EngineCapacity || null,
    yearOfManufacture: vi.YearOfManufacture || null,
    colour: vi.Colour || "UNKNOWN",
    motStatus: cs.MotStatus || "Unknown",
    _source: "ukvehicledata",
  };
}

async function lookupViaDVLA(reg) {
  const resp = await axios.post(
    "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles",
    { registrationNumber: reg },
    { headers: { "x-api-key": process.env.DVLA_API_KEY, "Content-Type": "application/json" } }
  );
  return { ...resp.data, _source: "dvla" };
}

async function lookupVehicle(vrn) {
  const reg = normalise(vrn);

  // Try ukvehicledata.co.uk first (free, no waiting period)
  if (process.env.UKVD_API_KEY && process.env.UKVD_API_KEY !== "your_key_here") {
    try {
      return await lookupViaUKVehicleData(reg);
    } catch (err) {
      console.warn("ukvehicledata lookup failed, trying DVLA or mock:", err.message);
    }
  }

  // Try official DVLA API
  if (process.env.DVLA_API_KEY && process.env.DVLA_API_KEY !== "mock") {
    try {
      return await lookupViaDVLA(reg);
    } catch (err) {
      console.warn("DVLA lookup failed, falling back to mock:", err.message);
    }
  }

  // Mock fallback
  const data = MOCK_VEHICLES[reg];
  return {
    ...(data || {
      make: "UNKNOWN",
      model: "UNKNOWN",
      fuelType: "UNKNOWN",
      engineCapacity: null,
      yearOfManufacture: null,
      colour: "UNKNOWN",
      motStatus: "Unknown",
    }),
    _mock: true,
    _source: data ? "mock_demo" : "mock_not_found",
    _note: data ? "Demo registration — using seeded vehicle data" : "Registration not in demo dataset. Try: AB12CDE, WN67DSO, BV65FGH",
  };
}

module.exports = { lookupVehicle };
