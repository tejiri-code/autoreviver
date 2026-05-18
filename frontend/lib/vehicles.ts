import vehicleRows from "../../data/uk_vehicle_selector.json";

export interface VehicleOption {
  make: string;
  model: string;
  generic_model: string;
  body_type: string;
  years: number[];
  fuels: string[];
  engine_sizes: string[];
  vehicle_card_image: string;
  source: string;
}

export const VEHICLES = vehicleRows as VehicleOption[];
export const MAKES = [...new Set(VEHICLES.map((v) => v.make))].sort();

export function getModels(make: string) {
  return VEHICLES.filter((v) => v.make === make).map((v) => v.model).sort();
}

export function getYears(make: string, model: string) {
  return VEHICLES.find((v) => v.make === make && v.model === model)?.years ?? [];
}

export function getFuels(make: string, model: string) {
  return VEHICLES.find((v) => v.make === make && v.model === model)?.fuels ?? ["Any"];
}

export function getEngineSizes(make: string, model: string) {
  return VEHICLES.find((v) => v.make === make && v.model === model)?.engine_sizes ?? ["Any"];
}

export function getVehicle(make: string, model: string) {
  return VEHICLES.find((v) => v.make === make && v.model === model);
}

export const POPULAR_VEHICLES = VEHICLES.slice(0, 6);

export const PART_CATEGORIES = [
  "Headlight", "Rear Light", "Wing Mirror", "Front Bumper", "Rear Bumper",
  "Bonnet", "Door", "Wheel", "Tyre", "Alternator", "Starter Motor",
  "Radiator", "Radiator Fan", "Brake Caliper", "Brake Disc", "Suspension Arm",
  "Battery", "Seat", "Infotainment Screen", "Engine", "Gearbox", "Exhaust",
];
