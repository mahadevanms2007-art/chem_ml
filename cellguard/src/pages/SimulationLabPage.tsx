import { useState, useEffect } from 'react';
import {
  FlaskConical, Play, Pause, RotateCcw, Sliders, Zap, Droplets,
  Thermometer, Cpu, AlertTriangle, ShieldCheck, CheckCircle, Radio
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { SCENARIOS } from '../lib/simulation';
import { classifyReading } from '../lib/classifier';
import AssessmentBadge from '../components/AssessmentBadge';
import type { SensorReading, SensorValidity } from '../types';

export default function SimulationLabPage() {
  const { pushReading, calibration, thresholds, setMode } = useAppStore();

  // Selected scenario
  const [activeScenarioId, setActiveScenarioId] = useState<string>('normal');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [noiseLevel, setNoiseLevel] = useState<number>(0.02); // 2% jitter

  // Virtual sensor controls
  const [yl83Raw, setYl83Raw] = useState<number>(3750);
  const [busVoltage, setBusVoltage] = useState<number>(3.85);
  const [shuntDrop, setShuntDrop] = useState<number>(1.2);
  const [tempC, setTempC] = useState<number>(24.5);
  const [humidity, setHumidity] = useState<number>(45.0);
  const [camScore, setCamScore] = useState<number>(5.0);

  // Sensor fault overrides
  const [inaFault, setInaFault] = useState<boolean>(false);
  const [dhtFault, setDhtFault] = useState<boolean>(false);
  const [yl83Fault, setYl83Fault] = useState<boolean>(false);

  // Load preset scenario values
  const applyScenario = (id: string) => {
    setActiveScenarioId(id);
    const scen = SCENARIOS.find(s => s.id === id);
    if (!scen) return;
    const v = scen.virtualSensors;
    if (v.yl83Raw != null) setYl83Raw(v.yl83Raw);
    if (v.busVoltage_V != null) setBusVoltage(v.busVoltage_V);
    if (v.shuntVoltage_mV != null) setShuntDrop(v.shuntVoltage_mV);
    if (v.temperature_C != null) setTempC(v.temperature_C);
    if (v.humidity_pct != null) setHumidity(v.humidity_pct);
    if (v.camScore != null) setCamScore(v.camScore);

    setInaFault(v.inaValid === 'fault' || v.inaValid === 'unavailable');
    setDhtFault(v.dhtValid === 'fault' || v.dhtValid === 'unavailable');
    setYl83Fault(v.moistureValid === 'fault' || v.moistureValid === 'unavailable');
  };

  // Compute live virtual reading
  const computeVirtualReading = (): SensorReading => {
    // Apply jitter if playing
    const jitter = (val: number, amp: number) => {
      if (!isPlaying || noiseLevel === 0) return val;
      return val + (Math.random() - 0.5) * amp * noiseLevel * 2;
    };

    const finalYl83 = yl83Fault ? null : Math.max(0, Math.min(4095, Math.round(jitter(yl83Raw, 100))));
    const finalBus = inaFault ? null : Math.max(0, parseFloat(jitter(busVoltage, 0.1).toFixed(3)));
    const finalShunt = inaFault ? null : parseFloat(jitter(shuntDrop, 1.0).toFixed(2));
    const finalTemp = dhtFault ? null : parseFloat(jitter(tempC, 1.0).toFixed(1));
    const finalHum = dhtFault ? null : Math.max(0, Math.min(100, parseFloat(jitter(humidity, 2.0).toFixed(1))));
    const finalCam = Math.max(0, Math.min(100, parseFloat(jitter(camScore, 5.0).toFixed(1))));

    // Wet score calculation
    let wetScore: number | null = null;
    if (finalYl83 != null) {
      const dryRef = calibration.yl83DryRef || 3800;
      const wetRef = calibration.yl83WetRef || 1200;
      wetScore = Math.max(0, Math.min(1, (dryRef - finalYl83) / (dryRef - wetRef)));
    }

    return {
      timestamp: Date.now(),
      source: 'simulated',
      busVoltage_V: finalBus,
      shuntVoltage_mV: finalShunt,
      cellVoltage_V: finalBus,
      current_mA: finalShunt != null && calibration.inaShuntOhm ? (finalShunt / calibration.inaShuntOhm) : null,
      inaValid: inaFault ? 'fault' : 'valid',
      yl83Raw: finalYl83,
      wetScore: wetScore,
      moistureValid: yl83Fault ? 'fault' : 'valid',
      temperature_C: finalTemp,
      humidity_pct: finalHum,
      dhtValid: dhtFault ? 'fault' : 'valid',
      camScore: finalCam,
      uptime_s: 3600,
      activeWarnings: []
    };
  };

  const currentSimReading = computeVirtualReading();
  const simAssessment = classifyReading(currentSimReading, calibration, thresholds);

  // Interval loop pushing virtual readings to app store
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const reading = computeVirtualReading();
      pushReading(reading);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, yl83Raw, busVoltage, shuntDrop, tempC, humidity, camScore, inaFault, dhtFault, yl83Fault, noiseLevel]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">Simulation Lab & Hardware Testing Sandbox</h1>
              <p className="text-xs text-navy-400">Inject fault scenarios, manipulate virtual physical variables, and evaluate classifier boundaries</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 shadow-lg transition-colors ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-teal-500 text-black hover:bg-teal-400'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause Generator' : 'Run Simulation'}
          </button>
          <button
            onClick={() => applyScenario('normal')}
            className="p-2 rounded-lg bg-navy-900 border border-navy-700 text-navy-300 hover:text-white hover:border-cyan-500/50"
            title="Reset to Normal Preset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Scenarios Gallery */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-navy-400 uppercase tracking-wider flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          Preconfigured Battery Degradation & Failure Scenarios
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SCENARIOS.map(s => {
            const isSelected = activeScenarioId === s.id;
            return (
              <div
                key={s.id}
                onClick={() => applyScenario(s.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-cyan-950/40 shadow-lg'
                    : 'bg-navy-900/80 border-navy-700/70 hover:border-navy-600 hover:bg-navy-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-xs text-white">{s.name}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                    s.expectedLabel === 'NORMAL' ? 'bg-teal-500/20 text-teal-300' :
                    s.expectedLabel === 'LIQUID_DETECTED' ? 'bg-rose-500/20 text-rose-300' :
                    s.expectedLabel === 'ELECTRICAL_ANOMALY' ? 'bg-amber-500/20 text-amber-300' :
                    s.expectedLabel === 'SUSPECTED_LEAK' ? 'bg-rose-500/20 text-rose-300' :
                    'bg-navy-800 text-navy-300'
                  }`}>
                    {s.expectedLabel}
                  </span>
                </div>
                <p className="text-[11px] text-navy-400 leading-relaxed">{s.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Sandbox: Sliders vs Live Classification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Virtual Sensor Adjustments */}
        <div className="lg:col-span-7 bg-navy-900/80 border border-navy-700/70 rounded-xl p-5 shadow-lg space-y-5">
          <div className="flex items-center justify-between border-b border-navy-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Live Virtual Transducer Controls
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-navy-400">Signal Jitter:</span>
              <input
                type="range"
                min="0"
                max="0.1"
                step="0.01"
                value={noiseLevel}
                onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                className="w-20 accent-cyan-400"
              />
              <span className="text-[11px] font-mono text-cyan-300 w-8">{(noiseLevel * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* YL-83 Raw ADC */}
            <div className="p-3 bg-navy-950/70 rounded-lg border border-navy-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-white">YL-83 Resistive Moisture Tray (ADC 0..4095)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setYl83Fault(!yl83Fault)}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      yl83Fault ? 'bg-rose-500 text-white font-bold' : 'bg-navy-800 text-navy-400 hover:text-white'
                    }`}
                  >
                    {yl83Fault ? 'FAULT INJECTED' : 'Inject Fault'}
                  </button>
                  <span className="font-mono text-xs font-bold text-cyan-300">{yl83Fault ? 'ERR' : yl83Raw}</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="4095"
                step="25"
                disabled={yl83Fault}
                value={yl83Raw}
                onChange={(e) => setYl83Raw(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-navy-500">
                <span>0 (Pure Conduction / Flooded)</span>
                <span>2000 (Threshold)</span>
                <span>4095 (Bone Dry Air)</span>
              </div>
            </div>

            {/* Bus Voltage */}
            <div className="p-3 bg-navy-950/70 rounded-lg border border-navy-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-white">INA219 Cell / Bus Potential (0.0 .. 5.0 V)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInaFault(!inaFault)}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      inaFault ? 'bg-rose-500 text-white font-bold' : 'bg-navy-800 text-navy-400 hover:text-white'
                    }`}
                  >
                    {inaFault ? 'FAULT INJECTED' : 'Inject Fault'}
                  </button>
                  <span className="font-mono text-xs font-bold text-amber-300">{inaFault ? 'ERR' : `${busVoltage.toFixed(3)} V`}</span>
                </div>
              </div>
              <input
                type="range"
                min="0.0"
                max="5.0"
                step="0.02"
                disabled={inaFault}
                value={busVoltage}
                onChange={(e) => setBusVoltage(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-navy-500">
                <span>0.00 V (Dead / Shorted)</span>
                <span>3.00 V (Discharged)</span>
                <span>3.85 V (Nominal)</span>
                <span>4.20 V (Full)</span>
              </div>
            </div>

            {/* Shunt Drop */}
            <div className="p-3 bg-navy-950/70 rounded-lg border border-navy-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-white">INA219 Shunt Drop (-20 .. 100 mV)</span>
                </div>
                <span className="font-mono text-xs font-bold text-purple-300">{inaFault ? 'ERR' : `${shuntDrop.toFixed(1)} mV`}</span>
              </div>
              <input
                type="range"
                min="-20.0"
                max="100.0"
                step="0.5"
                disabled={inaFault}
                value={shuntDrop}
                onChange={(e) => setShuntDrop(parseFloat(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>

            {/* DHT22 Temp & Humidity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-navy-950/70 rounded-lg border border-navy-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-semibold text-white">Temperature</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-rose-300">{dhtFault ? 'ERR' : `${tempC.toFixed(1)} °C`}</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="65"
                  step="0.5"
                  disabled={dhtFault}
                  value={tempC}
                  onChange={(e) => setTempC(parseFloat(e.target.value))}
                  className="w-full accent-rose-400"
                />
              </div>

              <div className="p-3 bg-navy-950/70 rounded-lg border border-navy-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-white">Ambient RH %</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-cyan-300">{dhtFault ? 'ERR' : `${humidity.toFixed(1)} %`}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  disabled={dhtFault}
                  value={humidity}
                  onChange={(e) => setHumidity(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            {/* Camera Score */}
            <div className="p-3 bg-navy-950/70 rounded-lg border border-navy-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Optical Surface Discoloration (0..100)</span>
                <span className="font-mono text-xs font-bold text-teal-300">{camScore.toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={camScore}
                onChange={(e) => setCamScore(parseInt(e.target.value))}
                className="w-full accent-teal-400"
              />
            </div>
          </div>
        </div>

        {/* Real-time Classifier Response Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-navy-900/80 border border-navy-700/70 rounded-xl p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Live Evaluation of Injected Frame
            </h2>

            <AssessmentBadge assessment={simAssessment} />

            <div className="p-3 bg-navy-950/90 rounded-lg border border-navy-800 space-y-2">
              <h3 className="text-xs font-mono uppercase text-navy-400">Active Rule Trigger State</h3>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {simAssessment.evidenceItems.map((e, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-navy-900">
                    <span className="text-navy-300">{e.label}</span>
                    <span className={`font-mono text-[11px] ${e.triggered ? 'text-rose-400 font-bold' : 'text-teal-400'}`}>
                      {e.triggered ? 'TRIGGERED' : 'OK'} ({e.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
