// ============================================================
// CellGuard — ESP32 HTTP Hardware Client
// ============================================================
import type { SensorReading, HardwareStatus } from '../types';

export interface ESP32ApiStatus {
  timestamp: number;
  uptime_s: number;
  mode: string;
  inaAvailable: boolean;
  busVoltage_V: number | null;
  shuntVoltage_uV: number | null;
  cellVoltage_V: number | null;
  current_mA: number | null;
  currentCalibrated: boolean;
  yl83Raw: number | null;
  yl83Wet: boolean | null;
  yl83Valid: boolean;
  humidity_pct: number | null;
  temperature_C: number | null;
  dhtValid: boolean;
  baselineVoltage: number | null;
  activeWarnings: string[];
  firmwareVersion: string;
}

export class ESP32Client {
  private baseUrl: string;
  private timeout: number;
  private pollInterval: number;
  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private onData: (r: SensorReading, status: HardwareStatus) => void;
  private onError: (e: string) => void;
  private status: HardwareStatus;

  constructor(
    baseUrl: string,
    onData: (r: SensorReading, status: HardwareStatus) => void,
    onError: (e: string) => void,
    options: { timeout?: number; pollInterval?: number } = {}
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = options.timeout ?? 5000;
    this.pollInterval = options.pollInterval ?? 1000;
    this.onData = onData;
    this.onError = onError;
    this.status = {
      connected: false,
      mode: 'http',
      esp32Ip: null,
      lastHeartbeat: null,
      stale: false,
      reconnecting: false,
      inaAvailable: false,
      dhtAvailable: false,
      yl83Available: false,
      firmwareVersion: null,
    };
  }

  async connect(): Promise<boolean> {
    try {
      const health = await this.fetchWithTimeout(`${this.baseUrl}/api/health`);
      const json = await health.json();
      if (json.ok) {
        this.status = {
          ...this.status,
          connected: true,
          stale: false,
          lastHeartbeat: Date.now(),
          esp32Ip: this.baseUrl,
          firmwareVersion: json.version ?? null,
        };
        this.startPolling();
        return true;
      }
    } catch (e) {
      this.onError(`Cannot reach ESP32 at ${this.baseUrl}: ${(e as Error).message}`);
    }
    return false;
  }

  disconnect() {
    this.stopPolling();
    this.status = { ...this.status, connected: false };
  }

  private startPolling() {
    if (this.pollHandle !== null) return;
    this.pollHandle = setInterval(() => this.poll(), this.pollInterval);
    this.poll(); // immediate first poll
  }

  private stopPolling() {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  private async poll() {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/api/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ESP32ApiStatus = await res.json();
      const reading = this.mapToReading(json);
      const now = Date.now();
      const stale = this.status.lastHeartbeat !== null && (now - this.status.lastHeartbeat) > 5000;
      this.status = {
        ...this.status,
        connected: true,
        stale,
        lastHeartbeat: now,
        inaAvailable: json.inaAvailable,
        dhtAvailable: json.dhtValid,
        yl83Available: json.yl83Valid,
        firmwareVersion: json.firmwareVersion,
      };
      this.onData(reading, this.status);
    } catch (e) {
      const stale = this.status.lastHeartbeat !== null &&
        (Date.now() - this.status.lastHeartbeat) > 5000;
      if (stale) {
        this.status = { ...this.status, stale: true };
        this.onError(`[STALE] ESP32 not responding: ${(e as Error).message}`);
      }
    }
  }

  private mapToReading(json: ESP32ApiStatus): SensorReading {
    return {
      timestamp: json.timestamp * 1000 || Date.now(),
      source: 'live',
      busVoltage_V: json.busVoltage_V,
      shuntVoltage_mV: json.shuntVoltage_uV !== null ? json.shuntVoltage_uV / 1000 : null,
      cellVoltage_V: json.cellVoltage_V,
      current_mA: json.currentCalibrated ? json.current_mA : null,
      inaValid: json.inaAvailable ? 'valid' : 'unavailable',
      yl83Raw: json.yl83Raw,
      wetScore: json.yl83Raw !== null ? Math.max(0, (4095 - json.yl83Raw) / 4095) : null,
      moistureValid: json.yl83Valid ? 'valid' : 'unavailable',
      temperature_C: json.temperature_C,
      humidity_pct: json.humidity_pct,
      dhtValid: json.dhtValid ? 'valid' : 'unavailable',
      camScore: null,
      uptime_s: json.uptime_s,
      activeWarnings: json.activeWarnings,
    };
  }

  async calibrate(type: 'dry' | 'wet') {
    const res = await this.fetchWithTimeout(`${this.baseUrl}/api/calibrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    return res.json();
  }

  async getHistory() {
    const res = await this.fetchWithTimeout(`${this.baseUrl}/api/history`);
    return res.json();
  }

  private fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), this.timeout);
    return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(id));
  }

  getStatus() { return { ...this.status }; }
  setBaseUrl(url: string) { this.baseUrl = url.replace(/\/$/, ''); }
  setPollInterval(ms: number) {
    this.pollInterval = ms;
    if (this.pollHandle !== null) {
      this.stopPolling();
      this.startPolling();
    }
  }
}

export async function pingEsp32(baseUrl: string, timeoutMs = 3000): Promise<{ ok: boolean; data?: any; error?: string }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/status`;
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Connection failed' };
  } finally {
    clearTimeout(id);
  }
}

