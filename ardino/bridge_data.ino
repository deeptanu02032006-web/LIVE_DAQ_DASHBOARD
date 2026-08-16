
#include <Wire.h>

const char *ARDUINO_ID = "UNO-01";
const unsigned long ACQUISITION_INTERVAL = 1000; // ms
unsigned long sequenceNumber = 0;

const uint8_t HX711_DT_PIN  = 2;
const uint8_t HX711_SCK_PIN = 3;

// raw_reading / calibration_factor = engineering units.
// Determine experimentally with a known reference weight.
// Leave at 1.0 -> FORCE-01 reports raw counts.
float hx711CalibrationFactor = 1.0;
long hx711Offset = 0; // set by tare in setup()
bool hx711Ready = false;

bool hx711IsReady() {
  return digitalRead(HX711_DT_PIN) == LOW;
}

// Reads one raw 24-bit two's-complement sample from the HX711.
// Blocks briefly (up to a few hundred ms) waiting for DOUT to go low.
long hx711ReadRaw() {
  unsigned long startWait = millis();
  while (!hx711IsReady()) {
    if (millis() - startWait > 500) return 0; // timeout guard
  }

  unsigned long value = 0;
  for (int i = 0; i < 24; i++) {
    digitalWrite(HX711_SCK_PIN, HIGH);
    delayMicroseconds(1);
    value = (value << 1) | digitalRead(HX711_DT_PIN);
    digitalWrite(HX711_SCK_PIN, LOW);
    delayMicroseconds(1);
  }

  // 25th pulse: sets gain=128, channel A for the NEXT reading (standard default)
  digitalWrite(HX711_SCK_PIN, HIGH);
  delayMicroseconds(1);
  digitalWrite(HX711_SCK_PIN, LOW);
  delayMicroseconds(1);

  // Sign-extend 24-bit two's complement to 32-bit long
  if (value & 0x800000UL) {
    value |= 0xFF000000UL;
  }
  return (long)value;
}

void hx711Init() {
  pinMode(HX711_SCK_PIN, OUTPUT);
  pinMode(HX711_DT_PIN, INPUT);
  digitalWrite(HX711_SCK_PIN, LOW);

  unsigned long startWait = millis();
  while (!hx711IsReady()) {
    if (millis() - startWait > 2000) {
      hx711Ready = false;
      return;
    }
  }
  hx711Ready = true;

  // Tare: average a few samples at startup as the zero offset.
  long sum = 0;
  const int tareSamples = 5;
  for (int i = 0; i < tareSamples; i++) {
    sum += hx711ReadRaw();
  }
  hx711Offset = sum / tareSamples;
}

const uint8_t AHT_I2C_ADDR = 0x38;
bool ahtReady = false;

bool ahtInit() {
  Wire.begin();
  delay(40); // AHT requires >=20-40ms after power-up before first command

  // Soft-reset (optional but improves reliability)
  Wire.beginTransmission(AHT_I2C_ADDR);
  Wire.write(0xBA);
  if (Wire.endTransmission() != 0) return false;
  delay(20);

  // Initialization command (works for both AHT10 and AHT20 variants)
  Wire.beginTransmission(AHT_I2C_ADDR);
  Wire.write(0xE1);
  Wire.write(0x08);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) return false;
  delay(10);

  return true;
}

// Triggers a measurement and reads temperature (C) + humidity (%RH).
// Returns true on success; outputs are left unchanged on failure.
bool ahtReadMeasurement(float &temperatureC, float &humidityPct) {
  Wire.beginTransmission(AHT_I2C_ADDR);
  Wire.write(0xAC);
  Wire.write(0x33);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) return false;

  delay(80); // measurement time per datasheet

  Wire.requestFrom((int)AHT_I2C_ADDR, 6);
  if (Wire.available() < 6) return false;

  uint8_t data[6];
  for (int i = 0; i < 6; i++) {
    data[i] = Wire.read();
  }

  // Bit 7 of status byte (data[0]) = busy flag; should be 0 when done
  if (data[0] & 0x80) return false;

  unsigned long rawHumidity = ((unsigned long)data[1] << 12) |
                               ((unsigned long)data[2] << 4) |
                               (data[3] >> 4);

  unsigned long rawTemp = (((unsigned long)data[3] & 0x0F) << 16) |
                          ((unsigned long)data[4] << 8) |
                          data[5];

  humidityPct = (rawHumidity / 1048576.0) * 100.0;       // / 2^20 * 100
  temperatureC = (rawTemp / 1048576.0) * 200.0 - 50.0;    // / 2^20 * 200 - 50

  return true;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  hx711Init();
  ahtReady = ahtInit();

  Serial.print("DAQ:STARTUP");
  Serial.print(",ARDUINO_ID:");
  Serial.print(ARDUINO_ID);
  Serial.print(",HX711_INIT:");
  Serial.print(hx711Ready ? "OK" : "FAIL");
  Serial.print(",AHT_INIT:");
  Serial.println(ahtReady ? "OK" : "FAIL");
}


void loop() {
  sequenceNumber++;

  Serial.print("DAQ:ONLINE");
  Serial.print(",SEQ:");
  Serial.print(sequenceNumber);

  // ----- FORCE-01 (HX711) -----
  Serial.print(",FORCE-01:");
  if (hx711Ready && hx711IsReady()) {
    long raw = hx711ReadRaw();
    float forceValue = (raw - hx711Offset) / hx711CalibrationFactor;
    Serial.print("ONLINE:");
    Serial.print(forceValue, 3);
  } else {
    Serial.print("OFFLINE:0");
  }

  // ----- TEMP-01 / HUMIDITY-01 (AHT10/AHT20) -----
  float temperatureC, humidityPct;
  bool ok = ahtReady && ahtReadMeasurement(temperatureC, humidityPct);

  if (ok) {
    Serial.print(",TEMP-01:ONLINE:");
    Serial.print(temperatureC, 2);
    Serial.print(",HUMIDITY-01:ONLINE:");
    Serial.print(humidityPct, 2);
  } else {
    Serial.print(",TEMP-01:OFFLINE:0");
    Serial.print(",HUMIDITY-01:OFFLINE:0");
  }

  Serial.println();

  delay(ACQUISITION_INTERVAL);
}
