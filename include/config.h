#pragma once
// ---------- Pins ----------
#define PIN_SDA        21
#define PIN_SCL        22
#define PIN_YL83_AO    34   // ADC1, input only
#define PIN_YL83_VCC   25   // pulsed power for the pad
#define PIN_DHT        4
#define PIN_LED        18   // red LED
#define PIN_BUZZER     19   // passive piezo (PS-HT1205)
#define PIN_START      27   // button to GND, internal pull-up

// ---------- Test settings ----------
#define LOAD_DETECT_MA     80     // current above this = load applied
#define LOAD_WAIT_MS       10000  // time allowed to touch the load jumper
#define REST_MS            10000  // rest after pulse (zinc-carbon recovers slowly)
#define N_AVG              16

// ---------- Thresholds: STARTING GUESSES, replace with your own measurements ----------
// Profile: Eveready Super Heavy Duty (zinc-carbon) 1.5 V
#define OCV_GOOD_V         1.45f  // at/above = fine
#define OCV_WEAK_V         1.25f  // below = SUSPECT
#define RI_SUSPECT_OHM     2.0f   // internal resistance at 25 C, above = SUSPECT
#define SAG_MIN_LOAD_V     1.00f  // loaded voltage below = SUSPECT
#define RECOVERY_DROP_V    0.030f // OCV after rest lower than before by this = SUSPECT
#define WET_LEAK_SCORE     0.25f  // wet score above = LEAKING (0..1)
#define WET_SUSPECT_SCORE  0.10f
#define CAM_LEAK_SCORE     60     // camera crust score 0..100
#define CAM_SUSPECT_SCORE  30
