import { useState } from 'react';
import {
  Clock, AlertTriangle, AlertOctagon, Info, CheckCircle, Search,
  Filter, Download, Trash2, CheckCheck, RefreshCw, ChevronRight, X
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import type { AppAlert } from '../types';

export default function EventTimelinePage() {
  const { alerts, acknowledgeAlert, clearAlerts, unacknowledgedCount } = useAppStore();
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'live' | 'simulated'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<AppAlert | null>(null);

  // Filtered alerts
  const filteredAlerts = alerts.filter(a => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (sourceFilter !== 'all' && a.source !== sourceFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return a.message.toLowerCase().includes(q) || a.evidenceCategory.toLowerCase().includes(q);
    }
    return true;
  });

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(alerts, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `cellguard_audit_log_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'ISO Time', 'Severity', 'Source', 'Category', 'Acknowledged', 'Message'];
    const rows = alerts.map(a => [
      a.timestamp,
      new Date(a.timestamp).toISOString(),
      a.severity,
      a.source,
      a.evidenceCategory,
      a.acknowledged ? 'YES' : 'NO',
      `"${a.message.replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cellguard_timeline_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">Event Timeline & Incident Audit</h1>
              <p className="text-xs text-navy-400">Chronological telemetry alerts, system events, and immutable audit logs</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg bg-navy-900 border border-navy-700 text-xs text-navy-200 hover:text-white hover:border-cyan-500/50 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            CSV Export
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded-lg bg-navy-900 border border-navy-700 text-xs text-navy-200 hover:text-white hover:border-cyan-500/50 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            JSON Log
          </button>
          {alerts.length > 0 && (
            <button
              onClick={clearAlerts}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 hover:bg-rose-500/20 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Control bar / Filters */}
      <div className="bg-navy-900/80 border border-navy-700/70 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-lg">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-navy-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident description..."
            className="w-full pl-9 pr-3 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-xs text-white placeholder-navy-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-navy-950 p-1 rounded-lg border border-navy-800 text-xs">
            <span className="text-[11px] text-navy-400 px-2">Severity:</span>
            {(['all', 'critical', 'warning', 'info'] as const).map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                  severityFilter === sev
                    ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                    : 'text-navy-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-navy-950 p-1 rounded-lg border border-navy-800 text-xs">
            <span className="text-[11px] text-navy-400 px-2">Source:</span>
            {(['all', 'live', 'simulated'] as const).map(src => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                  sourceFilter === src
                    ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                    : 'text-navy-400 hover:text-white'
                }`}
              >
                {src}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-navy-900/80 border border-navy-700/70 rounded-xl overflow-hidden shadow-lg p-5">
        {filteredAlerts.length === 0 ? (
          <div className="py-16 text-center text-navy-400 space-y-2">
            <CheckCircle className="w-10 h-10 text-teal-400 mx-auto opacity-70" />
            <p className="text-sm font-medium text-white">No Incident Events Recorded</p>
            <p className="text-xs text-navy-500">All monitored subsystems are running nominal or match selected filter criteria.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-navy-800">
            {filteredAlerts.map((alert) => {
              const isCrit = alert.severity === 'critical';
              const isWarn = alert.severity === 'warning';
              const dotColor = isCrit ? 'bg-rose-500 border-rose-300' : isWarn ? 'bg-amber-400 border-amber-200' : 'bg-cyan-400 border-cyan-200';

              return (
                <div
                  key={alert.id}
                  className={`relative p-4 rounded-xl border transition-all ${
                    alert.acknowledged
                      ? 'bg-navy-950/60 border-navy-800/80 opacity-75'
                      : isCrit
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-rose-950/20 shadow-md'
                      : isWarn
                      ? 'bg-amber-950/15 border-amber-500/30'
                      : 'bg-navy-900 border-navy-700'
                  }`}
                >
                  {/* Timeline bullet */}
                  <span className={`absolute -left-[1.85rem] top-4 w-3 h-3 rounded-full border-2 ${dotColor}`} />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                        isCrit ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        isWarn ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-950 text-navy-400 border border-navy-800">
                        {alert.source.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-navy-400">
                        {new Date(alert.timestamp).toLocaleTimeString()} ({new Date(alert.timestamp).toLocaleDateString()})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!alert.acknowledged ? (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="px-2.5 py-1 rounded bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        >
                          <CheckCheck className="w-3 h-3" />
                          Acknowledge
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-teal-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Acknowledged
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="px-2 py-1 rounded bg-navy-950 hover:bg-navy-800 text-navy-400 hover:text-white text-[11px] border border-navy-800"
                      >
                        Details
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs font-medium text-white leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="mt-2 flex items-center gap-4 text-[11px] text-navy-400">
                    <span>Category: <strong className="text-cyan-300 font-normal">{alert.evidenceCategory}</strong></span>
                    <span>Event ID: <span className="font-mono text-navy-500">{alert.id}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Details */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Event Telemetry Snapshot</h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-navy-400 hover:text-white p-1 rounded hover:bg-navy-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-navy-950 rounded-lg border border-navy-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-navy-400">Event ID:</span>
                  <span className="font-mono text-white">{selectedAlert.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Time recorded:</span>
                  <span className="font-mono text-white">{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Severity Level:</span>
                  <span className="font-mono uppercase text-white font-bold">{selectedAlert.severity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Telemetry Origin:</span>
                  <span className="font-mono uppercase text-cyan-300">{selectedAlert.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Audit Category:</span>
                  <span className="font-mono text-amber-300">{selectedAlert.evidenceCategory}</span>
                </div>
              </div>

              <div>
                <span className="text-navy-400 block mb-1">Incident Descriptor:</span>
                <div className="p-3 bg-black/40 border border-navy-800 rounded-lg text-white font-mono text-[11px] leading-relaxed">
                  {selectedAlert.message}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-navy-800">
              {!selectedAlert.acknowledged && (
                <button
                  onClick={() => {
                    acknowledgeAlert(selectedAlert.id);
                    setSelectedAlert(prev => prev ? { ...prev, acknowledged: true } : null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-teal-500 text-black font-semibold text-xs hover:bg-teal-400"
                >
                  Acknowledge Incident
                </button>
              )}
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-xs text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
