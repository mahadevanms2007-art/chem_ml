#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_INA219.h>
#include <DHT.h>
#include <esp_task_wdt.h>
#include "config.h"

Adafruit_INA219 ina;
DHT dht(PIN_DHT, DHT11);

enum Result { NONE, GOOD, SUSPECT, LEAKING };
Result result = NONE;
int camScore = -1;          // from laptop, "CAM:xx\n" over serial; -1 = no data
float dryRef = 4095, humRef = 50;
String rxLine;
void runTest();        // forward declaration
void streamSensors();  // forward declaration

// ---------- buzzer (works on arduino-esp32 v2 and v3) ----------
void buzz(int freq) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  if (freq) ledcWriteTone(PIN_BUZZER, freq); else ledcWrite(PIN_BUZZER, 0);
#else
  ledcWriteTone(0, freq);
#endif
}
void buzzInit() {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(PIN_BUZZER, 2000, 8);
#else
  ledcSetup(0, 2000, 8); ledcAttachPin(PIN_BUZZER, 0);
#endif
}
void beep(int f, int ms) { buzz(f); delay(ms); buzz(0); }

// ---------- serial input from laptop ----------
void pollSerial() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      if (rxLine.startsWith("CAM:")) camScore = constrain(rxLine.substring(4).toInt(), 0, 100);
      else if (rxLine == "START" || rxLine == "T") { Serial.println("[CMD] Test triggered via serial."); runTest(); }
      rxLine = "";
    } else if (c != '\r') rxLine += c;
  }
}
void delayPoll(uint32_t ms) {
  uint32_t t = millis();
  while (millis() - t < ms) {
    pollSerial();
    streamSensors();
    esp_task_wdt_reset();   // feed watchdog — prevents USB-disconnect resets
    yield();                // allow background WiFi/BT tasks
    delay(5);
  }
}

// ---------- sensors ----------
float readWetRaw() {
  digitalWrite(PIN_YL83_VCC, HIGH); delay(20);
  long s = 0; for (int i = 0; i < 8; i++) { s += analogRead(PIN_YL83_AO); delay(2); }
  digitalWrite(PIN_YL83_VCC, LOW);
  return s / 8.0f;
}
// 0 = dry .. 1 = very wet; dry baseline shifted for humidity (rough)
float wetScore(float hum) {
  float ref = dryRef * (1.0f - 0.0005f * (hum - humRef));
  return constrain((ref - readWetRaw()) / ref, 0.0f, 1.0f);
}
float readOCV() {  // no load: bus voltage + shunt drop = cell voltage
  float s = 0;
  for (int i = 0; i < N_AVG; i++) { s += ina.getBusVoltage_V() + ina.getShuntVoltage_mV() / 1000.0f; delay(5); }
  return s / N_AVG;
}

// ---------- the test ----------
void runTest() {
  result = NONE; digitalWrite(PIN_LED, LOW);
  Serial.println("\n=== TEST START ===");
  beep(2500, 100);

  float t = dht.readTemperature(), h = dht.readHumidity();
  if (isnan(t) || isnan(h)) { t = 25; h = 50; Serial.println("DHT11 failed, using 25C/50%"); }

  float wet = wetScore(h);
  float ocv = readOCV();
  Serial.printf("T=%.0fC H=%.0f%% wet=%.2f OCV=%.3fV\n", t, h, wet, ocv);

  Serial.println("Touch load jumper to battery- for <1 s ...");
  digitalWrite(PIN_LED, HIGH); beep(3000, 100); delay(100); beep(3000, 100);
  bool loaded = false; uint32_t t0 = millis();
  while (millis() - t0 < LOAD_WAIT_MS) {
    pollSerial();
    streamSensors();
    esp_task_wdt_reset();
    yield();
    if (ina.getCurrent_mA() > LOAD_DETECT_MA) { loaded = true; break; }
    delay(2);
  }
  float vLoad = 0, iLoad = 0, ri = NAN; int n = 0;
  if (loaded) {
    while (n < N_AVG && ina.getCurrent_mA() > LOAD_DETECT_MA) {
      vLoad += ina.getBusVoltage_V() + ina.getShuntVoltage_mV() / 1000.0f;
      iLoad += ina.getCurrent_mA() / 1000.0f; n++; delay(5);
    }
    if (n >= 4) {
      vLoad /= n; iLoad /= n;
      ri = (ocv - vLoad) / iLoad;
      ri = ri / (1.0f + 0.01f * (25.0f - t));   // rough correction to 25 C
      Serial.printf("Vload=%.3fV I=%.0fmA Ri(25C)=%.2f ohm (n=%d)\n", vLoad, iLoad * 1000, ri, n);
    } else loaded = false;
  }
  if (!loaded) Serial.println("No valid load pulse: sag/Ri skipped");
  digitalWrite(PIN_LED, LOW);

  Serial.println("Resting...");
  delayPoll(REST_MS);
  float ocv2 = readOCV();
  Serial.printf("OCV after rest=%.3fV cam=%d\n", ocv2, camScore);

  // ---------- fusion ----------
  int sus = 0;
  if (ocv < OCV_WEAK_V) sus++;
  if (loaded && (ri > RI_SUSPECT_OHM || vLoad < SAG_MIN_LOAD_V)) sus++;
  if (ocv - ocv2 > RECOVERY_DROP_V) sus++;
  if (wet > WET_SUSPECT_SCORE) sus++;
  if (camScore >= CAM_SUSPECT_SCORE) sus++;

  if (wet > WET_LEAK_SCORE || camScore >= CAM_LEAK_SCORE) result = LEAKING;
  else if (sus > 0 || ocv < OCV_GOOD_V) result = SUSPECT;
  else result = GOOD;

  const char* names[] = {"NONE", "GOOD", "SUSPECT", "LEAKING"};
  Serial.printf("RESULT: %s (suspect flags=%d)\n", names[result], sus);
  Serial.println("=== TEST END ===");
}

// ---------- non-blocking indicator ----------
void indicate() {
  uint32_t m = millis();
  switch (result) {
    case GOOD:    digitalWrite(PIN_LED, (m % 3000) < 100); buzz(0); break;
    case SUSPECT: digitalWrite(PIN_LED, (m % 1000) < 500);
                  buzz((m % 3000) < 150 ? 2000 : 0); break;
    case LEAKING: digitalWrite(PIN_LED, HIGH);
                  buzz((m % 200) < 100 ? 4000 : 0); break;
    default:      digitalWrite(PIN_LED, LOW); buzz(0);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_YL83_VCC, OUTPUT);
  pinMode(PIN_START, INPUT_PULLUP);
  analogSetPinAttenuation(PIN_YL83_AO, ADC_11db);
  buzzInit();
  Wire.begin(PIN_SDA, PIN_SCL);
  dht.begin();
  if (!ina.begin()) {
    Serial.println("INA219 not found: check SDA/SCL/VCC");
    while (1) { digitalWrite(PIN_LED, !digitalRead(PIN_LED)); delay(150); }
  }
  ina.setCalibration_32V_2A();   // assumes 0.1 ohm shunt (R100)
  delay(2000);
  float h = dht.readHumidity(); humRef = isnan(h) ? 50 : h;
  dryRef = readWetRaw();         // keep the pad DRY at power-up
  Serial.printf("Dry baseline=%.0f at %.0f%% RH\n", dryRef, humRef);
  beep(2000, 150);
  Serial.println("Ready. Press START with a cell fitted.");
}

// ---------- live sensor stream (every 1 s) ----------
void streamSensors() {
  static uint32_t lastStream = 0;
  if (millis() - lastStream < 1000) return;
  lastStream = millis();

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t)) t = NAN;
  if (isnan(h)) h = NAN;

  float wetRaw = readWetRaw();
  float wet    = isnan(h) ? NAN : wetScore(isnan(h) ? 50 : h);

  float busV   = ina.getBusVoltage_V();
  float shuntMV = ina.getShuntVoltage_mV();
  float cellV  = busV + shuntMV / 1000.0f;
  float mA     = ina.getCurrent_mA();

  Serial.printf(
    "[LIVE] T=%.1fC H=%.1f%%  wet_raw=%.0f wet=%.3f  "
    "Cell=%.3fV Bus=%.3fV Shunt=%.2fmV I=%.1fmA  cam=%d\n",
    t, h, wetRaw, wet, cellV, busV, shuntMV, mA, camScore
  );
}

void loop() {
  pollSerial();

  // Auto-test removed: it blocked loop() for REST_MS seconds without yielding,
  // which fired the ESP32 Task Watchdog => hard reset => USB disconnect.
  // Use the dashboard "Run Test" button or the hardware START button instead.

  if (digitalRead(PIN_START) == LOW) {
    delay(30);
    if (digitalRead(PIN_START) == LOW) { runTest(); while (digitalRead(PIN_START) == LOW) delay(10); }
  }
  streamSensors();
  indicate();
}
