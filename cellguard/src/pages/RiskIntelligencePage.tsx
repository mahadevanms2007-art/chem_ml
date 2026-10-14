import { useState } from 'react';
import {
  ShieldAlert, AlertTriangle, CheckCircle, Info, ChevronRight, HelpCircle,
  FileCheck, Shield, Sliders, ExternalLink, Activity, ArrowRight
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import AssessmentBadge from '../components/AssessmentBadge';
import type { EvidenceCategory } from '../types';

export default function RiskIntelligencePage() {
  const { latestAssessment, latestReading, readingHistory, calibration, thresholds } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const assessment = latestAssessment;

  const toggleStep = (step: string) => {
    setCompletedSteps(prev => ({ ...prev, [step]: !prev[step] }));
  };

  const categories: { key: string; label: string }[] = [
    { key: 'all', label: 'All Evidence' },
    { key: 'liquid', label: 'Liquid / Moisture' },
    { key: 'electrical', label: 'Electrical Anomaly' },
    { key: 'environmental', label: 'Environmental Stress' },
    { key: 'visual', label: 'Computer Vision' },
    { key: 'sensor_reliability', label: 'Sensor Integrity' },
  ];

  const filteredEvidence = assessment?.evidenceItems.filter(item => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  }) ?? [];

  // Categorical risk scores for radar/breakdown
  const liquidRisk = Math.min(100, Math.round((latestReading?.wetScore ?? 0) * 100));
  const electricalRisk = latestReading?.cellVoltage_V != null && latestReading.cellVoltage_V < thresholds.ocvWeak_V ? 85 : 12;
  const envRisk = (latestReading?.humidity_pct ?? 0) > thresholds.humidityHigh || (latestReading?.temperature_C ?? 0) > thresholds.tempHigh_C ? 70 : 15;
  const visualRisk = Math.min(100, Math.round(latestReading?.camScore ?? 0));
  const dataReliability = latestReading?.moistureValid === 'valid' && latestReading.inaValid === 'valid' ? 95 : 45;

  const steps = [
    "Verify probe placement and eliminate condensation false-positive risks.",
    "Inspect physical battery casing for bulging, crystal salt blooms, or seal cracking.",
    "Check open-circuit voltage stability under zero load vs slight resistive load.",
    "Log thermal scan or DHT reading to check for localized exothermic reaction.",
    "Quarantine cell in flame-retardant containment if suspect electrolyte detected.",
    "Calibrate sensor baseline in System Config if environmental ambient shifted."
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">Risk Intelligence & Evidence Engine</h1>
              <p className="text-xs text-navy-400">Multi-modal classification audit, decision logic transparency, and guided triage</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-navy-400 block uppercase font-mono tracking-wider">Classification Confidence</span>
            <span className={`text-sm font-bold font-mono ${
              assessment?.confidence === 'high' ? 'text-teal-400' :
              assessment?.confidence === 'medium' ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {assessment?.confidence?.toUpperCase() ?? 'INSUFFICIENT DATA'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Status & Heuristic Transparency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {assessment ? (
            <AssessmentBadge assessment={assessment} />
          ) : (
            <div className="p-8 text-center bg-navy-900/60 border border-navy-700 rounded-xl text-navy-400">
              Waiting for telemetry data to evaluate risk profile...
            </div>
          )}
        </div>

        {/* Multi-Dimensional Risk Radar / Bar Breakdown */}
        <div className="bg-navy-900/80 border border-navy-700/70 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Domain Risk Vector Breakdown
            </h2>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-navy-300">Moisture / Liquid Intrusion</span>
                  <span className="font-mono font-bold text-white">{liquidRisk}%</span>
                </div>
                <div className="w-full bg-navy-950 rounded-full h-2 overflow-hidden border border-navy-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${liquidRisk}%`,
                      backgroundColor: liquidRisk > 60 ? 'var(--bad)' : liquidRisk > 30 ? 'var(--warn)' : 'var(--good)'
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-navy-300">Electrical Deviation / Sag</span>
                  <span className="font-mono font-bold text-white">{electricalRisk}%</span>
                </div>
                <div className="w-full bg-navy-950 rounded-full h-2 overflow-hidden border border-navy-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${electricalRisk}%`,
                      backgroundColor: electricalRisk > 60 ? 'var(--bad)' : electricalRisk > 30 ? 'var(--warn)' : 'var(--good)'
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-navy-300">Environmental Stress (RH/Temp)</span>
                  <span className="font-mono font-bold text-white">{envRisk}%</span>
                </div>
                <div className="w-full bg-navy-950 rounded-full h-2 overflow-hidden border border-navy-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${envRisk}%`,
                      backgroundColor: envRisk > 60 ? 'var(--bad)' : envRisk > 30 ? 'var(--warn)' : 'var(--good)'
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-navy-300">Optical Discoloration Score</span>
                  <span className="font-mono font-bold text-white">{visualRisk}%</span>
                </div>
                <div className="w-full bg-navy-950 rounded-full h-2 overflow-hidden border border-navy-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${visualRisk}%`,
                      backgroundColor: visualRisk > 60 ? 'var(--bad)' : visualRisk > 30 ? 'var(--warn)' : 'var(--good)'
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-navy-300">Telemetry Data Integrity</span>
                  <span className="font-mono font-bold text-teal-400">{dataReliability}%</span>
                </div>
                <div className="w-full bg-navy-950 rounded-full h-2 overflow-hidden border border-navy-800">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-teal-400"
                    style={{ width: `${dataReliability}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-navy-950/70 rounded-lg border border-navy-800 text-[11px] text-navy-400 leading-relaxed">
            <span className="text-cyan-400 font-semibold">Note:</span> Domain risk weights correlate live electrical sag, resistive tray conduction, ambient delta, and surface corrosion indexing.
          </div>
        </div>
      </div>

      {/* Decision Engine Transparency & Formula Explanation */}
      <div className="bg-navy-900/60 border border-navy-700/60 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            Decision Engine Logic & Scientific Boundaries
          </h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
            Heuristic Rule-Based v1.4
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-navy-300">
          <div className="p-3 bg-navy-950/80 rounded-lg border border-navy-800/80 space-y-1.5">
            <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <span>Formula Definition</span>
            </div>
            <code className="block font-mono text-[11px] text-amber-300 bg-black/40 p-2 rounded">
              {assessment?.heuristicFormula ?? 'H = 0.45 * WetScore + 0.25 * SagPenalty + 0.15 * TempDelta + 0.15 * CamScore'}
            </code>
            <p className="text-[11px] text-navy-400">
              The aggregate risk index is bounded between 0 and 100. It highlights statistical deviation rather than definitive chemical assay proof.
            </p>
          </div>

          <div className="p-3 bg-navy-950/80 rounded-lg border border-navy-800/80 space-y-1.5">
            <div className="font-semibold text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Scientific & Liability Disclaimer</span>
            </div>
            <p className="text-[11px] text-navy-400 leading-relaxed">
              Resistive liquid detection (YL-83) reacts to conductive liquids including water, electrolyte, and high-humidity condensation. A high wet score indicates conductive fluid presence on the tray, not guaranteed potassium hydroxide (KOH) or lithium salt leakage. Always verify using pH test strips and visual inspection.
            </p>
          </div>
        </div>
      </div>

      {/* Evidence Ledger Section */}
      <div className="bg-navy-900/80 border border-navy-700/70 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-navy-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Evidence Ledger & Sensor Auditing
            </h2>
            <p className="text-xs text-navy-400">Deterministic conditions evaluated for current assessment</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map(c => (
              <button
                key={c.key}
                onClick={() => setSelectedCategory(c.key)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  selectedCategory === c.key
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium'
                    : 'bg-navy-950 text-navy-400 border border-navy-800 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-950/80 text-navy-400 font-mono text-[11px] uppercase">
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Evidence Parameter</th>
                <th className="py-2.5 px-4">Current Value</th>
                <th className="py-2.5 px-4">Critical Threshold</th>
                <th className="py-2.5 px-4">Domain Category</th>
                <th className="py-2.5 px-4">Data Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/50">
              {filteredEvidence.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-navy-400">
                    No evidence items match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredEvidence.map((item, idx) => (
                  <tr key={idx} className={`hover:bg-navy-800/30 transition-colors ${item.triggered ? 'bg-rose-500/5' : ''}`}>
                    <td className="py-3 px-4">
                      {item.triggered ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          TRIGGERED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
                          NOMINAL
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{item.label}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-cyan-300">{item.value}</td>
                    <td className="py-3 px-4 font-mono text-navy-400">{item.threshold}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-navy-950 text-navy-300 border border-navy-800 text-[10px] uppercase font-mono">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] ${
                        item.dataQuality === 'good' ? 'text-teal-400' :
                        item.dataQuality === 'uncertain' ? 'text-amber-400' : 'text-navy-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.dataQuality === 'good' ? 'bg-teal-400' :
                          item.dataQuality === 'uncertain' ? 'bg-amber-400' : 'bg-navy-500'
                        }`} />
                        {item.dataQuality}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operator Action Checklist / Triage Guidance */}
      <div className="bg-navy-900/80 border border-navy-700/70 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cyan-400" />
            Standard Operating Procedure — Inspection Checklist
          </h2>
          <span className="text-xs text-navy-400 font-mono">
            {Object.values(completedSteps).filter(Boolean).length} / {steps.length} verified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {steps.map((step, idx) => {
            const isDone = completedSteps[step] ?? false;
            return (
              <div
                key={idx}
                onClick={() => toggleStep(step)}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                  isDone
                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-200'
                    : 'bg-navy-950/70 border-navy-800 text-navy-300 hover:border-navy-700 hover:text-white'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  isDone ? 'bg-teal-500 border-teal-500 text-black' : 'border-navy-600 bg-navy-900'
                }`}>
                  {isDone && <CheckCircle className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="flex-1 text-xs">
                  <span className={`font-medium ${isDone ? 'line-through text-teal-400/80' : ''}`}>
                    {step}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
