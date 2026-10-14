import { Bell, Shield, Wifi, WifiOff, Zap, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

export default function Header() {
  const { mode, hardwareStatus, unacknowledgedCount, alerts, setMode } = useAppStore();
  const isLive = mode === 'live';
  const connected = hardwareStatus.connected;
  const stale = hardwareStatus.stale;

  return (
    <header
      className="flex items-center justify-between px-4 py-2 shrink-0 z-20"
      style={{
        background: 'var(--navy-900)',
        borderBottom: '1px solid var(--border-subtle)',
        height: '52px',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-8 h-8 rounded"
          style={{ background: 'rgba(53,213,242,0.12)', border: '1px solid var(--border)' }}
        >
          <Shield size={16} className="text-cyan" />
        </div>
        <div>
          <span className="font-bold text-sm tracking-tight">
            Cell<span className="text-cyan">Guard</span>
          </span>
          <span className="text-xs ml-2" style={{ color: 'var(--steel)' }}>
            Battery Intelligence Platform
          </span>
        </div>
      </div>

      {/* Center — connection / mode status */}
      <div className="flex items-center gap-2">
        {/* Mode toggle */}
        <button
          onClick={() => setMode(isLive ? 'simulation' : 'live')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all duration-200 ${
            isLive ? 'live-banner' : 'sim-banner'
          }`}
        >
          <Zap size={12} />
          {isLive ? 'LIVE MODE' : 'SIMULATION MODE'}
        </button>

        {/* Hardware status */}
        {isLive && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium ${
              connected && !stale
                ? 'text-good'
                : stale
                ? 'text-warn'
                : 'text-steel'
            }`}
            style={{
              background: connected
                ? stale
                  ? 'rgba(245,158,11,0.1)'
                  : 'rgba(45,212,191,0.1)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${connected ? (stale ? 'rgba(245,158,11,0.3)' : 'rgba(45,212,191,0.25)') : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {connected && !stale ? (
              <><Wifi size={11} /><span className="animate-blink inline-block w-1.5 h-1.5 rounded-full bg-good" />ESP32 Connected</>
            ) : stale ? (
              <><AlertTriangle size={11} />Stale Data</>
            ) : (
              <><WifiOff size={11} />Not Connected</>
            )}
          </div>
        )}
      </div>

      {/* Right — alerts + info */}
      <div className="flex items-center gap-2">
        {unacknowledgedCount > 0 && (
          <div className="relative">
            <button
              className="p-1.5 rounded transition-colors"
              style={{ color: 'var(--warn)' }}
              title={`${unacknowledgedCount} unacknowledged alert(s)`}
            >
              <Bell size={16} />
              <span
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold"
                style={{ background: 'var(--danger)', color: 'white', fontSize: '9px' }}
              >
                {unacknowledgedCount > 9 ? '9+' : unacknowledgedCount}
              </span>
            </button>
          </div>
        )}

        <div className="text-xs font-mono" style={{ color: 'var(--steel)' }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </header>
  );
}
