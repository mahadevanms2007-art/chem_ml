import {
  LayoutDashboard, Box, Activity, Camera, Brain, Clock,
  FlaskConical, Database, FileText, Settings, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import type { AppPage } from '../types';

const NAV_ITEMS: { page: AppPage; label: string; icon: React.ElementType; short: string }[] = [
  { page: 'overview',          label: 'Overview',          icon: LayoutDashboard, short: 'OVR' },
  { page: 'digital-twin',      label: 'Digital Twin',      icon: Box,             short: '3D'  },
  { page: 'live-telemetry',    label: 'Live Telemetry',    icon: Activity,        short: 'TLM' },
  { page: 'camera-inspection', label: 'Camera Inspection', icon: Camera,          short: 'CAM' },
  { page: 'risk-intelligence', label: 'Risk Intelligence', icon: Brain,           short: 'RSK' },
  { page: 'event-timeline',    label: 'Event Timeline',    icon: Clock,           short: 'EVT' },
  { page: 'simulation-lab',    label: 'Simulation Lab',    icon: FlaskConical,    short: 'SIM' },
  { page: 'battery-registry',  label: 'Battery Registry',  icon: Database,        short: 'REG' },
  { page: 'reports',           label: 'Reports',           icon: FileText,        short: 'RPT' },
  { page: 'system-config',     label: 'Configuration',     icon: Settings,        short: 'CFG' },
];

export default function Sidebar() {
  const { currentPage, setPage } = useAppStore();

  return (
    <aside
      className="flex flex-col gap-0.5 py-3 px-2 shrink-0 overflow-y-auto scrollbar-none"
      style={{
        width: '200px',
        background: 'var(--navy-900)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      <div className="px-2 mb-2">
        <span className="label-muted" style={{ fontSize: '9px' }}>NAVIGATION</span>
      </div>

      {NAV_ITEMS.map(({ page, label, icon: Icon }) => {
        const active = currentPage === page;
        return (
          <button
            key={page}
            onClick={() => setPage(page)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-medium w-full text-left transition-all duration-150"
            style={{
              background: active ? 'rgba(53,213,242,0.1)' : 'transparent',
              color: active ? 'var(--cyan)' : 'var(--steel)',
              borderLeft: active ? '2px solid var(--cyan)' : '2px solid transparent',
            }}
            onMouseEnter={e => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                (e.currentTarget as HTMLElement).style.color = '#CBD5E1';
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--steel)';
              }
            }}
          >
            <Icon size={15} />
            <span className="flex-1 truncate text-xs">{label}</span>
            {active && <ChevronRight size={12} className="opacity-50" />}
          </button>
        );
      })}

      <div className="mt-auto pt-3 px-2">
        <div
          className="text-center py-2 rounded"
          style={{
            background: 'rgba(53,213,242,0.05)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="text-xs font-mono" style={{ color: 'var(--steel)' }}>v1.0.0</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--steel)', fontSize: '10px' }}>
            CellGuard Platform
          </div>
        </div>
      </div>
    </aside>
  );
}
