// ============================================================
// CellGuard — Explainable Risk & Anomaly Engine
// ============================================================
import type {
  SensorReading,
  Assessment,
  EvidenceItem,
  ClassificationLabel,
  CalibrationData,
  ThresholdConfig,
} from '../types';

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  ocvGood_V: 1.45,
  ocvWeak_V: 1.25,
  riSuspect_Ohm: 2.0,
  sagMin_V: 1.0,
  wetLeak: 0.25,
  wetSuspect: 0.10,
  camLeak: 60,
  camSuspect: 30,
  humidityHigh: 75,
  tempHigh_C: 40,
  tempLow_C: 0,
  voltageDeviationAlert_V: 0.05,
};

/**
 * Heuristic anomaly score formula (documented):
 *   score = Σ (weight_i × triggered_i) / Σ weight_i × 100
 * where triggered = 1 if threshold exceeded, 0 otherwise.
 * This is NOT a calibrated probability of battery failure.
 */
function computeHeuristicScore(items: EvidenceItem[]): number {
  const weights: Record<string, number> = {
    liquid: 35,
    electrical: 25,
    visual: 20,
    environmental: 10,
    sensor_reliability: 10,
  };
  let total = 0, triggered = 0;
  for (const item of items) {
    const w = weights[item.category] ?? 10;
    total += w;
    if (item.triggered) triggered += w;
  }
  return total === 0 ? 0 : Math.round((triggered / total) * 100);
}

function dataQuality(valid: string | undefined): 'good' | 'uncertain' | 'unavailable' {
  if (!valid || valid === 'unavailable' || valid === 'fault') return 'unavailable';
  if (valid === 'stale') return 'uncertain';
  return 'good';
}

export function classifyReading(
  reading: SensorReading,
  calib: CalibrationData,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS,
): Assessment {
  const evidence: EvidenceItem[] = [];
  const uncertainty: string[] = [];

  // --- 1. Liquid presence ---
  const moistureQuality = dataQuality(reading.moistureValid);
  if (moistureQuality === 'unavailable') {
    evidence.push({
      category: 'liquid',
      label: 'Moisture sensor unavailable',
      value: 'N/A',
      threshold: `wet_score > ${thresholds.wetLeak}`,
      triggered: false,
      dataQuality: 'unavailable',
    });
    uncertainty.push('YL-83 moisture sensor unavailable — cannot confirm or deny liquid presence.');
  } else {
    const wet = reading.wetScore ?? 0;
    evidence.push({
      category: 'liquid',
      label: 'Moisture wet-score',
      value: wet.toFixed(3),
      threshold: `LEAK > ${thresholds.wetLeak}, SUSPECT > ${thresholds.wetSuspect}`,
      triggered: wet > thresholds.wetSuspect,
      dataQuality: moistureQuality,
    });
    if (moistureQuality === 'uncertain')
      uncertainty.push('YL-83 reading is stale — moisture data may be outdated.');
  }

  // YL-83 raw ADC
  if (reading.yl83Raw !== null) {
    evidence.push({
      category: 'liquid',
      label: 'YL-83 raw ADC',
      value: reading.yl83Raw.toFixed(0),
      threshold: `baseline: ${calib.yl83DryRef.toFixed(0)}`,
      triggered: reading.yl83Raw < calib.yl83DryRef * 0.85,
      dataQuality: moistureQuality,
    });
  }

  // --- 2. Electrical anomaly ---
  const inaQuality = dataQuality(reading.inaValid);
  if (inaQuality === 'unavailable') {
    evidence.push({
      category: 'electrical',
      label: 'INA voltage sensor unavailable',
      value: 'N/A',
      threshold: `busV > ${thresholds.ocvGood_V}V`,
      triggered: false,
      dataQuality: 'unavailable',
    });
    uncertainty.push('INA219/INA226 unavailable — electrical state unknown.');
  } else {
    const cellV = reading.cellVoltage_V ?? reading.busVoltage_V;
    if (cellV !== null) {
      evidence.push({
        category: 'electrical',
        label: 'Cell voltage',
        value: `${cellV.toFixed(3)} V`,
        threshold: `GOOD ≥ ${thresholds.ocvGood_V} V, WEAK < ${thresholds.ocvWeak_V} V`,
        triggered: cellV < thresholds.ocvWeak_V,
        dataQuality: inaQuality,
      });
    }
    if (calib.inaBaselineVoltage !== null && cellV !== null) {
      const dev = Math.abs(cellV - calib.inaBaselineVoltage);
      evidence.push({
        category: 'electrical',
        label: 'Voltage deviation from baseline',
        value: `${dev.toFixed(3)} V`,
        threshold: `alert > ${thresholds.voltageDeviationAlert_V} V`,
        triggered: dev > thresholds.voltageDeviationAlert_V,
        dataQuality: inaQuality,
      });
    }
    if (reading.current_mA === null) {
      uncertainty.push('Current measurement unavailable — shunt resistance not calibrated. Do not infer current or internal resistance.');
    }
    if (inaQuality === 'uncertain')
      uncertainty.push('INA voltage reading is stale — electrical data may be outdated.');
  }

  // --- 3. Environmental context ---
  const dhtQuality = dataQuality(reading.dhtValid);
  const hum = reading.humidity_pct;
  const temp = reading.temperature_C;

  if (dhtQuality === 'unavailable') {
    evidence.push({
      category: 'environmental',
      label: 'DHT22 sensor unavailable',
      value: 'N/A',
      threshold: `humidity < ${thresholds.humidityHigh}%`,
      triggered: false,
      dataQuality: 'unavailable',
    });
    uncertainty.push('DHT22 unavailable — cannot assess condensation risk.');
  } else {
    if (hum !== null) {
      const highHum = hum > thresholds.humidityHigh;
      evidence.push({
        category: 'environmental',
        label: 'Ambient humidity',
        value: `${hum.toFixed(1)} %`,
        threshold: `high > ${thresholds.humidityHigh} %`,
        triggered: highHum,
        dataQuality: dhtQuality,
      });
      if (highHum) {
        uncertainty.push(
          `High ambient humidity (${hum.toFixed(0)}%) may cause condensation. ` +
          'Moisture detection is less specific under high humidity — cannot confirm battery source.'
        );
      }
    }
    if (temp !== null) {
      const highTemp = temp > thresholds.tempHigh_C;
      const lowTemp = temp < thresholds.tempLow_C;
      evidence.push({
        category: 'environmental',
        label: 'Ambient temperature',
        value: `${temp.toFixed(1)} °C`,
        threshold: `high > ${thresholds.tempHigh_C} °C, low < ${thresholds.tempLow_C} °C`,
        triggered: highTemp || lowTemp,
        dataQuality: dhtQuality,
      });
      if (highTemp) uncertainty.push(`High temperature (${temp.toFixed(0)}°C) may accelerate chemical degradation.`);
      if (lowTemp) uncertainty.push(`Low temperature (${temp.toFixed(0)}°C) suppresses electrolyte activity — OCV may be misleadingly low.`);
    }
  }

  // --- 4. Visual inspection evidence ---
  const camScore = reading.camScore;
  if (camScore === null) {
    evidence.push({
      category: 'visual',
      label: 'Camera inspection',
      value: 'Not available',
      threshold: `LEAK ≥ ${thresholds.camLeak}, SUSPECT ≥ ${thresholds.camSuspect}`,
      triggered: false,
      dataQuality: 'unavailable',
    });
    uncertainty.push('No camera inspection performed. Absence of visual evidence does NOT confirm the battery is clean.');
  } else {
    evidence.push({
      category: 'visual',
      label: 'Visual crust/corrosion score',
      value: camScore.toFixed(0),
      threshold: `LEAK ≥ ${thresholds.camLeak}, SUSPECT ≥ ${thresholds.camSuspect}`,
      triggered: camScore >= thresholds.camSuspect,
      dataQuality: 'uncertain', // camera is always heuristic
    });
    uncertainty.push('Camera score is a heuristic colour-region metric, not a chemical identification.');
  }

  // --- 5. Sensor reliability ---
  const faultCount = [reading.inaValid, reading.moistureValid, reading.dhtValid]
    .filter(v => v === 'fault' || v === 'unavailable').length;
  evidence.push({
    category: 'sensor_reliability',
    label: 'Sensor fault count',
    value: `${faultCount}/3`,
    threshold: 'any fault = reduced confidence',
    triggered: faultCount > 0,
    dataQuality: faultCount === 3 ? 'unavailable' : faultCount > 0 ? 'uncertain' : 'good',
  });

  // --- Classification logic ---
  const wet = reading.wetScore ?? 0;
  const cellV = reading.cellVoltage_V ?? reading.busVoltage_V ?? 999;
  const liquidTriggered = wet > thresholds.wetLeak || (camScore !== null && camScore >= thresholds.camLeak);
  const electricalTriggered = cellV < thresholds.ocvWeak_V;
  const multipleCategories =
    (moistureQuality !== 'unavailable' && wet > thresholds.wetSuspect ? 1 : 0) +
    (inaQuality !== 'unavailable' && electricalTriggered ? 1 : 0) +
    (camScore !== null && camScore >= thresholds.camSuspect ? 1 : 0);

  let label: ClassificationLabel;
  let severity: Assessment['severity'];

  if (faultCount >= 2 && reading.source === 'live') {
    label = 'SENSOR_FAULT';
    severity = 'fault';
  } else if (moistureQuality === 'unavailable' && inaQuality === 'unavailable') {
    label = 'INSUFFICIENT_DATA';
    severity = 'fault';
  } else if (liquidTriggered) {
    label = multipleCategories >= 2 ? 'SUSPECTED_LEAK' : 'LIQUID_DETECTED';
    severity = 'critical';
  } else if (multipleCategories >= 2) {
    label = 'SUSPECTED_LEAK';
    severity = 'critical';
  } else if (electricalTriggered && moistureQuality !== 'unavailable') {
    label = 'ELECTRICAL_ANOMALY';
    severity = 'warning';
  } else if (wet > thresholds.wetSuspect || (camScore !== null && camScore >= thresholds.camSuspect)) {
    label = 'LIQUID_DETECTED';
    severity = 'warning';
  } else {
    label = 'NORMAL';
    severity = 'normal';
  }

  // Confidence
  let confidence: Assessment['confidence'];
  if (faultCount >= 2 || moistureQuality === 'unavailable') confidence = 'insufficient';
  else if (uncertainty.length >= 3 || dhtQuality === 'unavailable') confidence = 'low';
  else if (uncertainty.length >= 1) confidence = 'medium';
  else confidence = 'high';

  // Next step
  const suggestedNextStep = (() => {
    if (label === 'SENSOR_FAULT') return 'Check sensor wiring and restart the ESP32. Verify I²C address (INA at 0x40), DHT data pin (GPIO 4), and YL-83 ADC pin (GPIO 34).';
    if (label === 'INSUFFICIENT_DATA') return 'Reconnect sensors and allow the system to collect a full reading cycle before assessing.';
    if (label === 'SUSPECTED_LEAK') return 'STOP USE. Inspect the battery collection tray visually. Handle with gloves. Follow safe battery disposal procedure.';
    if (label === 'LIQUID_DETECTED') return 'Physically inspect the collection tray and battery exterior for residue. Capture a camera image for the record.';
    if (label === 'ELECTRICAL_ANOMALY') return 'Check battery terminals for corrosion. Take a camera image and compare with baseline. Record the session for further review.';
    if (label === 'NORMAL') return 'Continue monitoring. Run a camera inspection periodically to supplement sensor readings.';
    return 'Review evidence items and consult operator manual.';
  })();

  const heuristicScore = computeHeuristicScore(evidence);

  return {
    label,
    severity,
    confidence,
    evidenceItems: evidence,
    uncertaintyReasons: uncertainty,
    suggestedNextStep,
    timestamp: reading.timestamp,
    heuristicScore,
    heuristicFormula:
      'Σ(weight_i × triggered_i) / Σ(weight_i) × 100. ' +
      'Weights: liquid=35, electrical=25, visual=20, environmental=10, sensor_reliability=10. ' +
      'This is a heuristic indicator, NOT a calibrated probability of battery failure.',
  };
}

export { DEFAULT_THRESHOLDS };
