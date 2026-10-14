# CellGuard & Chem ML — Battery Screening & Digital Twin Platform

ESP32-based battery leakage screening, electrical anomaly monitoring, ML-assisted camera inspection, and interactive 3D digital-twin platform.

## Overview

- **Hardware Firmware:** PlatformIO project targeting ESP32 (INA219, YL-83 rain/moisture sensor, DHT11 temp/humidity, buzzer, and indicator LED).
- **Web Platform (`cellguard/`):** React, TypeScript, Three.js / React Three Fiber 3D digital twin, Recharts telemetry charts, and camera corrosion inspection.
- **ML & Computer Vision (`tools/`):** Phone camera stream analyzer and corrosion / efflorescence scoring sending `CAM:<score>` serial telemetry to ESP32.

## Quick Start

### 1. Web Dashboard & Digital Twin
```bash
cd cellguard
npm install
npm run dev -- --host
```
Open `http://localhost:5173` in your browser.

### 2. ESP32 Firmware
Open the root directory in PlatformIO (or VS Code / Antigravity IDE with PlatformIO), then Build & Upload to ESP32:
- Pins: INA219 (SDA 21 / SCL 22), YL-83 AO 34 (VCC 25), DHT11 4, red LED 18, buzzer 19, START button 27 to GND.
- Monitor at 115200 baud.

### 3. Phone Camera ML Inspection
```bash
python tools/cam_score.py /dev/ttyUSB0 http://<PHONE_IP>:8080/video
```
Analyzes phone video stream for alkaline battery potassium hydroxide (KOH) crust, verdigris corrosion, and transmits visual defect scores in real time.
