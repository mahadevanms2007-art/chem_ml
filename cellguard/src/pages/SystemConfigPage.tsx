import { useState } from 'react';
import {
  Settings, Wifi, Cpu, Sliders, HardDrive, RotateCcw, CheckCircle,
  AlertTriangle, RefreshCw, Terminal, Download, Upload, Zap, Droplets,
  Thermometer, Shield
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { DEFAULT_THRESHOLDS } from '../lib/classifier';
import { pingEsp32 } from '../lib/hardware';
import type { CalibrationData, ThresholdConfig } from '../types';

export default function SystemConfigPage() {
  const {
    mode, setMode, esp32BaseUrl, setEsp32BaseUrl, pollIntervalMs, setPollIntervalMs,
    calibration, setCalibration, thresholds, setThresholds, latestReading,
    clearAlerts, readingHistory
  } = useAppStore();

  // Test ping state
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [pingResponse, setPingResponse] = useState<string | null>(null);

  // Calibration local states
  const [localShunt, setLocalShunt] = useState<string>(calibration.inaShuntOhm?.toString() ?? '0.1');
  const [localDryRef, setLocalDryRef] = useState<number>(calibration.yl83DryRef ?? 3800);
  const [localWetRef, setLocalWetRef] = useState<number>(calibration.yl83WetRef ?? 1200);
  const [localThreshold, setLocalThreshold] = useState<number>(calibration.yl83Threshold ?? 2000);

  // Threshold local states
  const [tState, setTState] = useState<ThresholdConfig>({ ...thresholds });
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const showBanner = (msg: string) => {
    setSaveBanner(msg);
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const handleTestPing = async () => {
    setPingStatus('testing');
    setPingResponse(null);
    try {
      const res = await pingEsp32(esp32BaseUrl);
      if (res.ok) {
        setPingStatus('success');
        setPingResponse(JSON.stringify(res.data, null, 2));
      } else {
        setPingStatus('failed');
        setPingResponse(res.error || 'Connection timed out or refused by host');
      }
    } catch (err: any) {
      setPingStatus('failed');
      setPingResponse(err.message || 'Network fetch failure');
    }
  };

  const handleCaptureDryRef = () => {
    if (latestReading?.yl83Raw != null) {
      const current = latestReading.yl83Raw;
      setLocalDryRef(current);
      setCalibration({ yl83DryRef: current, yl83CalibratedAt: Date.now() });
      showBanner(`Captured dry reference ADC: ${current}`);
    } else {
      showBanner('Cannot capture: No valid YL-83 ADC reading currently available.');
    }
  };

  const handleSaveCalibration = () => {
    const shunt = parseFloat(localShunt);
    setCalibration({
      inaShuntOhm: isNaN(shunt) || shunt <= 0 ? null : shunt,
      yl83DryRef: localDryRef,
      yl83WetRef: localWetRef,
      yl83Threshold: localThreshold,
      yl83CalibratedAt: Date.now()
    });
    showBanner('Sensor calibration parameters committed to local persistent storage.');
  };

  const handleSaveThresholds = () => {
    setThresholds(tState);
    showBanner('Classifier risk thresholds updated successfully.');
  };

  const handleResetThresholds = () => {
    setTState(DEFAULT_THRESHOLDS);
    setThresholds(DEFAULT_THRESHOLDS);
    showBanner('Thresholds reset to factory default limits.');
  };

  const handleExportBackup = () => {
    const backup = {
      exportDate: new Date().toISOString(),
      calibration,
      thresholds,
      esp32BaseUrl,
      pollIntervalMs,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `cellguard_config_backup_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">System Configuration & Transducer Calibration</h1>
              <p className="text-xs text-navy-400">ESP32 telemetry endpoint, shunt resistor values, baseline moisture references, and alarm limits</p>
            </div>
          </div>
        </div>

        {saveBanner && (
          <div className="px-3 py-1.5 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs flex items-center gap-2 animate-fade-in font-mono">
            <CheckCircle className="w-4 h-4 text-teal-400" />
            {saveBanner}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: ESP32 Hardware Network Interface */}
        <div className="bg-navy-900/80 border border-navy-700/70 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-navy-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Wifi className="w-4 h-4 text-cyan-400" />
              1. ESP32 Communication Interface
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-navy-950 text-cyan-300 border border-navy-800">
              {mode.toUpperCase()} MODE
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-navy-400 mb-1">Operating Mode Switch</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('live')}
                  className={`py-2 rounded-lg font-medium transition-colors border text-center ${
                    mode === 'live'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-950'
                      : 'bg-navy-950 text-navy-400 border-navy-800 hover:text-white'
                  }`}
                >
                  Live Hardware (ESP32)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('simulation')}
                  className={`py-2 rounded-lg font-medium transition-colors border text-center ${
                    mode === 'simulation'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-950'
                      : 'bg-navy-950 text-navy-400 border-navy-800 hover:text-white'
                  }`}
                >
                  Digital Simulation
                </button>
              </div>
            </div>

            <div>
              <label className="block text-navy-400 mb-1">ESP32 REST Endpoint / Base URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={esp32BaseUrl}
                  onChange={(e) => setEsp32BaseUrl(e.target.value)}
                  placeholder="http://192.168.4.1"
                  className="flex-1 px-3 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={pingStatus === 'testing'}
                  className="px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-700 hover:bg-navy-700 text-cyan-300 text-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  {pingStatus === 'testing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
                  Ping / Verify
                </button>
              </div>
              <p className="text-[11px] text-navy-500 mt-1">Default AP IP: 192.168.4.1 or Station IP on LAN (e.g. 192.168.1.150)</p>
            </div>

            <div>
              <label className="block text-navy-400 mb-1">Telemetry Polling Frequency</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="200"
                  max="3000"
                  step="100"
                  value={pollIntervalMs}
                  onChange={(e) => setPollIntervalMs(parseInt(e.target.value))}
                  className="flex-1 accent-cyan-400"
                />
                <span className="font-mono text-cyan-300 text-xs w-16 text-right">{pollIntervalMs} ms</span>
              </div>
            </div>

            {/* Diagnostic Ping Output Box */}
            {pingResponse && (
              <div className="mt-3 p-3 bg-black/50 border border-navy-800 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-navy-400 font-mono">Response Payload:</span>
                  <span className={`font-mono font-bold ${pingStatus === 'success' ? 'text-teal-400' : 'text-rose-400'}`}>
                    {pingStatus.toUpperCase()}
                  </span>
                </div>
                <pre className="font-mono text-[10px] text-navy-300 overflow-x-auto max-h-32 p-1.5 bg-navy-950/80 rounded">
                  {pingResponse}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Sensor Calibration Suite */}
        <div className="bg-navy-900/80 border border-navy-700/70 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-navy-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              2. Transducer Calibration Wizard
            </h2>
            <button
              onClick={handleSaveCalibration}
              className="px-3 py-1 rounded bg-teal-500 text-black font-semibold text-xs hover:bg-teal-400"
            >
              Commit Calibration
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* YL-83 Calibration */}
            <div className="p-3 bg-navy-950/70 border border-navy-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-white">YL-83 Moisture Tray Calibration</span>
                </div>
                <button
                  type="button"
                  onClick={handleCaptureDryRef}
                  className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] hover:bg-cyan-500/30 font-mono"
                >
                  Capture Live as Dry
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono">
                <div>
                  <span className="text-[10px] text-navy-400 block">Dry Ref ADC</span>
                  <input
                    type="number"
                    value={localDryRef}
                    onChange={(e) => setLocalDryRef(parseInt(e.target.value))}
                    className="w-full px-2 py-1 bg-navy-900 border border-navy-700 rounded text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-navy-400 block">Wet Ref ADC</span>
                  <input
                    type="number"
                    value={localWetRef}
                    onChange={(e) => setLocalWetRef(parseInt(e.target.value))}
                    className="w-full px-2 py-1 bg-navy-900 border border-navy-700 rounded text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-navy-400 block">Alarm Threshold</span>
                  <input
                    type="number"
                    value={localThreshold}
                    onChange={(e) => setLocalThreshold(parseInt(e.target.value))}
                    className="w-full px-2 py-1 bg-navy-900 border border-navy-700 rounded text-white"
                  />
                </div>
              </div>
            </div>

            {/* INA219 Shunt Calibration */}
            <div className="p-3 bg-navy-950/70 border border-navy-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-white">INA219/INA226 Shunt Resistor</span>
                </div>
                <span className="text-[10px] text-navy-400 font-mono">Default: 0.100 Ω (R100)</span>
              </div>

              <div>
                <label className="block text-[10px] text-navy-400 mb-1">Shunt Resistance (Ohms)</label>
                <input
                  type="text"
                  value={localShunt}
                  onChange={(e) => setLocalShunt(e.target.value)}
                  placeholder="0.1"
                  className="w-full px-3 py-1.5 bg-navy-900 border border-navy-700 rounded-lg text-white font-mono text-xs"
                />
                <p className="text-[10px] text-navy-500 mt-1">Leave empty or unset if current should not be computed.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Alarm Limits & Thresholds */}
        <div className="bg-navy-900/80 border border-navy-700/70 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-navy-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              3. Alarm Limits & Boundary Thresholds
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetThresholds}
                className="px-2.5 py-1 rounded bg-navy-950 text-navy-400 border border-navy-800 hover:text-white text-xs"
              >
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={handleSaveThresholds}
                className="px-3 py-1 rounded bg-teal-500 text-black font-semibold text-xs hover:bg-teal-400"
              >
                Save Limits
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-[10px] text-navy-400 block">OCV Good Voltage (V)</span>
              <input
                type="number"
                step="0.05"
                value={tState.ocvGood_V}
                onChange={(e) => setTState(prev => ({ ...prev, ocvGood_V: parseFloat(e.target.value) }))}
                className="w-full px-2.5 py-1 bg-navy-950 border border-navy-700 rounded text-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-navy-400 block">OCV Weak Voltage (V)</span>
              <input
                type="number"
                step="0.05"
                value={tState.ocvWeak_V}
                onChange={(e) => setTState(prev => ({ ...prev, ocvWeak_V: parseFloat(e.target.value) }))}
                className="w-full px-2.5 py-1 bg-navy-950 border border-navy-700 rounded text-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-navy-400 block">Wet Leak Score (0..1)</span>
              <input
                type="number"
                step="0.05"
                value={tState.wetLeak}
                onChange={(e) => setTState(prev => ({ ...prev, wetLeak: parseFloat(e.target.value) }))}
                className="w-full px-2.5 py-1 bg-navy-950 border border-navy-700 rounded text-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-navy-400 block">Wet Suspect Score (0..1)</span>
              <input
                type="number"
                step="0.05"
                value={tState.wetSuspect}
                onChange={(e) => setTState(prev => ({ ...prev, wetSuspect: parseFloat(e.target.value) }))}
                className="w-full px-2.5 py-1 bg-navy-950 border border-navy-700 rounded text-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-navy-400 block">Max Ambient Temp (°C)</span>
              <input
                type="number"
                step="1"
                value={tState.tempHigh_C}
                onChange={(e) => setTState(prev => ({ ...prev, tempHigh_C: parseFloat(e.target.value) }))}
                className="w-full px-2.5 py-1 bg-navy-950 border border-navy-700 rounded text-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-navy-400 block">Max Ambient RH (%)</span>
              <input
                type="number"
                step="1"
                value={tState.humidityHigh}
                onChange={(e) => setTState(prev => ({ ...prev, humidityHigh: parseFloat(e.target.value) }))}
                className="w-full px-2.5 py-1 bg-navy-950 border border-navy-700 rounded text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Hardware Pinout Diagram & Guide */}
        <div className="bg-navy-900/80 border border-navy-700/70 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-navy-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              4. ESP32 Physical Pinout Quick Guide
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-navy-800 text-[10px] uppercase text-navy-400 bg-navy-950/70">
                  <th className="py-2 px-3">Subsystem</th>
                  <th className="py-2 px-3">Sensor Pin</th>
                  <th className="py-2 px-3">ESP32 Pin</th>
                  <th className="py-2 px-3">Protocol / Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60 text-[11px]">
                <tr>
                  <td className="py-2 px-3 text-white font-medium">INA219 / INA226</td>
                  <td className="py-2 px-3 text-cyan-300">SDA / SCL</td>
                  <td className="py-2 px-3 text-amber-300">GPIO 21 / GPIO 22</td>
                  <td className="py-2 px-3 text-navy-400">I2C (0x40 standard)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-white font-medium">YL-83 Rain Plate</td>
                  <td className="py-2 px-3 text-cyan-300">A0 (Analog Out)</td>
                  <td className="py-2 px-3 text-amber-300">GPIO 34 (ADC1_CH6)</td>
                  <td className="py-2 px-3 text-navy-400">12-bit ADC (0..4095)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-white font-medium">DHT22 / DHT11</td>
                  <td className="py-2 px-3 text-cyan-300">DATA</td>
                  <td className="py-2 px-3 text-amber-300">GPIO 4 (with 10k pullup)</td>
                  <td className="py-2 px-3 text-navy-400">1-Wire Digital</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-white font-medium">Power Rails</td>
                  <td className="py-2 px-3 text-cyan-300">VCC / GND</td>
                  <td className="py-2 px-3 text-amber-300">3.3V / GND</td>
                  <td className="py-2 px-3 text-navy-400">Common Ground Mandatory</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-navy-950/80 rounded-lg border border-navy-800 text-[11px] text-navy-400 flex items-center justify-between">
            <span>Backup or restore all system presets & calibration:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-700 text-xs text-white flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Backup JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
