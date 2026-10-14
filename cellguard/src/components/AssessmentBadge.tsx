import { AlertTriangle, CheckCircle, AlertOctagon, HelpCircle, XCircle } from 'lucide-react';
import type { Assessment } from '../types';

const LABEL_CONFIG = {
  NORMAL: { icon: CheckCircle, color: 'var(--good)', bg: 'rgba(45,212,191,0.1)', border: 'rgba(45,212,191,0.25)', text: 'NORMAL' },
  LIQUID_DETECTED: { icon: AlertTriangle, color: 'var(--warn)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: 'LIQUID DETECTED' },
  ELECTRICAL_ANOMALY: { icon: AlertTriangle, color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)', text: 'ELECTRICAL ANOMALY' },
  SUSPECTED_LEAK: { icon: AlertOctagon, color: 'var(--danger)', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', text: 'SUSPECTED LEAK' },
  SENSOR_FAULT: { icon: XCircle, color: 'var(--steel)', bg: 'rgba(74,101,128,0.12)', border: 'rgba(74,101,128,0.3)', text: 'SENSOR FAULT' },
  INSUFFICIENT_DATA: { icon: HelpCircle, color: 'var(--steel)', bg: 'rgba(74,101,128,0.1)', border: 'rgba(74,101,128,0.25)', text: 'INSUFFICIENT DATA' },
};

interface Props {
  assessment: Assessment | null;
  compact?: boolean;
}

export default function AssessmentBadge({ assessment, compact = false }: Props) {
  if (!assessment) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: 'rgba(74,101,128,0.1)', border: '1px solid rgba(74,101,128,0.2)' }}>
        <HelpCircle size={16} style={{ color: 'var(--steel)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--steel)' }}>WAITING FOR DATA</span>
      </div>
    );
  }

  const cfg = LABEL_CONFIG[assessment.label];
  const Icon = cfg.icon;
  const pulse = assessment.label === 'SUSPECTED_LEAK' || assessment.label === 'LIQUID_DETECTED';

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded font-semibold text-xs"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
      >
        <Icon size={13} className={pulse ? 'animate-pulse-glow' : ''} />
        {cfg.text}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full"
          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.border}` }}
        >
          <Icon size={20} style={{ color: cfg.color }} className={pulse ? 'animate-pulse-glow' : ''} />
        </div>
        <div>
          <div className="font-bold text-base" style={{ color: cfg.color }}>{cfg.text}</div>
          <div className="text-xs" style={{ color: 'var(--steel)' }}>
            Confidence: <span style={{ color: '#CBD5E1' }}>{assessment.confidence.toUpperCase()}</span>
            {assessment.heuristicScore !== null && (
              <> · Heuristic: <span style={{ color: '#CBD5E1' }}>{assessment.heuristicScore}/100</span>
                <span style={{ color: 'var(--steel)', fontSize: '9px' }}> (not a failure probability)</span>
              </>
            )}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs font-mono" style={{ color: 'var(--steel)' }}>
            {new Date(assessment.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Evidence items */}
      <div className="space-y-1.5 mb-3">
        <div className="label-muted mb-1">EVIDENCE</div>
        {assessment.evidenceItems.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-xs px-2 py-1 rounded"
            style={{ background: 'rgba(0,0,0,0.15)' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: item.triggered
                  ? item.dataQuality === 'unavailable' ? 'var(--steel)' : 'var(--danger)'
                  : 'var(--good)',
              }}
            />
            <span style={{ color: '#CBD5E1' }}>{item.label}:</span>
            <span className="font-mono" style={{ color: item.triggered ? cfg.color : 'var(--good)' }}>
              {item.value}
            </span>
            <span style={{ color: 'var(--steel)' }} className="ml-auto text-right truncate max-w-32">
              {item.threshold}
            </span>
            {item.dataQuality !== 'good' && (
              <span
                className="px-1 rounded"
                style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warn)', fontSize: '9px' }}
              >
                {item.dataQuality.toUpperCase()}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Uncertainties */}
      {assessment.uncertaintyReasons.length > 0 && (
        <div className="mb-3">
          <div className="label-muted mb-1">UNCERTAINTY FACTORS</div>
          {assessment.uncertaintyReasons.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs mb-1" style={{ color: 'var(--warn)' }}>
              <AlertTriangle size={10} className="mt-0.5 shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Next step */}
      <div
        className="text-xs px-3 py-2 rounded"
        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', color: '#CBD5E1' }}
      >
        <span className="font-semibold" style={{ color: cfg.color }}>→ Next Step: </span>
        {assessment.suggestedNextStep}
      </div>
    </div>
  );
}
