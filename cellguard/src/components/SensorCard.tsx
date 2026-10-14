import type { ReactNode } from 'react';
import type { SensorValidity } from '../types';

interface Props {
  label: string;
  value: string | ReactNode;
  unit?: string;
  sub?: string;
  validity?: SensorValidity;
  color?: string;
  trend?: number; // positive = up, negative = down
  className?: string;
}

function validityBadge(v: SensorValidity | undefined) {
  if (!v || v === 'valid') return null;
  const map = {
    stale: { text: 'STALE', color: 'var(--warn)' },
    fault: { text: 'FAULT', color: 'var(--danger)' },
    unavailable: { text: 'N/A', color: 'var(--steel)' },
  };
  const info = map[v];
  return (
    <span
      className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded"
      style={{ background: `${info.color}22`, color: info.color, fontSize: '9px' }}
    >
      {info.text}
    </span>
  );
}

export default function SensorCard({ label, value, unit, sub, validity, color, className = '' }: Props) {
  const isUnavailable = validity === 'unavailable' || validity === 'fault';

  return (
    <div
      className={`stat-card relative overflow-hidden ${className}`}
      style={{ minHeight: '82px' }}
    >
      {/* Subtle left accent line */}
      <div
        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
        style={{ background: color ?? 'var(--cyan)', opacity: isUnavailable ? 0.2 : 0.6 }}
      />

      <div className="flex items-center justify-between">
        <span className="label-muted pl-2">{label}</span>
        {validityBadge(validity)}
      </div>

      <div className="pl-2 flex items-end gap-1 leading-none mt-1">
        {isUnavailable ? (
          <span className="font-mono text-xl font-bold" style={{ color: 'var(--steel)' }}>N/A</span>
        ) : (
          <>
            <span className="font-mono text-xl font-bold" style={{ color: color ?? 'var(--cyan)' }}>
              {value}
            </span>
            {unit && (
              <span className="text-sm mb-0.5 font-medium" style={{ color: 'var(--steel)' }}>
                {unit}
              </span>
            )}
          </>
        )}
      </div>

      {sub && (
        <div className="pl-2 mt-1 text-xs font-mono truncate" style={{ color: 'var(--steel)', fontSize: '10px' }}>
          {sub}
        </div>
      )}
    </div>
  );
}
