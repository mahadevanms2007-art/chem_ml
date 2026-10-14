import { useState } from 'react';
import {
  Database, Plus, Battery, QrCode, Search, CheckCircle, Trash2,
  Edit2, Eye, ShieldAlert, Cpu, ExternalLink, X
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import type { BatteryProfile, ThresholdConfig } from '../types';
import { DEFAULT_THRESHOLDS } from '../lib/classifier';

const PRELOADED_BATTERIES: BatteryProfile[] = [
  {
    id: 'BAT-18650-LGC2',
    label: 'LG MJ1 18650 High-Capacity',
    chemistry: 'lithium-ion',
    manufacturer: 'LG Chem',
    model: 'INR18650-MJ1',
    nominalVoltage_V: 3.6,
    ratedCapacity_mAh: 3500,
    firstInspectedAt: Date.now() - 86400000 * 5,
    notes: 'Stored in climate chamber. Batch 2026-Q1. Baseline OCV 4.12V.',
    thresholds: { ...DEFAULT_THRESHOLDS, ocvGood_V: 3.5, ocvWeak_V: 3.1 },
    baselineReadings: null,
    inspectionHistory: []
  },
  {
    id: 'BAT-AA-ALK-E91',
    label: 'Energizer Max Alkaline AA',
    chemistry: 'alkaline',
    manufacturer: 'Energizer',
    model: 'E91 Industrial',
    nominalVoltage_V: 1.5,
    ratedCapacity_mAh: 2800,
    firstInspectedAt: Date.now() - 86400000 * 2,
    notes: 'Shelf inventory screening. Inspect for potassium hydroxide seal weep.',
    thresholds: { ...DEFAULT_THRESHOLDS, ocvGood_V: 1.45, ocvWeak_V: 1.2 },
    baselineReadings: null,
    inspectionHistory: []
  },
  {
    id: 'BAT-NIMH-ENL-PRO',
    label: 'Panasonic Eneloop Pro BK-3HCCE',
    chemistry: 'NiMH',
    manufacturer: 'Panasonic',
    model: 'BK-3HCCE/4BE',
    nominalVoltage_V: 1.2,
    ratedCapacity_mAh: 2500,
    firstInspectedAt: Date.now() - 86400000 * 10,
    notes: 'Low self-discharge cell. Reusable test bench subject.',
    thresholds: { ...DEFAULT_THRESHOLDS, ocvGood_V: 1.25, ocvWeak_V: 1.1 },
    baselineReadings: null,
    inspectionHistory: []
  }
];

export default function BatteryRegistryPage() {
  const { batteries, addBattery, updateBattery, removeBattery, activeBatteryId, setActiveBatteryId } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterChemistry, setFilterChemistry] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [qrModalBattery, setQrModalBattery] = useState<BatteryProfile | null>(null);

  // Initial populate if empty
  const activeList = batteries.length > 0 ? batteries : PRELOADED_BATTERIES;

  // New Battery Form State
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newChem, setNewChem] = useState<BatteryProfile['chemistry']>('lithium-ion');
  const [newMfr, setNewMfr] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newNominalV, setNewNominalV] = useState(3.7);
  const [newCapacity, setNewCapacity] = useState(2500);
  const [newNotes, setNewNotes] = useState('');

  const handleCreateBattery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newLabel) return;

    const b: BatteryProfile = {
      id: newId.trim().toUpperCase(),
      label: newLabel.trim(),
      chemistry: newChem,
      manufacturer: newMfr.trim() || 'Generic',
      model: newModel.trim() || 'N/A',
      nominalVoltage_V: Number(newNominalV),
      ratedCapacity_mAh: Number(newCapacity),
      firstInspectedAt: Date.now(),
      notes: newNotes,
      thresholds: DEFAULT_THRESHOLDS,
      baselineReadings: null,
      inspectionHistory: []
    };

    addBattery(b);
    setActiveBatteryId(b.id);
    setIsAddModalOpen(false);

    // Reset
    setNewId('');
    setNewLabel('');
    setNewMfr('');
    setNewModel('');
    setNewNotes('');
  };

  const filteredBatteries = activeList.filter(b => {
    if (filterChemistry !== 'all' && b.chemistry !== filterChemistry) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return b.id.toLowerCase().includes(q) || b.label.toLowerCase().includes(q) || b.manufacturer.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">Battery Asset Registry & Chem-Profiles</h1>
              <p className="text-xs text-navy-400">Manage device tracking IDs, chemical thresholds, and test subject history</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setNewId(`BAT-${Math.floor(1000 + Math.random() * 9000)}`);
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 rounded-lg bg-teal-500 text-black font-semibold text-xs flex items-center gap-2 hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Register New Cell
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-navy-900/80 border border-navy-700/70 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-lg">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-navy-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, name, manufacturer..."
            className="w-full pl-9 pr-3 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-xs text-white placeholder-navy-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['all', 'lithium-ion', 'alkaline', 'NiMH', 'lead-acid', 'zinc-carbon'].map(chem => (
            <button
              key={chem}
              onClick={() => setFilterChemistry(chem)}
              className={`px-3 py-1 rounded-lg text-xs capitalize whitespace-nowrap transition-colors ${
                filterChemistry === chem
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium'
                  : 'bg-navy-950 text-navy-400 border border-navy-800 hover:text-white'
              }`}
            >
              {chem}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Battery Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBatteries.map(battery => {
          const isActive = activeBatteryId === battery.id;
          return (
            <div
              key={battery.id}
              className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                isActive
                  ? 'bg-cyan-950/20 border-cyan-500/60 shadow-cyan-950/40 shadow-lg ring-1 ring-cyan-500/30'
                  : 'bg-navy-900/80 border-navy-700/70 hover:border-navy-600'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-navy-950 border border-navy-800 text-cyan-400">
                      <Battery className="w-4 h-4" />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-white">{battery.label}</h2>
                      <span className="font-mono text-[11px] text-cyan-300 font-semibold">{battery.id}</span>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                      ACTIVE SUBJECT
                    </span>
                  ) : (
                    <button
                      onClick={() => setActiveBatteryId(battery.id)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-navy-950 text-navy-400 border border-navy-800 hover:text-white hover:border-cyan-500/50"
                    >
                      Set Active
                    </button>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-navy-950 rounded-lg border border-navy-800/80 font-mono">
                  <div>
                    <span className="text-navy-500 block">Chemistry:</span>
                    <span className="text-navy-200 capitalize">{battery.chemistry}</span>
                  </div>
                  <div>
                    <span className="text-navy-500 block">Nominal V:</span>
                    <span className="text-navy-200">{battery.nominalVoltage_V} V</span>
                  </div>
                  <div>
                    <span className="text-navy-500 block">Manufacturer:</span>
                    <span className="text-navy-200 truncate block">{battery.manufacturer}</span>
                  </div>
                  <div>
                    <span className="text-navy-500 block">Capacity:</span>
                    <span className="text-navy-200">{battery.ratedCapacity_mAh ?? 'N/A'} mAh</span>
                  </div>
                </div>

                {battery.notes && (
                  <p className="mt-3 text-xs text-navy-400 line-clamp-2 leading-relaxed">
                    {battery.notes}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-navy-800 flex items-center justify-between text-xs">
                <button
                  onClick={() => setQrModalBattery(battery)}
                  className="text-navy-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Asset Tag / QR
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeBattery(battery.id)}
                    className="text-navy-500 hover:text-rose-400 p-1"
                    title="Remove battery asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Battery Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBattery}
            className="bg-navy-900 border border-navy-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Battery className="w-4 h-4 text-cyan-400" />
                Register New Battery Asset
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-navy-400 hover:text-white p-1 rounded hover:bg-navy-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-navy-400 mb-1">Asset Serial Tag / ID *</label>
                  <input
                    type="text"
                    required
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="e.g. BAT-2026-004"
                    className="w-full px-3 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-navy-400 mb-1">Subject Nickname *</label>
                  <input
                    type="text"
                    required
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Test Unit 4A"
                    className="w-full px-3 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-navy-400 mb-1">Chemistry</label>
                  <select
                    value={newChem}
                    onChange={(e) => setNewChem(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-white capitalize"
                  >
                    <option value="lithium-ion">Lithium-ion (Li-ion)</option>
                    <option value="alkaline">Alkaline</option>
                    <option value="NiMH">Nickel-Metal Hydride (NiMH)</option>
                    <option value="lead-acid">Lead-Acid</option>
                    <option value="zinc-carbon">Zinc-Carbon</option>
                    <option value="other">Other / Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-navy-400 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={newMfr}
                    onChange={(e) => setNewMfr(e.target.value)}
                    placeholder="e.g. Samsung, Panasonic"
                    className="w-full px-3 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-navy-400 mb-1">Nominal Voltage (V)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newNominalV}
                    onChange={(e) => setNewNominalV(parseFloat(e.target.value))}
                    className="w-full px-3 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-navy-400 mb-1">Rated Capacity (mAh)</label>
                  <input
                    type="number"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(parseInt(e.target.value))}
                    className="w-full px-3 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-navy-400 mb-1">Notes / Batch Tracking</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Storage condition, initial visual notes..."
                  className="w-full px-3 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-navy-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-xs text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs shadow-lg"
              >
                Save & Set Active
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Asset QR / Barcode Modal */}
      {qrModalBattery && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-center animate-fade-in">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Asset Barcode & QR Tag</h3>
              <button onClick={() => setQrModalBattery(null)} className="text-navy-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-lg flex flex-col items-center justify-center space-y-2">
              {/* Simulated QR Code Canvas */}
              <div className="w-36 h-36 bg-navy-950 flex flex-col items-center justify-center p-2 rounded border-2 border-black">
                <div className="grid grid-cols-6 gap-1 w-full h-full p-1 bg-white">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={`${(i * 7 + 3) % 2 === 0 ? 'bg-black' : 'bg-transparent'} rounded-sm`}
                    />
                  ))}
                </div>
              </div>
              <span className="font-mono text-black font-bold text-xs tracking-wider">
                {qrModalBattery.id}
              </span>
            </div>

            <p className="text-[11px] text-navy-400">
              Scan this label at the test bench to immediately switch the telemetry logger to {qrModalBattery.label}.
            </p>

            <button
              onClick={() => setQrModalBattery(null)}
              className="w-full py-1.5 rounded-lg bg-navy-800 text-white text-xs hover:bg-navy-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
