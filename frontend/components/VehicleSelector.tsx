"use client";
import { useState } from "react";
import { MAKES, getModels, getYears } from "@/lib/vehicles";

interface Vehicle {
  make: string;
  model: string;
  year: number | null;
  fuel_type: string;
}

interface Props {
  onSelect: (v: Vehicle) => void;
}

const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "Any"];

export default function VehicleSelector({ onSelect }: Props) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [fuel, setFuel] = useState("Any");

  const models = make ? getModels(make) : [];
  const years = make && model ? getYears(make, model) : [];

  const handleMake = (v: string) => { setMake(v); setModel(""); setYear(null); };
  const handleModel = (v: string) => { setModel(v); setYear(null); };

  const handleConfirm = () => {
    if (!make || !model) return;
    onSelect({ make, model, year, fuel_type: fuel });
  };

  const sel = "bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:border-blue-500";

  return (
    <div className="space-y-3">
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
            {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <button
        onClick={handleConfirm}
        disabled={!make || !model}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-2 rounded-lg transition"
      >
        Confirm Vehicle
      </button>
    </div>
  );
}
