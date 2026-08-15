#!/usr/bin/env python3
"""
Bridge AI — Structural Health Monitoring (SHM)
Python Production Hardware Serial Watchdog & Data Bridge Service

Features:
1. Real Hardware Serial Communication via PySerial with Arduino on COM6 @ 115200 Baud.
2. Startup PING/PONG Handshake (Receiver -> "PING\n", Arduino -> "PONG,UNO-01").
3. Strictly NO fake telemetry packet generation — zero simulation fallback.
4. Immediate forwarding of valid Arduino telemetry frames (<50ms processing overhead).
5. Packet validation, sequence logging, and latency diagnostics.
6. Automatic Cloud Retries: Unacknowledged packets are retained in an offline retry queue
   and forwarded to Google Apps Script when connection is restored.
"""

import sys
import time
import datetime
import json
import urllib.request
import urllib.error

# Try importing pyserial for hardware communication
try:
    import serial
    HAS_PYSERIAL = True
except ImportError:
    HAS_PYSERIAL = False

# Configuration Settings
SERIAL_PORT = "COM6"          # Serial port for Arduino
BAUD_RATE = 115200            # Arduino Baud Rate
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxcRoP455oy9W7SAwEwO5mu9lGJLaJg2DvL2W2gz2a39g7qzWK5Y42BmJ8MEpx-8COY9w/exec"
# Local Offline Retry Queue for transient network failures
offline_retry_queue = []
serial_connection = None
is_handshake_verified = False

def init_serial():
    """Initializes actual hardware serial connection."""
    global serial_connection, is_handshake_verified
    if not HAS_PYSERIAL:
        print("[WARN] 'pyserial' package not installed. Install via 'pip install pyserial' to connect physical Arduino.")
        return False

    try:
        print(f"[SERIAL] Attempting connection to hardware port '{SERIAL_PORT}' @ {BAUD_RATE} Baud...")
        serial_connection = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1.0)
        time.sleep(1.5)  # Allow Arduino auto-reset after serial opening
        print(f"[SERIAL] Connected successfully to {SERIAL_PORT}.")
        
        # Perform Startup Handshake
        print("[HANDSHAKE] Sending PING to Arduino...")
        serial_connection.write(b"PING\n")
        time.sleep(0.2)
        if serial_connection.in_waiting > 0:
            response = serial_connection.readline().decode('utf-8', errors='ignore').strip()
            if "PONG" in response or "UNO" in response or "DAQ" in response:
                is_handshake_verified = True
                print(f"[HANDSHAKE VERIFIED] Arduino response: '{response}'")
            else:
                print(f"[HANDSHAKE] Response received: '{response}'")
        return True
    except Exception as e:
        print(f"[SERIAL ERROR] Could not open port {SERIAL_PORT}: {e}")
        serial_connection = None
        return False

def parse_serial_line(line_str):
    """
    Parses hardware serial string into structured JSON telemetry packet.
    Format 1 (Delimited): DAQ:ONLINE,SEQ:1001,FORCE-01:ONLINE:1420.5,DISPLACEMENT-01:ONLINE:14.2...
    Format 2 (RAW ADC): DAQ:ONLINE,SEQ:1001,FORCE-01:RAW:512...
    Format 3 (JSON): {"daqStatus":"ONLINE","seq":1001,"sensors":[...]}
    """
    trimmed = line_str.strip()
    if not trimmed:
        return None

    # Handle JSON format
    if trimmed.startswith('{') and trimmed.endswith('}'):
        try:
            parsed = json.loads(trimmed)
            if "tickTimestamp" not in parsed:
                parsed["tickTimestamp"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            return parsed
        except Exception as e:
            print(f"[PARSE ERROR] Invalid JSON packet: {e}")
            return None

    # Handle Standard Delimited Serial Format
    if "DAQ" in trimmed:
        parts = trimmed.split(',')
        seq = None
        daq_status = "ONLINE"
        sensors = []

        for part in parts:
            part_str = part.strip()
            if not part_str:
                continue
            
            key_val = part_str.split(':') if ':' in part_str else part_str.split('=')
            key = key_val[0].strip()

            if key == "DAQ":
                daq_status = key_val[1].strip() if len(key_val) > 1 else "ONLINE"
            elif key == "SEQ":
                try:
                    seq = int(key_val[1].strip())
                except ValueError:
                    seq = None
            elif key == "ARDUINO_ID":
                pass
            elif len(key_val) >= 2:
                sensor_id = key
                raw_status = key_val[1].strip().lower()
                val = None
                
                # Check for 3-part format: SENSOR-ID:STATUS:VALUE
                if len(key_val) >= 3:
                    try:
                        val = float(key_val[2].strip())
                    except ValueError:
                        val = None

                # Treat 'raw' or 'online' as online hardware sensor reading
                status = "online" if raw_status in ("online", "raw", "ok") else raw_status
                
                # Infer unit based on sensor ID prefix if not provided
                unit = "kN" if "FORCE" in sensor_id else "mm" if "DISP" in sensor_id else "µε" if "STRAIN" in sensor_id else ""
                
                sensors.append({
                    "sensorId": sensor_id,
                    "status": status,
                    "value": val,
                    "unit": unit
                })

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        return {
            "daqStatus": daq_status,
            "seq": seq if seq is not None else int(time.time()),
            "tickTimestamp": now_iso,
            "sensors": sensors,
            "rawFrame": trimmed
        }

    return None

def send_packet_to_apps_script(packet_json):
    """
    Posts JSON telemetry packet payload immediately to Google Apps Script Web App endpoint.
    Measures network POST latency and logs result cleanly.
    """
    if not APPS_SCRIPT_URL or "YOUR_DEPLOYMENT_ID" in APPS_SCRIPT_URL:
        print("[WARN] Apps Script URL not configured. Update APPS_SCRIPT_URL in daq_bridge.py.")
        return False

    data = json.dumps(packet_json).encode('utf-8')
    req = urllib.request.Request(
        APPS_SCRIPT_URL,
        data=data,
        headers={'Content-Type': 'application/json'}
    )
    
    t_start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=3.5) as response:
            t_elapsed_ms = (time.time() - t_start) * 1000.0
            res_body = response.read().decode('utf-8')
            seq_val = packet_json.get('seq')
            print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] [SEQ:{seq_val}] POST OK ({t_elapsed_ms:.1f} ms) -> {res_body[:50]}")
            return True
    except Exception as e:
        t_elapsed_ms = (time.time() - t_start) * 1000.0
        seq_val = packet_json.get('seq')
        print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] [SEQ:{seq_val}] POST Failed ({e}, {t_elapsed_ms:.1f} ms) -> Queued locally.")
        offline_retry_queue.append(packet_json)
        return False

def process_offline_retry_queue():
    """Flushes unacknowledged packets queued during transient network interruptions."""
    if not offline_retry_queue:
        return

    print(f"[RETRY QUEUE] Attempting to flush {len(offline_retry_queue)} queued telemetry packets...")
    remaining = []
    while offline_retry_queue:
        packet = offline_retry_queue.pop(0)
        data = json.dumps(packet).encode('utf-8')
        req = urllib.request.Request(
            APPS_SCRIPT_URL,
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        try:
            with urllib.request.urlopen(req, timeout=3.5) as response:
                print(f"[RETRY SEQ:{packet.get('seq')}] Flush Successful.")
        except Exception as e:
            print(f"[RETRY SEQ:{packet.get('seq')}] Flush Failed ({e}). Retaining in queue.")
            remaining.append(packet)
            remaining.extend(offline_retry_queue)
            break
    
    offline_retry_queue.clear()
    offline_retry_queue.extend(remaining)

def main():
    global serial_connection
    print("=" * 75)
    print("  Bridge AI — Hardware DAQ Receiver & Python Telemetry Bridge Service")
    print(f"  Serial Port: {SERIAL_PORT} @ {BAUD_RATE} Baud")
    print(f"  Google Apps Script Endpoint: {APPS_SCRIPT_URL}")
    print("  Data Integrity Rule: REAL HARDWARE ONLY — NO SIMULATION / ZERO FAKE DATA")
    print("=" * 75)

    init_serial()

    try:
        while True:
            packet_json = None

            # Read from actual hardware serial if available
            if serial_connection and serial_connection.is_open:
                try:
                    if serial_connection.in_waiting > 0:
                        raw_line = serial_connection.readline().decode('utf-8', errors='ignore')
                        if raw_line and raw_line.strip():
                            line_clean = raw_line.strip()
                            print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')[:-3]}] RX: {line_clean}")
                            packet_json = parse_serial_line(line_clean)
                except Exception as serial_err:
                    print(f"[SERIAL RX ERROR] {serial_err}")
                    serial_connection = None

            if packet_json:
                send_packet_to_apps_script(packet_json)
                process_offline_retry_queue()
                time.sleep(0.01)
            else:
                if serial_connection is None:
                    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Attempting serial port reconnection ({SERIAL_PORT})...")
                    init_serial()
                    time.sleep(1.0)
                else:
                    # Non-blocking poll tick sleep (50ms) to ensure low CPU usage while checking incoming serial frames immediately
                    time.sleep(0.05)

    except KeyboardInterrupt:
        print("\n[SHUTDOWN] Hardware DAQ Watchdog Service stopped cleanly.")
        if serial_connection and serial_connection.is_open:
            serial_connection.close()

if __name__ == '__main__':
    main()
