// ============================================================
// CellGuard — Simulation Engine
// All simulated data is clearly tagged source:'simulated'
// ============================================================
import type { SensorReading, SimulationScenario } from '../types';

function simReading(overrides: Partial<SensorReading>): SensorReading {
  return {
    timestamp: Date.now(),
    source: 'simulated',
    busVoltage_V: 1.52,
    shuntVoltage_mV: 0.5,
    cellVoltage_V: 1.52,
    current_mA: null,
    inaValid: 'valid',
    yl83Raw: 3800,
    wetScore: 0.02,
    moistureValid: 'valid',
    temperature_C: 24.0,
    humidity_pct: 52.0,
    dhtValid: 'valid',
    camScore: null,
    uptime_s: 0,
    activeWarnings: [],
    ...overrides,
  };
}

export const SCENARIOS: SimulationScenario[] = [
  {
    id: 'normal',
    name: 'Normal Operation',
    description: 'All sensors within nominal range. No alerts. Battery appears healthy.',
    expectedLabel: 'NORMAL',
    virtualSensors: simReading({
      busVoltage_V: 1.54, cellVoltage_V: 1.54,
      wetScore: 0.02, yl83Raw: 3850,
      temperature_C: 24, humidity_pct: 50,
    }),
  },
  {
    id: 'water_exposure',
    name: 'External Water Exposure',
    description: 'Simulates sudden water contact with the collection tray. YL-83 reading drops sharply.',
    expectedLabel: 'LIQUID_DETECTED',
    virtualSensors: simReading({
      wetScore: 0.55, yl83Raw: 1200,
      temperature_C: 25, humidity_pct: 60,
      busVoltage_V: 1.52, cellVoltage_V: 1.52,
      activeWarnings: ['[SIM] YL-83 liquid detection threshold exceeded'],
    }),
  },
  {
    id: 'high_humidity',
    name: 'High Humidity / Condensation Risk',
    description: 'High ambient humidity. Moisture sensor may trigger. High humidity reduces confidence in leak attribution.',
    expectedLabel: 'LIQUID_DETECTED',
    virtualSensors: simReading({
      wetScore: 0.18, yl83Raw: 2900,
      temperature_C: 30, humidity_pct: 88,
      activeWarnings: ['[SIM] High ambient humidity — condensation possible'],
    }),
  },
  {
    id: 'unexplained_liquid',
    name: 'Unexplained Liquid Detection',
    description: 'Moisture sensor triggered, humidity normal, no camera evidence. Source is ambiguous.',
    expectedLabel: 'LIQUID_DETECTED',
    virtualSensors: simReading({
      wetScore: 0.31, yl83Raw: 1800,
      humidity_pct: 48, temperature_C: 23,
      camScore: null,
    }),
  },
  {
    id: 'voltage_deviation',
    name: 'Voltage Deviation',
    description: 'Cell voltage below weak threshold. No moisture detected. Electrical anomaly only.',
    expectedLabel: 'ELECTRICAL_ANOMALY',
    virtualSensors: simReading({
      cellVoltage_V: 1.18, busVoltage_V: 1.18,
      wetScore: 0.03, yl83Raw: 3750,
      activeWarnings: ['[SIM] Cell voltage below WEAK threshold'],
    }),
  },
  {
    id: 'sensor_disconnect',
    name: 'Sensor Disconnection',
    description: 'INA and DHT22 become unavailable. Only YL-83 reading remains.',
    expectedLabel: 'SENSOR_FAULT',
    virtualSensors: simReading({
      busVoltage_V: null, cellVoltage_V: null, shuntVoltage_mV: null,
      inaValid: 'unavailable',
      temperature_C: null, humidity_pct: null, dhtValid: 'unavailable',
      wetScore: 0.04, yl83Raw: 3800, moistureValid: 'valid',
      activeWarnings: ['[SIM] INA unavailable', '[SIM] DHT22 unavailable'],
    }),
  },
  {
    id: 'conflicting_evidence',
    name: 'Conflicting Sensor Evidence',
    description: 'Moisture sensor triggered but camera shows no visible corrosion. Environmental humidity is high. Assessment confidence is low.',
    expectedLabel: 'SUSPECTED_LEAK',
    virtualSensors: simReading({
      wetScore: 0.28, yl83Raw: 1900,
      humidity_pct: 80, temperature_C: 27,
      camScore: 10,
      cellVoltage_V: 1.22, busVoltage_V: 1.22,
      activeWarnings: ['[SIM] Conflicting evidence — moisture + low voltage + high humidity'],
    }),
  },
  {
    id: 'missing_camera',
    name: 'Missing Camera Evidence',
    description: 'Sensors show borderline readings but no camera inspection was performed.',
    expectedLabel: 'LIQUID_DETECTED',
    virtualSensors: simReading({
      wetScore: 0.14, yl83Raw: 2600,
      humidity_pct: 55, temperature_C: 25,
      camScore: null,
      activeWarnings: ['[SIM] Camera inspection not available'],
    }),
  },
  {
    id: 'sensor_noise',
    name: 'Intermittent Sensor Noise',
    description: 'YL-83 produces sporadic high readings without sustained liquid presence.',
    expectedLabel: 'NORMAL',
    virtualSensors: simReading({
      wetScore: 0.07, yl83Raw: 3100,
      moistureValid: 'stale',
      humidity_pct: 51, temperature_C: 23,
      activeWarnings: ['[SIM] YL-83 reading intermittent — data quality uncertain'],
    }),
    timeSeriesSteps: [
      simReading({ wetScore: 0.02, yl83Raw: 3800 }),
      simReading({ wetScore: 0.18, yl83Raw: 2700, moistureValid: 'stale' }),
      simReading({ wetScore: 0.03, yl83Raw: 3750 }),
      simReading({ wetScore: 0.22, yl83Raw: 2400, moistureValid: 'stale' }),
      simReading({ wetScore: 0.05, yl83Raw: 3700 }),
    ],
    stepIntervalMs: 1500,
  },
];

export class SimulationEngine {
  private scenario: SimulationScenario;
  private stepIndex = 0;
  private playing = false;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private speed = 1.0;
  private onUpdate: (r: SensorReading) => void;
  private startTime: number;

  constructor(scenarioId: string, onUpdate: (r: SensorReading) => void) {
    this.scenario = SCENARIOS.find(s => s.id === scenarioId) ?? SCENARIOS[0];
    this.onUpdate = onUpdate;
    this.startTime = Date.now();
  }

  setScenario(id: string) {
    this.stop();
    this.scenario = SCENARIOS.find(s => s.id === id) ?? SCENARIOS[0];
    this.stepIndex = 0;
    this.startTime = Date.now();
    this.emitCurrent();
  }

  setSpeed(speed: number) { this.speed = Math.max(0.1, Math.min(10, speed)); }

  private emitCurrent() {
    const steps = this.scenario.timeSeriesSteps;
    if (steps && steps.length > 0) {
      const base = this.scenario.virtualSensors;
      const override = steps[this.stepIndex % steps.length];
      this.onUpdate({
        ...base,
        ...override,
        timestamp: Date.now(),
        source: 'simulated',
        uptime_s: Math.floor((Date.now() - this.startTime) / 1000),
      } as SensorReading);
    } else {
      this.onUpdate({
        ...this.scenario.virtualSensors,
        timestamp: Date.now(),
        source: 'simulated',
        uptime_s: Math.floor((Date.now() - this.startTime) / 1000),
      } as SensorReading);
    }
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    const interval = (this.scenario.stepIntervalMs ?? 1000) / this.speed;
    this.emitCurrent();
    this.intervalHandle = setInterval(() => {
      this.stepIndex++;
      this.emitCurrent();
    }, interval);
  }

  pause() {
    this.playing = false;
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  stop() {
    this.pause();
    this.stepIndex = 0;
  }

  step() {
    this.stepIndex++;
    this.emitCurrent();
  }

  reset() {
    this.stop();
    this.startTime = Date.now();
    this.emitCurrent();
  }

  isPlaying() { return this.playing; }
  currentScenario() { return this.scenario; }
  currentStep() { return this.stepIndex; }
}

// Generate simulation time-series for charts (N points)
export function generateSimTimeSeries(scenarioId: string, n = 60): SensorReading[] {
  const scenario = SCENARIOS.find(s => s.id === scenarioId) ?? SCENARIOS[0];
  const base = scenario.virtualSensors as SensorReading;
  const steps = scenario.timeSeriesSteps;
  const now = Date.now();

  return Array.from({ length: n }, (_, i) => {
    const t = now - (n - i) * 1000;
    const noise = (max: number) => (Math.random() - 0.5) * max;
    if (steps && steps.length > 0) {
      const step = steps[i % steps.length] as SensorReading;
      return { ...base, ...step, timestamp: t, source: 'simulated' };
    }
    return {
      ...base,
      timestamp: t,
      source: 'simulated',
      busVoltage_V: base.busVoltage_V !== null ? base.busVoltage_V + noise(0.02) : null,
      cellVoltage_V: base.cellVoltage_V !== null ? base.cellVoltage_V + noise(0.02) : null,
      yl83Raw: base.yl83Raw !== null ? Math.max(0, Math.min(4095, base.yl83Raw + noise(100))) : null,
      wetScore: base.wetScore !== null ? Math.max(0, Math.min(1, base.wetScore + noise(0.02))) : null,
      humidity_pct: base.humidity_pct !== null ? base.humidity_pct + noise(2) : null,
      temperature_C: base.temperature_C !== null ? base.temperature_C + noise(0.5) : null,
    };
  });
}
