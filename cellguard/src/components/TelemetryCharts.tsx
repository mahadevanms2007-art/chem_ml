import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useAppStore } from '../stores/appStore';
import type { SensorReading } from '../types';

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface ChartPoint {
  t: string;
  voltage?: number | null;
  shunt?: number | null;
  current?: number | null;
  humidity?: number | null;
  temp?: number | null;
  yl83?: number | null;
  wet?: number | null;
}

function toChartData(history: SensorReading[]): ChartPoint[] {
  const step = Math.max(1, Math.floor(history.length / 80));
  return history
    .filter((_, i) => i % step === 0)
    .map(r => ({
      t: fmt(r.timestamp),
      voltage: r.cellVoltage_V ?? r.busVoltage_V,
      shunt: r.shuntVoltage_mV,
      current: r.current_mA,
      humidity: r.humidity_pct,
      temp: r.temperature_C,
      yl83: r.yl83Raw,
      wet: r.wetScore !== null ? +(r.wetScore * 100).toFixed(1) : null,
    }));
}

const TOOLTIP_STYLE = {
  backgroundColor: '#0D1B2A',
  border: '1px solid rgba(53,213,242,0.2)',
  borderRadius: '6px',
  fontSize: '11px',
  color: '#E2E8F0',
};

interface MiniChartProps {
  data: ChartPoint[];
  dataKey: keyof ChartPoint;
  color: string;
  label: string;
  unit: string;
  height?: number;
  refLine?: number;
  domain?: [number | 'auto', number | 'auto'];
}

function MiniChart({ data, dataKey, color, label, unit, height = 100, refLine, domain }: MiniChartProps) {
  return (
    <div className="panel-cyan p-3">
      <div className="label-muted mb-2">{label}</div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey as string}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="t" tick={{ fontSize: 9 }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9 }} tickLine={false} domain={domain} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number) => [`${v} ${unit}`, label]}
            labelStyle={{ color: '#4A6580', fontSize: '10px' }}
          />
          {refLine !== undefined && (
            <ReferenceLine y={refLine} stroke="rgba(239,68,68,0.5)" strokeDasharray="3 3" />
          )}
          <Area
            type="monotone"
            dataKey={dataKey as string}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${dataKey as string})`}
            connectNulls={false}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function TelemetryCharts({ compact = false }: { compact?: boolean }) {
  const { readingHistory, thresholds } = useAppStore();
  const data = toChartData(readingHistory);
  const h = compact ? 80 : 110;

  if (data.length === 0) {
    return (
      <div className="panel-cyan p-6 text-center" style={{ color: 'var(--steel)' }}>
        <div className="text-sm">No telemetry data yet.</div>
        <div className="text-xs mt-1">Connect hardware or enable simulation mode.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
      <MiniChart data={data} dataKey="voltage" color="#35D5F2" label="CELL VOLTAGE" unit="V" height={h}
        refLine={thresholds.ocvWeak_V} domain={[0.8, 1.8]} />
      <MiniChart data={data} dataKey="wet" color="#EF4444" label="WET SCORE %" unit="%" height={h}
        refLine={thresholds.wetLeak * 100} domain={[0, 100]} />
      <MiniChart data={data} dataKey="humidity" color="#38BDF8" label="HUMIDITY" unit="%" height={h}
        domain={[0, 100]} />
      <MiniChart data={data} dataKey="temp" color="#F97316" label="TEMPERATURE" unit="°C" height={h} />
      <MiniChart data={data} dataKey="yl83" color="#A78BFA" label="YL-83 ADC RAW" unit="ADC" height={h}
        domain={[0, 4095]} />
      <MiniChart data={data} dataKey="shunt" color="#34D399" label="SHUNT VOLTAGE" unit="mV" height={h} />
    </div>
  );
}
