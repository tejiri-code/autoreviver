"use client";
import { useState } from "react";
import { MAKES, POPULAR_VEHICLES, getEngineSizes, getFuels, getModels, getVehicle, getYears } from "@/lib/vehicles";

interface Vehicle {
  make: string;
  model: string;
  year: number | null;
  fuel_type: string;
  engine_size?: string;
}

interface Props {
  onSelect: (v: Vehicle) => void;
  buttonLabel?: string;
}

export default function VehicleSelector({ onSelect, buttonLabel = "Confirm Vehicle" }: Props) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [fuel, setFuel] = useState("Any");
  const [engineSize, setEngineSize] = useState("Any");

  const models = make ? getModels(make) : [];
  const years = make && model ? getYears(make, model) : [];
  const fuels = make && model ? getFuels(make, model) : ["Any"];
  const engineSizes = make && model ? getEngineSizes(make, model) : ["Any"];
  const selectedVehicle = make && model ? getVehicle(make, model) : null;

  const handleMake = (v: string) => { setMake(v); setModel(""); setYear(null); setFuel("Any"); setEngineSize("Any"); };
  const handleModel = (v: string) => { setModel(v); setYear(null); setFuel("Any"); setEngineSize("Any"); };
  const selectVehicle = (v: { make: string; model: string; years: number[] }) => {
    setMake(v.make);
    setModel(v.model);
    setYear(v.years.at(-1) ?? null);
    setFuel("Any");
    setEngineSize("Any");
  };

  const handleConfirm = () => {
    if (!make || !model) return;
    onSelect({ make, model, year, fuel_type: fuel, engine_size: engineSize });
  };

  const sel = "bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:border-blue-500";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {POPULAR_VEHICLES.map((vehicle) => (
          <button
            key={`${vehicle.make}-${vehicle.model}`}
            type="button"
            onClick={() => selectVehicle(vehicle)}
            className="h-20 rounded-lg border border-gray-700 bg-gray-800 bg-cover bg-center overflow-hidden text-left transition hover:border-blue-500"
            style={{ backgroundImage: `linear-gradient(180deg, rgba(3,7,18,.08), rgba(3,7,18,.84)), url(${vehicle.vehicle_card_image})` }}
          >
            <span className="flex h-full items-end p-2 text-xs font-semibold text-white">
              {vehicle.make} {vehicle.model}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Make</label>
          <select className={sel} value={make} onChange={e => handleMake(e.target.value)}>
            <option value="">Select make</option>
            {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Model</label>
          <select className={sel} value={model} onChange={e => handleModel(e.target.value)} disabled={!make}>
            <option value="">Select model</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Year</label>
          <select className={sel} value={year ?? ""} onChange={e => setYear(Number(e.target.value))} disabled={!model}>
            <option value="">Any year</option>
            {[...years].reverse().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Fuel Type</label>
          <select className={sel} value={fuel} onChange={e => setFuel(e.target.value)}>
            {fuels.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-400 mb-1 block">Engine Size</label>
          <select className={sel} value={engineSize} onChange={e => setEngineSize(e.target.value)} disabled={!model}>
            {engineSizes.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
      </div>
      {selectedVehicle && (
        <p className="text-xs text-gray-500">
          Selector fields mirror GOV.UK vehicle licensing variables: make, generic model, body type, fuel, year, and engine size band.
        </p>
      )}
      <button
        onClick={handleConfirm}
        disabled={!make || !model}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-2 rounded-lg transition"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
