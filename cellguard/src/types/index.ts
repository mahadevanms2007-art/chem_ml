// ============================================================
// CellGuard — Shared Types
// ============================================================

export type DataSource = 'live' | 'simulated' | 'unknown';

export type SensorValidity = 'valid' | 'stale' | 'fault' | 'unavailable';

export interface SensorReading {
  timestamp: number;          // Unix ms
  source: DataSource;

  // INA219/INA226 — electrical
  busVoltage_V: number | null;
  shuntVoltage_mV: number | null;
  cellVoltage_V: number | null;   // bus + shunt drop
  current_mA: number | null;      // null when shunt not calibrated
  inaValid: SensorValidity;

  // YL-83 — moisture
  yl83Raw: number | null;         // 0..4095 ADC
  wetScore: number | null;        // 0..1 normalised
  moistureValid: SensorValidity;

  // DHT22 / DHT11
  temperature_C: number | null;
  humidity_pct: number | null;
  dhtValid: SensorValidity;

  // Camera (from ML model or cam_score.py)
  camScore: number | null;        // 0..100

  // Derived
  uptime_s: number | null;
  activeWarnings: string[];
}

export type ClassificationLabel =
  | 'NORMAL'
  | 'LIQUID_DETECTED'
  | 'ELECTRICAL_ANOMALY'
  | 'SUSPECTED_LEAK'
  | 'SENSOR_FAULT'
  | 'INSUFFICIENT_DATA';

export interface EvidenceItem {
  category: EvidenceCategory;
  label: string;
  value: string;
  threshold: string;
  triggered: boolean;
  dataQuality: 'good' | 'uncertain' | 'unavailable';
}

export type EvidenceCategory =
  | 'liquid'
  | 'electrical'
  | 'environmental'
  | 'visual'
  | 'sensor_reliability';

export interface Assessment {
  label: ClassificationLabel;
  severity: 'normal' | 'warning' | 'critical' | 'fault';
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  evidenceItems: EvidenceItem[];
  uncertaintyReasons: string[];
  suggestedNextStep: string;
  timestamp: number;
  heuristicScore: number | null;  // 0..100, labelled as heuristic
  heuristicFormula: string;
}

export interface CalibrationData {
  yl83DryRef: number;
  yl83WetRef: number | null;
  yl83Threshold: number;
  yl83ThresholdDirection: 'above' | 'below';
  yl83CalibratedAt: number | null;
  yl83DryHumidityRef: number;

  inaShuntOhm: number | null;   // null = uncalibrated, must not infer current
  inaBaselineVoltage: number | null;
  inaCalibratedAt: number | null;

  dhtBaselineTemp: number | null;
  dhtBaselineHumidity: number | null;
}

export interface ThresholdConfig {
  ocvGood_V: number;
  ocvWeak_V: number;
  riSuspect_Ohm: number;
  sagMin_V: number;
  wetLeak: number;
  wetSuspect: number;
  camLeak: number;
  camSuspect: number;
  humidityHigh: number;
  tempHigh_C: number;
  tempLow_C: number;
  voltageDeviationAlert_V: number;
}

export interface BatteryProfile {
  id: string;
  label: string;
  chemistry: 'zinc-carbon' | 'lithium-ion' | 'NiMH' | 'lead-acid' | 'alkaline' | 'other';
  manufacturer: string;
  model: string;
  nominalVoltage_V: number;
  ratedCapacity_mAh: number | null;
  firstInspectedAt: number;
  notes: string;
  thresholds: ThresholdConfig;
  baselineReadings: Partial<SensorReading> | null;
  inspectionHistory: InspectionRecord[];
}

export interface InspectionRecord {
  id: string;
  batteryId: string;
  timestamp: number;
  source: DataSource;
  reading: SensorReading;
  assessment: Assessment;
  cameraImageId: string | null;
  baselineImageId: string | null;
  operatorNotes: string;
  sessionId: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  expectedLabel: ClassificationLabel;
  virtualSensors: Partial<SensorReading>;
  timeSeriesSteps?: Partial<SensorReading>[];
  stepIntervalMs?: number;
}

export interface HardwareStatus {
  connected: boolean;
  mode: 'serial' | 'http' | 'none';
  esp32Ip: string | null;
  lastHeartbeat: number | null;
  stale: boolean;
  reconnecting: boolean;
  inaAvailable: boolean;
  dhtAvailable: boolean;
  yl83Available: boolean;
  firmwareVersion: string | null;
}

export type AppPage =
  | 'overview'
  | 'digital-twin'
  | 'live-telemetry'
  | 'camera-inspection'
  | 'risk-intelligence'
  | 'event-timeline'
  | 'simulation-lab'
  | 'battery-registry'
  | 'reports'
  | 'system-config';

export type AppMode = 'live' | 'simulation';

export interface AppAlert {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  evidenceCategory: EvidenceCategory;
  acknowledged: boolean;
  source: DataSource;
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number | null;
  source: DataSource;
  batteryId: string | null;
  readings: SensorReading[];
  assessments: Assessment[];
  alerts: AppAlert[];
  anomalyScore: number;  // documented: avg heuristic score * fraction of triggered assessments
}
