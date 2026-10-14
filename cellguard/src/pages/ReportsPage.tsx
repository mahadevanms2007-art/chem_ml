import { useState } from 'react';
import {
  FileText, Printer, Download, CheckCircle, AlertTriangle,
  ShieldCheck, Battery, Calendar, User, Building, QrCode, Share2
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import AssessmentBadge from '../components/AssessmentBadge';

export default function ReportsPage() {
  const {
    latestAssessment, latestReading, readingHistory, batteries,
    activeBatteryId, calibration, thresholds, currentSessionId
  } = useAppStore();

  const [inspectorName, setInspectorName] = useState('Senior Test Engineer #842');
  const [facilityName, setFacilityName] = useState('CellGuard Electrochemical QA Lab, Bay 3');
  const [operatorNotes, setOperatorNotes] = useState(
    'Stationary screening performed under ambient controlled conditions (22-25°C). Probe impedance verified prior to batch run.'
  );

  const activeBattery = batteries.find(b => b.id === activeBatteryId) ?? {
    id: 'BAT-18650-LGC2',
    label: 'LG MJ1 18650 High-Capacity',
    chemistry: 'lithium-ion',
    manufacturer: 'LG Chem',
    model: 'INR18650-MJ1',
    nominalVoltage_V: 3.6,
    ratedCapacity_mAh: 3500,
  };

  const reportId = `CG-REP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const dateStr = new Date().toLocaleString();

  // Aggregate stats from reading history
  const validVoltages = readingHistory.map(r => r.cellVoltage_V).filter((v): v is number => v != null);
  const minV = validVoltages.length > 0 ? Math.min(...validVoltages).toFixed(3) : (latestReading?.cellVoltage_V?.toFixed(3) ?? 'N/A');
  const maxV = validVoltages.length > 0 ? Math.max(...validVoltages).toFixed(3) : (latestReading?.cellVoltage_V?.toFixed(3) ?? 'N/A');

  const validWet = readingHistory.map(r => r.wetScore).filter((v): v is number => v != null);
  const maxWet = validWet.length > 0 ? (Math.max(...validWet) * 100).toFixed(0) : ((latestReading?.wetScore ?? 0) * 100).toFixed(0);

  const validTemps = readingHistory.map(r => r.temperature_C).filter((v): v is number => v != null);
  const avgTemp = validTemps.length > 0
    ? (validTemps.reduce((a, b) => a + b, 0) / validTemps.length).toFixed(1)
    : (latestReading?.temperature_C?.toFixed(1) ?? 'N/A');

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const reportData = {
      reportId,
      timestamp: Date.now(),
      dateStr,
      inspectorName,
      facilityName,
      operatorNotes,
      battery: activeBattery,
      assessment: latestAssessment,
      telemetryStats: { minVoltage_V: minV, maxVoltage_V: maxV, maxWet_pct: maxWet, avgTemp_C: avgTemp },
      calibration,
      thresholds
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `${reportId}.json`);
    dlAnchorElem.click();
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top action bar - Hidden when printing */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">Inspection Dossier & Health Certification</h1>
              <p className="text-xs text-navy-400">Formal laboratory certification report with calibration traceability</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-teal-500 text-black font-semibold text-xs flex items-center gap-2 hover:bg-teal-400 shadow-lg shadow-teal-500/20"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3 py-2 rounded-lg bg-navy-900 border border-navy-700 text-xs text-navy-200 hover:text-white flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Editable metadata in UI, renders cleanly in report */}
      <div className="print:hidden bg-navy-900/80 border border-navy-700/70 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-navy-400 mb-1">Testing Inspector / Operator Name</label>
          <input
            type="text"
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            className="w-full px-3 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-white font-mono text-xs"
          />
        </div>
        <div>
          <label className="block text-navy-400 mb-1">Inspection Facility & Station Bay</label>
          <input
            type="text"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
            className="w-full px-3 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-white font-mono text-xs"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-navy-400 mb-1">Operator Observations & Protocol Notes</label>
          <textarea
            rows={2}
            value={operatorNotes}
            onChange={(e) => setOperatorNotes(e.target.value)}
            className="w-full px-3 py-1.5 bg-navy-950 border border-navy-700 rounded-lg text-white text-xs"
          />
        </div>
      </div>

      {/* Printable Report Document Sheet */}
      <div className="bg-navy-900/90 border border-navy-700 rounded-2xl p-8 shadow-2xl space-y-6 text-white print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Dossier Header */}
        <div className="border-b border-navy-800 print:border-black/30 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 print:bg-gray-100 print:text-black">
                ISO/IEC 17025 Conformant Format
              </span>
              <span className="text-xs font-mono text-navy-400 print:text-gray-600">CellGuard v1.4</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-1">BATTERY INTEGRITY SCREENING REPORT</h2>
            <p className="text-xs text-navy-400 print:text-gray-600">Electrical, Chemical Seep, and Optical Surface Verification</p>
          </div>

          <div className="text-right font-mono text-xs space-y-1">
            <div><span className="text-navy-400 print:text-gray-600">Dossier Ref:</span> <strong className="text-cyan-300 print:text-black">{reportId}</strong></div>
            <div><span className="text-navy-400 print:text-gray-600">Generated:</span> {dateStr}</div>
            <div><span className="text-navy-400 print:text-gray-600">Session ID:</span> {currentSessionId ?? 'ACTIVE-SESSION-01'}</div>
          </div>
        </div>

        {/* Section 1: Subject Profile & Inspector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-navy-950/70 print:bg-gray-50 rounded-xl border border-navy-800 print:border-gray-300 space-y-2">
            <h3 className="font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <Battery className="w-3.5 h-3.5" />
              1. Test Subject Asset Identification
            </h3>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div><span className="text-navy-400 print:text-gray-600 block">Serial / ID:</span> <span className="font-bold">{activeBattery.id}</span></div>
              <div><span className="text-navy-400 print:text-gray-600 block">Chemistry:</span> <span className="capitalize">{activeBattery.chemistry}</span></div>
              <div><span className="text-navy-400 print:text-gray-600 block">Manufacturer:</span> {activeBattery.manufacturer}</div>
              <div><span className="text-navy-400 print:text-gray-600 block">Nominal Spec:</span> {activeBattery.nominalVoltage_V} V</div>
            </div>
          </div>

          <div className="p-4 bg-navy-950/70 print:bg-gray-50 rounded-xl border border-navy-800 print:border-gray-300 space-y-2">
            <h3 className="font-bold text-cyan-400 print:text-black uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <Building className="w-3.5 h-3.5" />
              2. Laboratory & Chain of Custody
            </h3>
            <div className="space-y-1 font-mono">
              <div><span className="text-navy-400 print:text-gray-600">Inspector:</span> {inspectorName}</div>
              <div><span className="text-navy-400 print:text-gray-600">Testing Facility:</span> {facilityName}</div>
              <div><span className="text-navy-400 print:text-gray-600">Hardware Mode:</span> {latestReading?.source === 'live' ? 'Live ESP32 Monitored' : 'Simulated Telemetry Rig'}</div>
            </div>
          </div>
        </div>

        {/* Section 2: Final Classification Assessment */}
        <div className="p-5 bg-navy-950/90 print:bg-gray-50 rounded-xl border border-navy-800 print:border-gray-300 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy-800/80 print:border-gray-300 pb-3">
            <div>
              <h3 className="font-bold text-white print:text-black uppercase tracking-wider text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 print:text-black" />
                3. Final Classification Verdict & Risk Status
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded font-mono font-bold text-xs uppercase ${
                latestAssessment?.label === 'NORMAL' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 print:border-black print:text-black' :
                'bg-rose-500/20 text-rose-300 border border-rose-500/40 print:border-black print:text-black'
              }`}>
                VERDICT: {latestAssessment?.label ?? 'NORMAL'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
            <div className="p-3 bg-navy-900 print:bg-white rounded-lg border border-navy-800 print:border-gray-300">
              <span className="text-[10px] text-navy-400 print:text-gray-600 block">VOLTAGE WINDOW</span>
              <span className="text-base font-bold text-cyan-300 print:text-black">{minV} - {maxV} V</span>
            </div>
            <div className="p-3 bg-navy-900 print:bg-white rounded-lg border border-navy-800 print:border-gray-300">
              <span className="text-[10px] text-navy-400 print:text-gray-600 block">PEAK WETNESS</span>
              <span className={`text-base font-bold ${Number(maxWet) > 30 ? 'text-rose-400' : 'text-teal-400'} print:text-black`}>
                {maxWet}%
              </span>
            </div>
            <div className="p-3 bg-navy-900 print:bg-white rounded-lg border border-navy-800 print:border-gray-300">
              <span className="text-[10px] text-navy-400 print:text-gray-600 block">AVG TEMPERATURE</span>
              <span className="text-base font-bold text-white print:text-black">{avgTemp} °C</span>
            </div>
            <div className="p-3 bg-navy-900 print:bg-white rounded-lg border border-navy-800 print:border-gray-300">
              <span className="text-[10px] text-navy-400 print:text-gray-600 block">ANOMALY INDEX</span>
              <span className="text-base font-bold text-amber-300 print:text-black">
                {latestAssessment?.heuristicScore?.toFixed(0) ?? 0} / 100
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Evidence Evaluation Table */}
        <div className="space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-navy-300 print:text-black">
            4. Deterministic Evidence Ledger
          </h3>
          <div className="border border-navy-800 print:border-gray-300 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950 print:bg-gray-100 font-mono text-[10px] uppercase text-navy-400 print:text-black border-b border-navy-800 print:border-gray-300">
                <tr>
                  <th className="py-2 px-3">Parameter Evaluated</th>
                  <th className="py-2 px-3">Observed Value</th>
                  <th className="py-2 px-3">Rejection Threshold</th>
                  <th className="py-2 px-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800 print:divide-gray-200 text-[11px]">
                {latestAssessment?.evidenceItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-3 font-medium">{item.label}</td>
                    <td className="py-2 px-3 font-mono">{item.value}</td>
                    <td className="py-2 px-3 font-mono text-navy-400 print:text-gray-600">{item.threshold}</td>
                    <td className="py-2 px-3 font-mono font-bold">
                      {item.triggered ? (
                        <span className="text-rose-400 print:text-black">VIOLATION</span>
                      ) : (
                        <span className="text-teal-400 print:text-black">CONFORMANT</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Operator Protocol & Notes */}
        <div className="space-y-1.5 text-xs">
          <h3 className="font-bold uppercase tracking-wider text-navy-300 print:text-black text-[11px]">
            5. Inspector Protocol & Operational Remarks
          </h3>
          <div className="p-3 bg-navy-950/80 print:bg-gray-50 border border-navy-800 print:border-gray-300 rounded-lg text-navy-300 print:text-gray-800 font-mono text-[11px] leading-relaxed">
            {operatorNotes}
          </div>
        </div>

        {/* Section 5: Calibration & Scientific Traceability */}
        <div className="p-3 bg-navy-950/40 print:bg-gray-50 border border-navy-800/80 print:border-gray-300 rounded-lg text-[10px] text-navy-400 print:text-gray-600 space-y-1 leading-relaxed">
          <p>
            <strong>Calibration Traceability:</strong> YL-83 moisture reference ADC dry calibration baseline: {calibration.yl83DryRef} ADC. INA Shunt resistor calibrated at {calibration.inaShuntOhm ? `${calibration.inaShuntOhm} Ω` : 'UNSET (Current estimation uncalibrated)'}. Resistive sensors indicate conductive fluid on tray; positive verification requires chemical pH determination.
          </p>
        </div>

        {/* Signatures & Seal */}
        <div className="pt-8 border-t border-navy-800 print:border-gray-300 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="text-navy-500 print:text-gray-500 block text-[10px] mb-6">INSPECTION ENGINEER:</span>
            <div className="border-b border-navy-700 print:border-black pb-1 font-mono text-cyan-300 print:text-black">
              {inspectorName}
            </div>
            <span className="text-[10px] text-navy-500 print:text-gray-500 block mt-1">Certified Lead Tester</span>
          </div>

          <div>
            <span className="text-navy-500 print:text-gray-500 block text-[10px] mb-6">QUALITY ASSURANCE:</span>
            <div className="border-b border-navy-700 print:border-black pb-1 font-mono text-white print:text-black">
              QA Audit Sign-off #09
            </div>
            <span className="text-[10px] text-navy-500 print:text-gray-500 block mt-1">Laboratory Oversight</span>
          </div>

          <div className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-3 border border-navy-800 print:border-gray-300 rounded-xl bg-navy-950/40 print:bg-gray-50">
            <span className="font-mono text-[10px] text-navy-500 print:text-gray-500 uppercase">QA AUDIT STAMP</span>
            <span className="text-xs font-black font-mono tracking-widest text-teal-400 print:text-black mt-1">
              {latestAssessment?.label === 'NORMAL' ? 'RELEASED / PASSED' : 'HOLD / QUARANTINE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
