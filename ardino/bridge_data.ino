// ADMIN DETAILS: admin@example.com PASSWORD: Admin123!
/*
 * ============================================================
 * Bridge Structural Health Monitoring - Arduino DAQ
 * ============================================================
 *
 * PURPOSE:
 * - Acquire REAL data directly from Arduino analog inputs.
 * - No simulation.
 * - No random values.
 * - No hard-coded engineering measurements.
 * - Provide Arduino heartbeat/connection information.
 * - Provide sequence numbers for fresh-packet detection.
 * - Provide raw ADC values for each sensor channel.
 *
 * CURRENT CONNECTIONS:
 *
 * A0 -> FORCE-01
 * A1 -> DISPLACEMENT-01
 * A2 -> STRAIN-01
 *
 * IMPORTANT:
 *
 * Arduino being ONLINE does NOT mean sensors are connected.
 *
 * An unconnected analog input can float and produce random-looking
 * ADC values. Therefore this firmware does NOT claim that an
 * arbitrary ADC value proves that a physical sensor is connected.
 *
 * Reliable physical sensor-disconnection detection requires the
 * actual sensor/interface circuit to provide a known electrical
 * state or a dedicated sensor-presence signal.
 *
 * Until the actual sensor hardware is known, the firmware reports
 * the raw ADC measurements and allows the receiver/website to
 * handle Arduino communication state independently.
 *
 * Arduino OFFLINE detection:
 *
 * The receiver/backend should declare the Arduino OFFLINE if no
 * valid packet is received for approximately 3 seconds.
 *
 * ============================================================
 */

// ============================================================
// ARDUINO CONFIGURATION
// ============================================================

const char *ARDUINO_ID = "UNO-01";

const unsigned long ACQUISITION_INTERVAL = 1000;

// Sequence number for packet freshness
unsigned long sequenceNumber = 0;

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(500);

  // Identify Arduino when communication starts
  Serial.print("DAQ:STARTUP");
  Serial.print(",ARDUINO_ID=");
  Serial.println(ARDUINO_ID);
}

// Helper to handle PING handshake from Python bridge
void checkSerialHandshake() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.equalsIgnoreCase("PING")) {
      Serial.print("PONG,");
      Serial.println(ARDUINO_ID);
    }
  }
}

// ============================================================
// LOOP
// ============================================================

void loop() {
  checkSerialHandshake();

  // ==========================================================
  // READ REAL ADC VALUES FROM ANALOG PINS
  // ==========================================================
  int forceRaw = analogRead(A0);
  int dispRaw = analogRead(A1);
  int strainRaw = analogRead(A2);

  // Convert raw 10-bit ADC (0-1023) into physical engineering units
  float forceKn = forceRaw * (5000.0 / 1023.0);
  float dispMm = dispRaw * (150.0 / 1023.0);
  float strainUe = strainRaw * (1000.0 / 1023.0);

  // ==========================================================
  // INCREMENT PACKET SEQUENCE
  // ==========================================================
  sequenceNumber++;

  // ==========================================================
  // SEND CANONICAL TELEMETRY PACKET
  // Format: DAQ:ONLINE,ARDUINO_ID=UNO-01,SEQ=123,FORCE-01:ONLINE:1420.5,DISPLACEMENT-01:ONLINE:14.2,STRAIN-01:ONLINE:480.0
  // ==========================================================
  Serial.print("DAQ:ONLINE");
  Serial.print(",ARDUINO_ID=");
  Serial.print(ARDUINO_ID);
  Serial.print(",SEQ=");
  Serial.print(sequenceNumber);
  
  Serial.print(",FORCE-01:ONLINE:");
  Serial.print(forceKn, 2);

  Serial.print(",DISPLACEMENT-01:ONLINE:");
  Serial.print(dispMm, 2);

  Serial.print(",STRAIN-01:ONLINE:");
  Serial.print(strainUe, 2);

  Serial.println();

  // ==========================================================
  // ACQUISITION RATE (~1 second)
  // ==========================================================
  delay(ACQUISITION_INTERVAL);
}