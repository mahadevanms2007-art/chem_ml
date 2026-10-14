import { useAppStore } from '../stores/appStore';
import TelemetryCharts from '../components/TelemetryCharts';
import SensorCard from '../components/SensorCard';
import { Activity, Download } from 'lucide-react';

function exportCSV(history: ReturnType<typeof useAppStore.getState>['readingHistory']) {
  const header = 'timestamp,source,busVoltage_V,cellVoltage_V,shuntVoltage_mV,current_mA,yl83Raw,wetScore,temperature_C,humidity_pct,camScore';
  const rows = history.map(r => [
    new Date(r.timestamp).toISOString(), r.source,
    r.busVoltage_V ?? '', r.cellVoltage_V ?? '', r.shuntVoltage_mV ?? '',
    r.current_mA ?? '', r.yl83Raw ?? '', r.wetScore ?? '',
    r.temperature_C ?? '', r.humidity_pct ?? '', r.camScore ?? '',
  ].join(','));
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cellguard-telemetry-${Date.now()}.csv`;
  a.click();
}

export default function LiveTelemetryPage() {
  const { latestReading: r, readingHistory, mode } = useAppStore();
  const isLive = mode === 'live';

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-cyan flex items-center gap-2">
            <Activity size={16} /> Live Telemetry
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--steel)' }}>
            {isLive ? 'Real-time sensor readings from ESP32.' : '[SIMULATION] Virtual sensor data — not from hardware.'}
          </p>
        </div>
        <button onClick={() => exportCSV(readingHistory)} className="btn-secondary text-xs">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Sensor readings grid */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        <SensorCard label="CELL VOLTAGE" value={r?.cellVoltage_V?.toFixed(3) ?? '—'} unit="V" validity={r?.inaValid} color="var(--cyan)" sub={`Bus: ${r?.busVoltage_V?.toFixed(3) ?? '—'}V`} />
        <SensorCard label="SHUNT" value={r?.shuntVoltage_mV?.toFixed(2) ?? '—'} unit="mV" validity={r?.inaValid} color="#34D399" />
        <SensorCard label="CURRENT" value={r?.current_mA !== null && r?.current_mA !== undefined ? r.current_mA.toFixed(1) : '—'} unit="mA" validity={r?.inaValid} color="#A78BFA" sub={r?.current_mA === null ? 'Uncalibrated — shunt not set' : undefined} />
        <SensorCard label="WET SCORE" value={r?.wetScore !== null && r?.wetScore !== undefined ? (r.wetScore * 100).toFixed(1) : '—'} unit="%" validity={r?.moistureValid} color="var(--warn)" sub={`ADC: ${r?.yl83Raw?.toFixed(0) ?? '—'}`} />
        <SensorCard label="HUMIDITY" value={r?.humidity_pct?.toFixed(1) ?? '—'} unit="%" validity={r?.dhtValid} color="#38BDF8" />
        <SensorCard label="TEMPERATURE" value={r?.temperature_C?.toFixed(1) ?? '—'} unit="°C" validity={r?.dhtValid} color="#F97316" />
      </div>

      {/* Live reading details */}
      <div className="panel-cyan p-3">
        <div className="label-muted mb-2">LATEST READING — FULL DETAIL</div>
        {r ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs font-mono">
            {([
              ['Timestamp', new Date(r.timestamp).toISOString()],
              ['Source', r.source.toUpperCase()],
              ['INA Validity', r.inaValid],
              ['Bus Voltage', r.busVoltage_V !== null ? `${r.busVoltage_V.toFixed(3)} V` : 'N/A'],
              ['Shunt Voltage', r.shuntVoltage_mV !== null ? `${r.shuntVoltage_mV.toFixed(3)} mV` : 'N/A'],
              ['Cell Voltage', r.cellVoltage_V !== null ? `${r.cellVoltage_V.toFixed(3)} V` : 'N/A'],
              ['Current', r.current_mA !== null ? `${r.current_mA.toFixed(2)} mA` : 'UNCALIBRATED'],
              ['YL-83 Raw', r.yl83Raw !== null ? r.yl83Raw.toFixed(0) : 'N/A'],
              ['Wet Score', r.wetScore !== null ? (r.wetScore * 100).toFixed(2) + ' %' : 'N/A'],
              ['Moisture Valid', r.moistureValid],
              ['Temperature', r.temperature_C !== null ? `${r.temperature_C.toFixed(1)} °C` : 'N/A'],
              ['Humidity', r.humidity_pct !== null ? `${r.humidity_pct.toFixed(1)} %` : 'N/A'],
              ['DHT Valid', r.dhtValid],
              ['Cam Score', r.camScore !== null ? `${r.camScore}/100` : 'N/A'],
              ['Uptime', r.uptime_s !== null ? `${r.uptime_s}s` : 'N/A'],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '2px' }}>
                <span style={{ color: 'var(--steel)' }}>{k}</span>
                <span style={{ color: '#CBD5E1' }}>{v}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs" style={{ color: 'var(--steel)' }}>No reading yet.</div>
        )}
      </div>

      {/* Charts */}
      <div>
        <div className="label-muted mb-2">TIME-SERIES CHARTS ({readingHistory.length} points)</div>
        <TelemetryCharts compact={false} />
      </div>
    </div>
  );
}
