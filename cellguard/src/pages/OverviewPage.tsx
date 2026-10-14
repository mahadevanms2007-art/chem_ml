import { Suspense } from 'react';
import {
  Activity, Zap, Droplets, Thermometer, Cpu, AlertTriangle,
  Battery, Camera, Clock, TrendingUp, WifiOff, PlayCircle,
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import SensorCard from '../components/SensorCard';
import AssessmentBadge from '../components/AssessmentBadge';
import TelemetryCharts from '../components/TelemetryCharts';
import Battery3D from '../3d/Battery3D';

function StatItem({ label, value, icon: Icon, color = 'var(--steel)' }: {
  label: string; value: string | number; icon: React.ElementType; color?: string;
}) {
  return (
    <div className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="w-6 h-6 flex items-center justify-center rounded" style={{ background: `${color}18` }}>
        <Icon size={13} style={{ color }} />
      </div>
      <span className="text-xs flex-1" style={{ color: 'var(--steel)' }}>{label}</span>
      <span className="text-xs font-mono font-semibold" style={{ color: '#CBD5E1' }}>{value}</span>
    </div>
  );
}

function AlertItem({ msg, severity, ts, source }: {
  msg: string; severity: string; ts: number; source: string;
}) {
  const color = severity === 'critical' ? 'var(--danger)' : severity === 'warning' ? 'var(--warn)' : 'var(--steel)';
  return (
    <div className="flex items-start gap-2 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <AlertTriangle size={11} style={{ color, marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs truncate" style={{ color: '#CBD5E1' }}>{msg}</div>
        <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--steel)', fontSize: '9px' }}>
          {new Date(ts).toLocaleTimeString()} · {source.toUpperCase()}
        </div>
      </div>
      <div
        className="text-xs px-1.5 py-0.5 rounded shrink-0"
        style={{ background: `${color}18`, color, fontSize: '9px' }}
      >
        {severity.toUpperCase()}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const {
    latestReading, latestAssessment, mode, hardwareStatus,
    alerts, batteries, sessions, readingHistory, setMode,
  } = useAppStore();

  const r = latestReading;
  const liquidEvents = alerts.filter(a => a.evidenceCategory === 'liquid').length;
  const electricalEvents = alerts.filter(a => a.evidenceCategory === 'electrical').length;
  const sensorFaults = alerts.filter(a => a.evidenceCategory === 'sensor_reliability').length;
  const recentAlerts = alerts.slice(0, 6);

  const isLive = mode === 'live';
  const connected = hardwareStatus.connected;

  // Disconnected state in live mode
  if (isLive && !connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-full" style={{ background: 'rgba(74,101,128,0.15)', border: '1px solid rgba(74,101,128,0.3)' }}>
          <WifiOff size={28} style={{ color: 'var(--steel)' }} />
        </div>
        <h2 className="text-lg font-bold">ESP32 Not Connected</h2>
        <p className="text-sm text-center max-w-md" style={{ color: 'var(--steel)' }}>
          No connection to ESP32 hardware. Go to <strong>System Configuration</strong> to enter the ESP32 IP address
          and connect, or switch to Simulation Mode for a demonstration.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setMode('simulation')} className="btn-secondary">
            <PlayCircle size={15} /> Enter Simulation Mode
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Simulation banner */}
      {mode === 'simulation' && (
        <div className="sim-banner mx-4 mt-3 mb-1">
          <Zap size={12} />
          SIMULATION MODE — All readings are virtual and clearly labelled. No hardware data is being used.
        </div>
      )}

      <div className="flex flex-1 gap-3 p-3 overflow-hidden min-h-0">

        {/* ── LEFT COLUMN — System Stats ── */}
        <div className="flex flex-col gap-3 shrink-0" style={{ width: '200px' }}>
          <div className="panel-cyan p-3">
            <div className="label-muted mb-2">SYSTEM STATISTICS</div>
            <StatItem label="Battery Profiles" value={batteries.length} icon={Battery} color="var(--cyan)" />
            <StatItem label="Sessions Recorded" value={sessions.length} icon={Clock} color="#A78BFA" />
            <StatItem label="Liquid Events" value={liquidEvents} icon={Droplets} color="var(--warn)" />
            <StatItem label="Electrical Alerts" value={electricalEvents} icon={Zap} color="#60A5FA" />
            <StatItem label="Sensor Faults" value={sensorFaults} icon={Cpu} color="var(--danger)" />
            <StatItem label="Data Points" value={readingHistory.length} icon={TrendingUp} color="var(--good)" />
            <StatItem label="Total Alerts" value={alerts.length} icon={AlertTriangle} color="var(--warn)" />
          </div>

          {/* Sensor health */}
          <div className="panel-cyan p-3">
            <div className="label-muted mb-2">SENSOR HEALTH</div>
            {[
              { label: 'INA219', valid: r?.inaValid, color: 'var(--cyan)' },
              { label: 'YL-83', valid: r?.moistureValid, color: 'var(--warn)' },
              { label: 'DHT22', valid: r?.dhtValid, color: '#60A5FA' },
            ].map(({ label, valid, color }) => (
              <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="text-xs font-mono" style={{ color: 'var(--steel)' }}>{label}</span>
                <span
                  className="text-xs font-semibold"
                  style={{
                    color: valid === 'valid' ? 'var(--good)' : valid === 'stale' ? 'var(--warn)' : 'var(--danger)',
                  }}
                >
                  {valid?.toUpperCase() ?? 'N/A'}
                </span>
              </div>
            ))}
          </div>

          {/* Recent alerts */}
          <div className="panel-cyan p-3 flex-1 overflow-y-auto">
            <div className="label-muted mb-2">RECENT ALERTS</div>
            {recentAlerts.length === 0 ? (
              <div className="text-xs" style={{ color: 'var(--steel)' }}>No alerts yet.</div>
            ) : recentAlerts.map(a => (
              <AlertItem key={a.id} msg={a.message} severity={a.severity} ts={a.timestamp} source={a.source} />
            ))}
          </div>
        </div>

        {/* ── CENTER — 3D Twin + Assessment ── */}
        <div className="flex flex-col flex-1 gap-3 min-w-0">
          {/* Sensor cards row */}
          <div className="grid grid-cols-5 gap-2 shrink-0">
            <SensorCard
              label="CELL VOLTAGE"
              value={r?.cellVoltage_V?.toFixed(3) ?? '—'}
              unit="V"
              validity={r?.inaValid}
              color="var(--cyan)"
              sub={r?.busVoltage_V !== null && r?.busVoltage_V !== undefined ? `Bus: ${r.busVoltage_V.toFixed(3)}V` : undefined}
            />
            <SensorCard
              label="WET SCORE"
              value={r?.wetScore !== null && r?.wetScore !== undefined ? (r.wetScore * 100).toFixed(1) : '—'}
              unit="%"
              validity={r?.moistureValid}
              color={r?.wetScore !== null && r?.wetScore !== undefined && r.wetScore > 0.25 ? 'var(--danger)' : r?.wetScore !== null && r?.wetScore !== undefined && r.wetScore > 0.10 ? 'var(--warn)' : 'var(--good)'}
              sub={r?.yl83Raw !== null && r?.yl83Raw !== undefined ? `YL-83 raw: ${r.yl83Raw.toFixed(0)}` : undefined}
            />
            <SensorCard
              label="HUMIDITY"
              value={r?.humidity_pct?.toFixed(1) ?? '—'}
              unit="%"
              validity={r?.dhtValid}
              color="#38BDF8"
            />
            <SensorCard
              label="TEMPERATURE"
              value={r?.temperature_C?.toFixed(1) ?? '—'}
              unit="°C"
              validity={r?.dhtValid}
              color="#F97316"
            />
            <SensorCard
              label="CURRENT"
              value={r?.current_mA !== null && r?.current_mA !== undefined ? r.current_mA.toFixed(1) : '—'}
              unit="mA"
              validity={r?.inaValid}
              color="#A78BFA"
              sub={r?.current_mA === null ? 'Uncalibrated' : undefined}
            />
          </div>

          {/* 3D Model */}
          <div className="flex-1 min-h-0">
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center panel-cyan">
                <div className="text-sm" style={{ color: 'var(--steel)' }}>Loading 3D model…</div>
              </div>
            }>
              <Battery3D height={280} showControls={true} />
            </Suspense>
          </div>

          {/* Assessment */}
          <div className="shrink-0">
            <AssessmentBadge assessment={latestAssessment} compact={true} />
          </div>
        </div>

        {/* ── RIGHT COLUMN — Intelligence ── */}
        <div className="flex flex-col gap-3 shrink-0 overflow-y-auto" style={{ width: '220px' }}>
          <div className="panel-cyan p-3">
            <div className="label-muted mb-2">VOLTAGE DEVIATIONS</div>
            {readingHistory.slice(-8).reverse().map((rd, i) => {
              const v = rd.cellVoltage_V ?? rd.busVoltage_V;
              if (!v) return null;
              const dev = latestReading?.cellVoltage_V ? Math.abs(v - latestReading.cellVoltage_V) : 0;
              return (
                <div key={i} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span className="text-xs font-mono" style={{ color: 'var(--steel)', fontSize: '9px' }}>
                    {new Date(rd.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="text-xs font-mono" style={{ color: v < 1.25 ? 'var(--danger)' : v < 1.45 ? 'var(--warn)' : 'var(--good)' }}>
                    {v.toFixed(3)}V
                  </span>
                </div>
              );
            })}
          </div>

          <div className="panel-cyan p-3">
            <div className="label-muted mb-2">ANOMALOUS SESSIONS</div>
            {sessions.slice(0, 5).map(s => (
              <div key={s.id} className="py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono" style={{ color: 'var(--steel)', fontSize: '9px' }}>
                    {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`text-xs font-mono font-semibold ${s.anomalyScore > 50 ? 'text-danger' : s.anomalyScore > 20 ? 'text-warn' : 'text-good'}`}>
                    {s.anomalyScore}/100
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--steel)', fontSize: '9px' }}>
                  {s.source.toUpperCase()} · {s.readings.length} pts
                </div>
              </div>
            ))}
            {sessions.length === 0 && <div className="text-xs" style={{ color: 'var(--steel)' }}>No sessions yet.</div>}
          </div>

          <div className="panel-cyan p-3">
            <div className="label-muted mb-2">MOISTURE READINGS</div>
            {readingHistory.slice(-8).reverse().map((rd, i) => {
              const ws = rd.wetScore;
              if (ws === null || ws === undefined) return null;
              return (
                <div key={i} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span className="text-xs font-mono" style={{ color: 'var(--steel)', fontSize: '9px' }}>
                    {new Date(rd.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="text-xs font-mono" style={{ color: ws > 0.25 ? 'var(--danger)' : ws > 0.1 ? 'var(--warn)' : 'var(--good)' }}>
                    {(ws * 100).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── BOTTOM — Charts ── */}
      <div className="shrink-0 px-3 pb-3">
        <div className="label-muted mb-2">TELEMETRY OVERVIEW</div>
        <TelemetryCharts compact={true} />
      </div>
    </div>
  );
}
