export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  fullName: string;
  email: string;
  organization?: string;
  department?: string;
  designation?: string;
  country: string;
  phoneNumber: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export type SensorType = string;
export type SubsystemLocation = 'Main Cable' | 'Deck' | 'Pylon' | 'Expansion Joint' | string;
export type SensorStatus = 'online' | 'offline' | 'disconnected' | 'stale' | 'invalid' | 'idle' | 'warning' | 'critical' | 'fault';

export interface SensorTypeDefinition {
  id: string;
  name: string;
  unit: string;
  defaultThreshold: number;
}

export interface Sensor {
  id: string;
  name: string;
  type: SensorType;
  unit: string;
  subsystem: SubsystemLocation;
  hardwareBus: string;
  currentValue: number | null; // Strict rule: null when status is not 'online'
  lastKnownValue: number | null; // Retained for historical analysis
  threshold: number;
  status: SensorStatus;
  isActive: boolean;
  lastUpdated?: string;
  lastSeen?: string;
}

export interface TelemetryReading {
  sensorId: string;
  type: string;
  status: SensorStatus;
  value: number | null;
  unit: string;
}

export interface TelemetryDataPoint {
  timestamp: string; // tickTimestamp ISO string
  timeLabel: string;
  seq?: number;
  readingsMap: Record<string, number | null>;
  [sensorId: string]: any;
}

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'WATCH' | 'INFO';
export type AlertStatus = 'Unacknowledged' | 'Resolved';

export interface AlertEvent {
  id: string;
  severity: AlertSeverity;
  sensorId: string;
  sensorName: string;
  subsystem: SubsystemLocation;
  sourceBus: string;
  triggerValue: number;
  safetyThreshold: number;
  unit: string;
  title: string;
  description: string;
  recommendedAction: string;
  timestamp: string;
  resolvedAt?: string;
  durationText?: string;
  status: AlertStatus;
}

export interface BridgeSettings {
  bridgeName: string;
  bridgeCode: string;
  bridgeType: string;
  geographicLocation: string;
  designLifeYears: number;
  commissionYear: number;
  numberOfSpans: number;
  primaryMaterial: string;
  assetOwner: string;
  inspectionIntervalMonths: number;
  hardwareMode: boolean;
  googleAppsScriptUrl: string;
  lastSyncTime?: string;
  daqSamplingRate: '10 Hz' | '50 Hz' | '100 Hz (High Fidelity)';
  unitSystem: 'Metric (kN, MPa, mm)' | 'Imperial (kips, ksi, in)';
  themeMode: 'Dark Theme' | 'Light Theme';
  serialBaudRate: 9600 | 115200 | 57600;
}

export interface SensorInventoryCounts {
  totalSensors: number;
  onlineSensors: number;
  disconnectedSensors: number;
  staleSensors: number;
  invalidSensors: number;
  offlineSensors: number;
}

export interface CountryCode {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorEmail: string;
  action: string;
  details: string;
}
