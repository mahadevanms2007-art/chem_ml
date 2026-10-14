import { Suspense, useState } from 'react';
import { RotateCcw, Layers, Eye, Info } from 'lucide-react';
import Battery3D from '../3d/Battery3D';
import AssessmentBadge from '../components/AssessmentBadge';
import SensorCard from '../components/SensorCard';
import { useAppStore } from '../stores/appStore';

export default function DigitalTwinPage() {
  const { latestReading: r, latestAssessment, selectedComponent, setSelectedComponent } = useAppStore();
  const [view, setView] = useState<'standard' | 'exploded'>('standard');

  return (
    <div className="flex flex-col gap-3 p-4 h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-cyan">Digital Twin</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--steel)' }}>
            Interactive 3D battery model. Click sensor markers or casing regions for details.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView(v => v === 'standard' ? 'exploded' : 'standard')} className="btn-secondary text-xs">
            <Layers size={13} /> {view === 'standard' ? 'Exploded View' : 'Standard View'}
          </button>
          <button onClick={() => setSelectedComponent(null)} className="btn-ghost text-xs">
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        {/* Main 3D viewport */}
        <div className="flex-1 min-h-0">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center panel-cyan">
              <div className="text-sm" style={{ color: 'var(--steel)' }}>Loading 3D model…</div>
            </div>
          }>
            <Battery3D height={500} showControls={true} />
          </Suspense>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-3 shrink-0 overflow-y-auto" style={{ width: '260px' }}>
          {/* Current assessment */}
          <AssessmentBadge assessment={latestAssessment} compact={false} />

          {/* Sensor live values */}
          <div className="panel-cyan p-3">
            <div className="label-muted mb-2">LIVE SENSOR READINGS</div>
            <div className="space-y-2">
              <SensorCard label="CELL VOLTAGE" value={r?.cellVoltage_V?.toFixed(3) ?? '—'} unit="V" validity={r?.inaValid} color="var(--cyan)" />
              <SensorCard label="WET SCORE" value={r?.wetScore !== null && r?.wetScore !== undefined ? (r.wetScore * 100).toFixed(1) : '—'} unit="%" validity={r?.moistureValid} color="var(--warn)" />
              <SensorCard label="HUMIDITY" value={r?.humidity_pct?.toFixed(1) ?? '—'} unit="%" validity={r?.dhtValid} color="#38BDF8" />
              <SensorCard label="TEMPERATURE" value={r?.temperature_C?.toFixed(1) ?? '—'} unit="°C" validity={r?.dhtValid} color="#F97316" />
            </div>
          </div>

          {/* Interaction guide */}
          <div className="panel-cyan p-3">
            <div className="label-muted mb-2 flex items-center gap-1"><Info size={10} /> INTERACTION GUIDE</div>
            {[
              ['Click', 'Select a component'],
              ['Drag', 'Rotate the model'],
              ['Scroll', 'Zoom in/out'],
              ['Right-drag', 'Pan the view'],
            ].map(([key, desc]) => (
              <div key={key} className="flex justify-between py-1 text-xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="font-mono" style={{ color: 'var(--cyan)' }}>{key}</span>
                <span style={{ color: 'var(--steel)' }}>{desc}</span>
              </div>
            ))}
          </div>

          {/* Scientific disclaimer */}
          <div className="p-3 rounded text-xs" style={{ background: 'rgba(57,119,246,0.06)', border: '1px solid rgba(57,119,246,0.2)', color: '#94A3B8' }}>
            <strong style={{ color: '#60A5FA' }}>⚠ Scientific limitation:</strong> Current sensors measure only
            external moisture (YL-83), voltage (INA219), and ambient conditions (DHT22).
            Internal cell temperature, pressure, electrolyte position, and electrode condition
            are NOT measurable. Internal layers shown here are conceptual only.
          </div>
        </div>
      </div>
    </div>
  );
}
