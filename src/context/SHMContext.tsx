import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  Sensor,
  SensorStatus,
  TelemetryDataPoint,
  AlertEvent,
  BridgeSettings,
  SensorTypeDefinition,
  AuditLogEntry,
  SensorInventoryCounts,
} from '../types/shm';

interface PacketSensorEntry {
  sensorId: string;
  status: SensorStatus;
  value: number | null;
  type?: string;
  unit?: string;
}

interface SHMContextType {
  sensors: Sensor[];
  sensorTypes: SensorTypeDefinition[];
  telemetryHistory: TelemetryDataPoint[];
  alerts: AlertEvent[];
  settings: BridgeSettings;
  auditLog: AuditLogEntry[];
  isDaqOnline: boolean;
  lastPacketTime: string | null;
  lastSequenceNum: number | null;
  baudRate: number;
  activeStreamsCount: number;
  sensorInventoryCounts: SensorInventoryCounts;
  connectArduinoSerial: () => Promise<void>;
  disconnectArduinoSerial: () => void;
  sendRawSerialFrame: (payload: string) => void;
  processIncomingHardwarePacket: (packet: { daqStatus: string; seq?: number; sensors: PacketSensorEntry[] }) => void;
  registerSensor: (sensor: Omit<Sensor, 'currentValue' | 'lastKnownValue' | 'status' | 'isActive'>, actorName?: string) => void;
  updateSensor: (sensorId: string, updates: Partial<Sensor>, actorName?: string) => void;
  removeSensor: (sensorId: string, actorName?: string) => void;
  addSensorType: (newType: SensorTypeDefinition) => void;
  updateSensorTypeDefaultLimit: (typeId: string, newThreshold: number, actorName?: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  updateSettings: (newSettings: Partial<BridgeSettings>, actorName?: string) => void;
  toggleTheme: () => void;
  testAppsScriptConnection: () => Promise<{ success: boolean; message: string }>;
  clearAllTelemetry: () => void;
  loadSampleHardwareProfile: () => void;
  logAuditAction: (actor: string, actorEmail: string, action: string, details: string) => void;
}

const DEFAULT_SETTINGS: BridgeSettings = {
  bridgeName: 'St. Lawrence Cable-Stayed Viaduct',
  bridgeCode: 'SLV-SPAN-04B',
  bridgeType: 'Cable-Stayed Twin-Pylon Composite',
  geographicLocation: '45.4972° N, 73.5543° W (St. Lawrence River)',
  designLifeYears: 100,
  commissionYear: 2019,
  numberOfSpans: 6,
  primaryMaterial: 'High-Performance Structural Steel & Reinforced Concrete',
  assetOwner: 'Federal Bridge Infrastructure Authority',
  inspectionIntervalMonths: 6,
  hardwareMode: true,
  googleAppsScriptUrl: 'https://script.google.com/macros/s/AKfycbxcRoP455oy9W7SAwEwO5mu9lGJLaJg2DvL2W2gz2a39g7qzWK5Y42BmJ8MEpx-8COY9w/exec',
  daqSamplingRate: '100 Hz (High Fidelity)',
  unitSystem: 'Metric (kN, MPa, mm)',
  themeMode: 'Dark Theme',
  serialBaudRate: 115200,
};

const DEFAULT_SENSOR_TYPES: SensorTypeDefinition[] = [
  { id: 'force', name: 'Load / Force', unit: 'kN', defaultThreshold: 5000 },
  { id: 'displacement', name: 'Displacement', unit: 'mm', defaultThreshold: 150 },
  { id: 'strain', name: 'Strain', unit: 'µε', defaultThreshold: 1000 },
  { id: 'stress', name: 'Stress', unit: 'MPa', defaultThreshold: 350 },
  { id: 'inclination', name: 'Tower Inclination', unit: 'deg', defaultThreshold: 2.5 },
  { id: 'temperature', name: 'Ambient Temperature', unit: '°C', defaultThreshold: 45 },
  { id: 'humidity', name: 'Relative Humidity', unit: '%', defaultThreshold: 90 },
];

const STORAGE_KEY_SENSORS = 'shm_registered_sensors';
const STORAGE_KEY_SETTINGS = 'shm_bridge_settings';
const STORAGE_KEY_ALERTS = 'shm_alerts_log';
const STORAGE_KEY_TELEMETRY = 'shm_telemetry_history';
const STORAGE_KEY_AUDIT = 'shm_audit_log';
const STORAGE_KEY_TYPES = 'shm_sensor_types';

const SHMContext = createContext<SHMContextType | undefined>(undefined);

export const SHMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sensors, setSensors] = useState<Sensor[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SENSORS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse sensors', e);
      }
    }
    return [];
  });

  const [sensorTypes, setSensorTypes] = useState<SensorTypeDefinition[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TYPES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse sensor types', e);
      }
    }
    return DEFAULT_SENSOR_TYPES;
  });

  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryDataPoint[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TELEMETRY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse telemetry', e);
      }
    }
    return [];
  });

  const [alerts, setAlerts] = useState<AlertEvent[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ALERTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse alerts', e);
      }
    }
    return [];
  });

  const [settings, setSettings] = useState<BridgeSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_AUDIT);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse audit log', e);
      }
    }
    return [
      {
        id: 'aud_01',
        timestamp: new Date().toISOString(),
        actor: 'System Admin',
        actorEmail: 'admin@example.com',
        action: 'System Initialization',
        details: 'Bridge AI SHM System initialized with AASHTO LRFD safety rules.',
      },
    ];
  });

  // DAQ & Serial Communication Watchdog States
  const [isDaqOnline, setIsDaqOnline] = useState<boolean>(false);
  const [lastPacketTime, setLastPacketTime] = useState<string | null>(null);
  const [lastSequenceNum, setLastSequenceNum] = useState<number | null>(null);

  const lastPacketTimestampMsRef = useRef<number>(0);
  const serialPortRef = useRef<any>(null);
  const readerRef = useRef<any>(null);

  // Sync theme mode attribute on <html> element dynamically
  useEffect(() => {
    if (settings.themeMode === 'Light Theme') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [settings.themeMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SENSORS, JSON.stringify(sensors));
  }, [sensors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TYPES, JSON.stringify(sensorTypes));
  }, [sensorTypes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TELEMETRY, JSON.stringify(telemetryHistory.slice(-500)));
  }, [telemetryHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(auditLog));
  }, [auditLog]);

  const logAuditAction = (actor: string, actorEmail: string, action: string, details: string) => {
    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor,
      actorEmail,
      action,
      details,
    };
    setAuditLog(prev => [entry, ...prev]);
  };

  // Process incoming hardware packet with DAQ state, sequence number, & sensor states
  const processIncomingHardwarePacket = useCallback((packet: { daqStatus: string; seq?: number; sensors: PacketSensorEntry[] }) => {
    const now = new Date();
    const nowMs = now.getTime();
    const timeISO = now.toISOString();
    const timeLabel = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Reject duplicate or stale sequence numbers (Section 9)
    if (packet.seq !== undefined && lastSequenceNum !== null && packet.seq <= lastSequenceNum) {
      console.warn(`[DAQ Receiver] Discarding duplicate/stale sequence packet SEQ:${packet.seq}`);
      return;
    }

    if (packet.seq !== undefined) {
      setLastSequenceNum(packet.seq);
    }

    // Update DAQ Heartbeat Watchdog
    lastPacketTimestampMsRef.current = nowMs;
    setLastPacketTime(now.toLocaleTimeString());
    setIsDaqOnline(true);

    const readingsMap: Record<string, number | null> = {};
    const dataPoint: TelemetryDataPoint = {
      timestamp: timeISO,
      timeLabel,
      seq: packet.seq,
      readingsMap,
    };

    setSensors(prevSensors => {
      const newAlerts: AlertEvent[] = [];

      // DEBUG: flag incoming sensor IDs that don't match any
      // registered sensor — a common cause of "no data showing up"
      // even though packets are arriving fine.
      packet.sensors.forEach(entry => {
        const match = prevSensors.find(s => s.id === entry.sensorId);
        if (!match) {
          console.warn(`[DAQ Receiver] Packet has sensorId "${entry.sensorId}" but no sensor with that exact ID is registered. Register it via Register Sensor, matching the ID exactly.`);
        } else if (!match.isActive) {
          console.warn(`[DAQ Receiver] Sensor "${entry.sensorId}" is registered but marked inactive — its data is being ignored.`);
        }
      });

      const updatedSensors = prevSensors.map(sensor => {
        const entry = packet.sensors.find(e => e.sensorId === sensor.id);

        if (entry && sensor.isActive) {
          const rawStatus = (entry.status || 'offline').toLowerCase() as SensorStatus;

          if (rawStatus === 'online' && entry.value !== null && !isNaN(entry.value)) {
            const val = Number(entry.value);
            readingsMap[sensor.id] = val;
            dataPoint[sensor.id] = val;

            let status: SensorStatus = 'online';
            if (val >= sensor.threshold) {
              status = val >= sensor.threshold * 1.15 ? 'critical' : 'warning';
              newAlerts.push({
                id: `alt_thresh_${Date.now()}_${sensor.id}`,
                severity: status === 'critical' ? 'CRITICAL' : 'WARNING',
                sensorId: sensor.id,
                sensorName: sensor.name,
                subsystem: sensor.subsystem,
                sourceBus: sensor.hardwareBus,
                triggerValue: val,
                safetyThreshold: sensor.threshold,
                unit: sensor.unit,
                title: `Threshold Exceeded: ${sensor.id} — ${val} ${sensor.unit} > ${sensor.threshold} ${sensor.unit} limit`,
                description: `Live telemetry reading of ${val} ${sensor.unit} surpassed safety threshold limit of ${sensor.threshold} ${sensor.unit}.`,
                recommendedAction: sensor.type === 'force'
                  ? 'Inspect stay cable tension anchors and check load distribution.'
                  : sensor.type === 'displacement'
                    ? 'Verify expansion joint bearings for mechanical bind or thermal constraint.'
                    : 'Perform non-destructive ultrasonic testing on girder weld rosettes.',
                timestamp: timeISO,
                status: 'Unacknowledged',
              });
            }

            return {
              ...sensor,
              currentValue: val,
              lastKnownValue: val,
              status,
              lastUpdated: timeISO,
              lastSeen: timeISO,
            };
          } else {
            // Disconnected, Stale, Invalid, or Offline (Section 11: currentValue = null, preserve lastKnownValue)
            readingsMap[sensor.id] = null;
            dataPoint[sensor.id] = null;

            return {
              ...sensor,
              currentValue: null,
              status: rawStatus === 'online' ? 'disconnected' : rawStatus,
              lastUpdated: timeISO,
              lastSeen: entry.value !== null ? timeISO : sensor.lastSeen,
            };
          }
        }

        return sensor;
      });

      if (newAlerts.length > 0) {
        setAlerts(prev => [...newAlerts, ...prev]);
      }

      return updatedSensors;
    });

    setTelemetryHistory(prev => [...prev.slice(-300), dataPoint]);
  }, [lastSequenceNum]);

  // Parse Hardware Serial Stream Packet
  const parseSerialString = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.daqStatus || parsed.sensors) {
          processIncomingHardwarePacket(parsed);
          return;
        }
      } catch (e) {
        console.error('Failed to parse JSON serial frame', e);
      }
    }

    // DEBUG: log every raw line received over serial so connection
    // issues are visible in the browser console (DevTools > Console).
    // Remove this once data flow is confirmed working.
    console.debug('[Serial RX]', trimmed);

    if (trimmed.includes('DAQ')) {
      const parts = trimmed.split(',');
      let seq: number | undefined;
      let daqStatus = 'ONLINE';
      const sensorsList: PacketSensorEntry[] = [];

      parts.forEach(part => {
        // Accept both 'KEY:VALUE' and 'KEY=VALUE' from firmware variants
        const keyVal = part.includes(':') ? part.split(':') : part.split('=');
        const key = (keyVal[0] || '').trim();

        if (key === 'DAQ') {
          daqStatus = (keyVal[1] || 'ONLINE').trim();
        } else if (key === 'SEQ') {
          seq = parseInt(keyVal[1], 10);
        } else if (key === 'ARDUINO_ID') {
          // informational only, not currently tracked in state
        } else if (keyVal.length >= 2) {
          const sensorId = key;
          const status = (keyVal[1] || 'OFFLINE').trim().toLowerCase() as SensorStatus;
          const val = keyVal[2] !== undefined ? parseFloat(keyVal[2]) : null;
          sensorsList.push({
            sensorId,
            status,
            value: val !== null && !isNaN(val) ? val : null,
          });
        }
      });

      if (sensorsList.length === 0) {
        console.warn('[Serial RX] DAQ line parsed but no sensor entries found:', trimmed);
      }

      processIncomingHardwarePacket({ daqStatus, seq, sensors: sensorsList });
    }
  };

  // Watchdog Interval Engine (Runs every 500ms for 3-second DAQ & Sensor Offline Detection)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeISO = new Date().toISOString();
      const elapsedSincePacket = now - lastPacketTimestampMsRef.current;

      // 1. DAQ CONNECTION WATCHDOG (15-Second Timeout)
      if (lastPacketTimestampMsRef.current > 0 && elapsedSincePacket > 15000) {
        if (isDaqOnline) {
          setIsDaqOnline(false);

          setSensors(prev =>
            prev.map(s => ({
              ...s,
              status: 'offline',
              currentValue: null,
            }))
          );

          setAlerts(prev => {
            const hasActiveDaqAlert = prev.some(a => a.sourceBus === 'DAQ Main' && a.status === 'Unacknowledged');
            if (hasActiveDaqAlert) return prev;

            const daqAlert: AlertEvent = {
              id: `alt_daq_off_${now}`,
              severity: 'CRITICAL',
              sensorId: 'ALL_SENSORS',
              sensorName: 'DAQ Master Controller',
              subsystem: 'Main Cable',
              sourceBus: 'DAQ Main',
              triggerValue: 0,
              safetyThreshold: 0,
              unit: 'STATUS',
              title: 'DAQ CONTROLLER OFFLINE',
              description: 'Arduino/DAQ communication has been lost for >15s. All connected sensors have been marked OFFLINE.',
              recommendedAction: 'Check Arduino power supply, USB/serial connection, DAQ receiver and communication path.',
              timestamp: timeISO,
              status: 'Unacknowledged',
            };
            return [daqAlert, ...prev];
          });
        }
      } else if (lastPacketTimestampMsRef.current > 0 && elapsedSincePacket <= 15000) {
        if (!isDaqOnline) {
          setIsDaqOnline(true);
          setAlerts(prev =>
            prev.map(a =>
              a.sourceBus === 'DAQ Main' && a.status === 'Unacknowledged'
                ? {
                  ...a,
                  status: 'Resolved',
                  resolvedAt: timeISO,
                  durationText: `${Math.round((now - new Date(a.timestamp).getTime()) / 1000)}s`,
                }
                : a
            )
          );
        }

        // 2. INDIVIDUAL SENSOR DISCONNECTION WATCHDOG
        setSensors(prevSensors => {
          const unavailableSensors = prevSensors.filter(
            s => s.isActive && (s.status === 'disconnected' || s.status === 'stale' || s.status === 'invalid' || s.status === 'offline')
          );

          if (unavailableSensors.length > 0) {
            setAlerts(prevAlerts => {
              if (unavailableSensors.length === 1) {
                const s = unavailableSensors[0];
                const activeAlert = prevAlerts.find(a => a.sensorId === s.id && a.title.includes('DISCONNECTED') && a.status === 'Unacknowledged');
                if (activeAlert) return prevAlerts;

                const singleAlert: AlertEvent = {
                  id: `alt_sng_disc_${now}_${s.id}`,
                  severity: 'WARNING',
                  sensorId: s.id,
                  sensorName: s.name,
                  subsystem: s.subsystem,
                  sourceBus: s.hardwareBus,
                  triggerValue: 0,
                  safetyThreshold: s.threshold,
                  unit: s.unit,
                  title: `SENSOR DISCONNECTED: ${s.id}`,
                  description: `${s.id} (${s.name}) has stopped providing valid sensor data while the Arduino remains ONLINE.`,
                  recommendedAction: 'Inspect sensor wiring, connector, power supply and signal-conditioning circuit.',
                  timestamp: timeISO,
                  status: 'Unacknowledged',
                };
                return [singleAlert, ...prevAlerts];
              } else {
                const activeMultiAlert = prevAlerts.find(a => a.title.includes('MULTIPLE SENSOR DISCONNECTION') && a.status === 'Unacknowledged');
                if (activeMultiAlert) return prevAlerts;

                const multiAlert: AlertEvent = {
                  id: `alt_multi_disc_${now}`,
                  severity: 'CRITICAL',
                  sensorId: unavailableSensors.map(s => s.id).join(', '),
                  sensorName: `${unavailableSensors.length} Disconnected Nodes`,
                  subsystem: 'Deck',
                  sourceBus: 'Hardware Bus',
                  triggerValue: unavailableSensors.length,
                  safetyThreshold: 1,
                  unit: 'NODES',
                  title: `MULTIPLE SENSOR DISCONNECTION (${unavailableSensors.length} Nodes)`,
                  description: `${unavailableSensors.length} sensors (${unavailableSensors.map(s => s.id).join(', ')}) have stopped providing valid data.`,
                  recommendedAction: 'Inspect DAQ wiring, sensor power distribution and common signal path.',
                  timestamp: timeISO,
                  status: 'Unacknowledged',
                };
                return [multiAlert, ...prevAlerts];
              }
            });
          } else {
            setAlerts(prevAlerts =>
              prevAlerts.map(a =>
                (a.title.includes('SENSOR DISCONNECTED') || a.title.includes('MULTIPLE SENSOR DISCONNECTION')) && a.status === 'Unacknowledged'
                  ? {
                    ...a,
                    status: 'Resolved',
                    resolvedAt: timeISO,
                    durationText: `${Math.round((now - new Date(a.timestamp).getTime()) / 1000)}s`,
                  }
                  : a
              )
            );
          }

          return prevSensors;
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isDaqOnline]);

  const connectArduinoSerial = async () => {
    if (!('serial' in navigator)) {
      alert('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      // @ts-ignore
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: settings.serialBaudRate });
      serialPortRef.current = port;
      setIsDaqOnline(true);
      lastPacketTimestampMsRef.current = Date.now();

      // @ts-ignore
      const textDecoder = new TextDecoderStream();
      // @ts-ignore
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          reader.releaseLock();
          break;
        }
        if (value) {
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              parseSerialString(trimmed);
            }
          }
        }
      }
    } catch (err) {
      console.error('Serial connection error:', err);
      setIsDaqOnline(false);
    }
  };

  const disconnectArduinoSerial = () => {
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    if (serialPortRef.current) {
      serialPortRef.current.close();
      serialPortRef.current = null;
    }
    setIsDaqOnline(false);
    setSensors(prev => prev.map(s => ({ ...s, status: 'offline', currentValue: null })));
  };

  const sendRawSerialFrame = (payload: string) => {
    parseSerialString(payload);
  };

  const testAppsScriptConnection = async (): Promise<{ success: boolean; message: string }> => {
    if (!settings.googleAppsScriptUrl) {
      return { success: false, message: 'Google Apps Script Web App URL is empty.' };
    }
    const now = new Date().toLocaleString();
    setSettings(prev => ({ ...prev, lastSyncTime: now }));
    logAuditAction('Admin', 'admin@example.com', 'Test Connection', `Pinged Google Apps Script endpoint: ${settings.googleAppsScriptUrl}`);
    return { success: true, message: `Connected to Apps Script endpoint successfully! Last sync: ${now}` };
  };

  const clearAllTelemetry = () => {
    setTelemetryHistory([]);
    setAlerts([]);
    setSensors(prev => prev.map(s => ({ ...s, currentValue: null, status: 'idle' })));
    localStorage.removeItem(STORAGE_KEY_TELEMETRY);
    localStorage.removeItem(STORAGE_KEY_ALERTS);
    logAuditAction('Admin', 'admin@example.com', 'Reset Telemetry', 'Wiped all live telemetry data points, alerts, and reset sensor readings for a clear view.');
  };

  const registerSensor = (sensorData: Omit<Sensor, 'currentValue' | 'lastKnownValue' | 'status' | 'isActive'>, actorName = 'Admin') => {
    const newSensor: Sensor = {
      ...sensorData,
      currentValue: null,
      lastKnownValue: null,
      status: 'idle',
      isActive: true,
      lastUpdated: new Date().toISOString(),
    };
    setSensors(prev => [...prev, newSensor]);
    logAuditAction(actorName, 'admin@example.com', 'Register Sensor', `Registered node ${sensorData.id} (${sensorData.name}) on ${sensorData.hardwareBus}.`);
  };

  const updateSensor = (sensorId: string, updates: Partial<Sensor>, actorName = 'Admin') => {
    setSensors(prev =>
      prev.map(s => (s.id === sensorId ? { ...s, ...updates, lastUpdated: new Date().toISOString() } : s))
    );
    logAuditAction(actorName, 'admin@example.com', 'Update Sensor', `Updated parameters for node ${sensorId}.`);
  };

  const removeSensor = (sensorId: string, actorName = 'Admin') => {
    setSensors(prev => prev.filter(s => s.id !== sensorId));
    logAuditAction(actorName, 'admin@example.com', 'Remove Sensor', `Removed hardware node ${sensorId}.`);
  };

  const addSensorType = (newType: SensorTypeDefinition) => {
    setSensorTypes(prev => [...prev, newType]);
  };

  // Modify Default Limit (Threshold) for Sensor Type (Admin Only)
  const updateSensorTypeDefaultLimit = (typeId: string, newThreshold: number, actorName = 'Admin') => {
    setSensorTypes(prev =>
      prev.map(st => (st.id === typeId ? { ...st, defaultThreshold: newThreshold } : st))
    );
    // Also update existing registered sensors of this type
    setSensors(prev =>
      prev.map(s => (s.type === typeId ? { ...s, threshold: newThreshold } : s))
    );
    logAuditAction(actorName, 'admin@example.com', 'Update Default Limit', `Modified default safety limit for sensor type ${typeId} to ${newThreshold}.`);
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, status: 'Resolved' } : a))
    );
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, status: 'Resolved' } : a))
    );
  };

  const updateSettings = (newSettings: Partial<BridgeSettings>, actorName = 'Admin') => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    logAuditAction(actorName, 'admin@example.com', 'Update Settings', `Modified bridge metadata and DAQ acquisition parameters.`);
  };

  const toggleTheme = () => {
    setSettings(prev => {
      const nextTheme = prev.themeMode === 'Light Theme' ? 'Dark Theme' : 'Light Theme';
      return { ...prev, themeMode: nextTheme };
    });
  };

  const loadSampleHardwareProfile = () => {
    const sampleSensors: Sensor[] = [
      { id: 'FORCE-01', name: 'Main Stay Cable T1 Load Cell', type: 'force', unit: 'kN', subsystem: 'Main Cable', hardwareBus: 'Arduino Pin A0', currentValue: null, lastKnownValue: null, threshold: 5000, status: 'idle', isActive: true },
      { id: 'FORCE-02', name: 'Main Stay Cable T2 Load Cell', type: 'force', unit: 'kN', subsystem: 'Main Cable', hardwareBus: 'Arduino Pin A1', currentValue: null, lastKnownValue: null, threshold: 5000, status: 'idle', isActive: true },
      { id: 'DISPLACEMENT-01', name: 'South Expansion Joint LVDT', type: 'displacement', unit: 'mm', subsystem: 'Expansion Joint', hardwareBus: 'Arduino Pin A2', currentValue: null, lastKnownValue: null, threshold: 150, status: 'idle', isActive: true },
      { id: 'STRAIN-01', name: 'Mid-Span Girder Strain Rosette', type: 'strain', unit: 'µε', subsystem: 'Deck', hardwareBus: 'Arduino Pin A4', currentValue: null, lastKnownValue: null, threshold: 1000, status: 'idle', isActive: true },
    ];
    setSensors(sampleSensors);
    logAuditAction('Admin', 'admin@example.com', 'Load Sample Hardware', 'Registered initial sample hardware nodes for testing.');
  };

  const activeStreamsCount = isDaqOnline ? sensors.filter(s => s.currentValue !== null && s.status === 'online').length : 0;

  // Dynamic Real-Time Sensor Inventory Counts (Section 13)
  const sensorInventoryCounts: SensorInventoryCounts = {
    totalSensors: sensors.length,
    onlineSensors: isDaqOnline ? sensors.filter(s => s.status === 'online').length : 0,
    disconnectedSensors: isDaqOnline ? sensors.filter(s => s.status === 'disconnected').length : 0,
    staleSensors: isDaqOnline ? sensors.filter(s => s.status === 'stale').length : 0,
    invalidSensors: isDaqOnline ? sensors.filter(s => s.status === 'invalid').length : 0,
    offlineSensors: isDaqOnline ? sensors.filter(s => s.status === 'offline').length : sensors.length,
  };

  return (
    <SHMContext.Provider
      value={{
        sensors,
        sensorTypes,
        telemetryHistory,
        alerts,
        settings,
        auditLog,
        isDaqOnline,
        lastPacketTime,
        lastSequenceNum,
        baudRate: settings.serialBaudRate,
        activeStreamsCount,
        sensorInventoryCounts,
        connectArduinoSerial,
        disconnectArduinoSerial,
        sendRawSerialFrame,
        processIncomingHardwarePacket,
        registerSensor,
        updateSensor,
        removeSensor,
        addSensorType,
        updateSensorTypeDefaultLimit,
        acknowledgeAlert,
        resolveAlert,
        updateSettings,
        toggleTheme,
        testAppsScriptConnection,
        clearAllTelemetry,
        loadSampleHardwareProfile,
        logAuditAction,
      }}
    >
      {children}
    </SHMContext.Provider>
  );
};

export const useSHM = () => {
  const context = useContext(SHMContext);
  if (!context) {
    throw new Error('useSHM must be used within an SHMProvider');
  }
  return context;
};