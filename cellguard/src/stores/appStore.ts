// ============================================================
// CellGuard — Global Application Store (Zustand)
// ============================================================
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppPage, AppMode, SensorReading, Assessment, HardwareStatus,
  AppAlert, BatteryProfile, SessionRecord, CalibrationData, ThresholdConfig,
} from '../types';
import { classifyReading, DEFAULT_THRESHOLDS } from '../lib/classifier';
import { saveAlert, saveSession } from '../lib/persistence';

const DEFAULT_CALIBRATION: CalibrationData = {
  yl83DryRef: 3800,
  yl83WetRef: null,
  yl83Threshold: 2000,
  yl83ThresholdDirection: 'below',
  yl83CalibratedAt: null,
  yl83DryHumidityRef: 50,
  inaShuntOhm: null,
  inaBaselineVoltage: null,
  inaCalibratedAt: null,
  dhtBaselineTemp: null,
  dhtBaselineHumidity: null,
};

interface AppState {
  // Navigation
  currentPage: AppPage;
  setPage: (p: AppPage) => void;

  // Operating mode
  mode: AppMode;
  setMode: (m: AppMode) => void;

  // Hardware
  hardwareStatus: HardwareStatus;
  setHardwareStatus: (s: HardwareStatus) => void;
  esp32BaseUrl: string;
  setEsp32BaseUrl: (url: string) => void;
  pollIntervalMs: number;
  setPollIntervalMs: (ms: number) => void;

  // Sensor data
  latestReading: SensorReading | null;
  latestAssessment: Assessment | null;
  readingHistory: SensorReading[];   // bounded ring buffer
  MAX_HISTORY: number;
  pushReading: (r: SensorReading) => void;

  // Calibration
  calibration: CalibrationData;
  setCalibration: (c: Partial<CalibrationData>) => void;

  // Thresholds
  thresholds: ThresholdConfig;
  setThresholds: (t: Partial<ThresholdConfig>) => void;

  // Battery profiles
  batteries: BatteryProfile[];
  activeBatteryId: string | null;
  addBattery: (b: BatteryProfile) => void;
  updateBattery: (b: BatteryProfile) => void;
  removeBattery: (id: string) => void;
  setActiveBatteryId: (id: string | null) => void;

  // Alerts
  alerts: AppAlert[];
  unacknowledgedCount: number;
  addAlert: (a: Omit<AppAlert, 'id' | 'timestamp'>) => void;
  acknowledgeAlert: (id: string) => void;
  clearAlerts: () => void;

  // Sessions
  currentSessionId: string | null;
  sessions: SessionRecord[];
  startSession: () => string;
  endSession: () => void;
  addSession: (s: SessionRecord) => void;

  // 3D twin selected component
  selectedComponent: string | null;
  setSelectedComponent: (c: string | null) => void;

  // Settings
  showSimulationBanner: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      currentPage: 'overview',
      setPage: (p) => set({ currentPage: p }),

      // Mode
      mode: 'simulation',
      setMode: (m) => set({ mode: m }),

      // Hardware
      hardwareStatus: {
        connected: false, mode: 'none', esp32Ip: null, lastHeartbeat: null,
        stale: false, reconnecting: false, inaAvailable: false,
        dhtAvailable: false, yl83Available: false, firmwareVersion: null,
      },
      setHardwareStatus: (s) => set({ hardwareStatus: s }),
      esp32BaseUrl: 'http://192.168.4.1',
      setEsp32BaseUrl: (url) => set({ esp32BaseUrl: url }),
      pollIntervalMs: 1000,
      setPollIntervalMs: (ms) => set({ pollIntervalMs: ms }),

      // Sensor data
      latestReading: null,
      latestAssessment: null,
      readingHistory: [],
      MAX_HISTORY: 300,
      pushReading: (r) => {
        const state = get();
        const assessment = classifyReading(r, state.calibration, state.thresholds);

        // Generate alerts for new issues
        if (assessment.severity === 'critical' || assessment.severity === 'fault') {
          const alert: AppAlert = {
            id: generateId(),
            timestamp: r.timestamp,
            severity: assessment.severity === 'fault' ? 'warning' : 'critical',
            message: `[${r.source.toUpperCase()}] ${assessment.label}: ${assessment.suggestedNextStep.slice(0, 100)}`,
            evidenceCategory: assessment.evidenceItems.find(e => e.triggered)?.category ?? 'sensor_reliability',
            acknowledged: false,
            source: r.source,
          };
          // Debounce: don't create alert if same label in last 30s
          const recent = state.alerts.find(a =>
            a.message.includes(assessment.label) && (r.timestamp - a.timestamp) < 30000
          );
          if (!recent) {
            saveAlert(alert).catch(() => {});
            set(s => ({
              alerts: [alert, ...s.alerts].slice(0, 200),
              unacknowledgedCount: s.unacknowledgedCount + 1,
            }));
          }
        }

        set(s => ({
          latestReading: r,
          latestAssessment: assessment,
          readingHistory: [...s.readingHistory, r].slice(-s.MAX_HISTORY),
        }));
      },

      // Calibration
      calibration: DEFAULT_CALIBRATION,
      setCalibration: (c) => set(s => ({ calibration: { ...s.calibration, ...c } })),

      // Thresholds
      thresholds: DEFAULT_THRESHOLDS,
      setThresholds: (t) => set(s => ({ thresholds: { ...s.thresholds, ...t } })),

      // Batteries
      batteries: [],
      activeBatteryId: null,
      addBattery: (b) => set(s => ({ batteries: [...s.batteries, b] })),
      updateBattery: (b) => set(s => ({
        batteries: s.batteries.map(x => x.id === b.id ? b : x),
      })),
      removeBattery: (id) => set(s => ({
        batteries: s.batteries.filter(x => x.id !== id),
        activeBatteryId: s.activeBatteryId === id ? null : s.activeBatteryId,
      })),
      setActiveBatteryId: (id) => set({ activeBatteryId: id }),

      // Alerts
      alerts: [],
      unacknowledgedCount: 0,
      addAlert: (a) => {
        const alert: AppAlert = { ...a, id: generateId(), timestamp: Date.now() };
        saveAlert(alert).catch(() => {});
        set(s => ({
          alerts: [alert, ...s.alerts].slice(0, 200),
          unacknowledgedCount: s.unacknowledgedCount + (a.acknowledged ? 0 : 1),
        }));
      },
      acknowledgeAlert: (id) => set(s => ({
        alerts: s.alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a),
        unacknowledgedCount: Math.max(0, s.unacknowledgedCount - 1),
      })),
      clearAlerts: () => set({ alerts: [], unacknowledgedCount: 0 }),

      // Sessions
      currentSessionId: null,
      sessions: [],
      startSession: () => {
        const id = generateId();
        set({ currentSessionId: id });
        return id;
      },
      endSession: () => {
        const state = get();
        if (!state.currentSessionId) return;
        const session: SessionRecord = {
          id: state.currentSessionId,
          startedAt: state.readingHistory[0]?.timestamp ?? Date.now(),
          endedAt: Date.now(),
          source: state.mode === 'simulation' ? 'simulated' : 'live',
          batteryId: state.activeBatteryId,
          readings: [...state.readingHistory],
          assessments: state.latestAssessment ? [state.latestAssessment] : [],
          alerts: state.alerts.filter(a => a.source === (state.mode === 'simulation' ? 'simulated' : 'live')),
          anomalyScore: state.latestAssessment?.heuristicScore ?? 0,
        };
        saveSession(session).catch(() => {});
        set(s => ({
          currentSessionId: null,
          sessions: [session, ...s.sessions].slice(0, 100),
        }));
      },
      addSession: (s) => set(st => ({ sessions: [s, ...st.sessions].slice(0, 100) })),

      // 3D
      selectedComponent: null,
      setSelectedComponent: (c) => set({ selectedComponent: c }),

      // Settings
      showSimulationBanner: true,
      darkMode: true,
      toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),
    }),
    {
      name: 'cellguard-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        esp32BaseUrl: state.esp32BaseUrl,
        pollIntervalMs: state.pollIntervalMs,
        calibration: state.calibration,
        thresholds: state.thresholds,
        batteries: state.batteries,
        activeBatteryId: state.activeBatteryId,
        darkMode: state.darkMode,
        sessions: state.sessions.slice(0, 20), // keep last 20 in localStorage
      }),
    }
  )
);
