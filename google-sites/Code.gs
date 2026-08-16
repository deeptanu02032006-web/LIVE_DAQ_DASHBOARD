/**
 * Bridge AI — Structural Health Monitoring (SHM)
 * Google Apps Script Production Backend & Telemetry Persistence Engine
 * 
 * Deployment Instructions:
 * 1. Open Google Sheet: https://sheets.google.com
 * 2. Extensions > Apps Script
 * 3. Replace all code in Code.gs with this file.
 * 4. Create an HTML file named "index" and paste the contents of google-sites/index.html.
 * 5. Deploy > New Deployment:
 *    - Select type: Web App
 *    - Description: Bridge SHM Production Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web App URL and paste it into daq_bridge.py and Google Sites embed.
 */

const SHEET_TELEMETRY = 'TelemetryData';
const SHEET_REGISTRY = 'SensorRegistry';
const SHEET_SETTINGS = 'BridgeSettings';
const SHEET_ALERTS = 'AlertsLog';
const SHEET_USERS = 'Users';
const SHEET_TYPES = 'SensorTypes';
const SHEET_AUDIT = 'AuditLog';

const CACHE_KEY_LIVE_STATE = 'SHM_LIVE_TELEMETRY_STATE_V3';
const WATCHDOG_TIMEOUT_SEC = 15;

/**
 * Safely parses ISO timestamp string (with optional microseconds) into Unix timestamp ms.
 */
function parseIsoTimestampMs(val) {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (!str) return 0;
  const cleaned = str.replace(/(\.\d{3})\d+/, '$1');
  const parsed = new Date(cleaned).getTime();
  if (!isNaN(parsed)) return parsed;
  const direct = new Date(str).getTime();
  return isNaN(direct) ? 0 : direct;
}

/**
 * Ensures all 7 required sheets and default headers exist.
 */
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Telemetry Data Sheet (Permanent Database)
  let telemetrySheet = ss.getSheetByName(SHEET_TELEMETRY);
  const telemetryHeaders = [
    'Timestamp ISO',
    'Local Time',
    'Sequence Number',
    'DAQ Status',
    'Sensors JSON Payload',
    'Raw Serial Frame'
  ];

  if (!telemetrySheet) {
    telemetrySheet = ss.insertSheet(SHEET_TELEMETRY);
    telemetrySheet.appendRow(telemetryHeaders);
    telemetrySheet.getRange(1, 1, 1, telemetryHeaders.length).setFontWeight('bold').setBackground('#0f172a').setFontColor('#38bdf8');
    telemetrySheet.setFrozenRows(1);
  }

  // 2. Sensor Registry Sheet
  let registrySheet = ss.getSheetByName(SHEET_REGISTRY);
  if (!registrySheet) {
    registrySheet = ss.insertSheet(SHEET_REGISTRY);
    registrySheet.appendRow([
      'Sensor ID',
      'Name',
      'Type',
      'Unit',
      'Subsystem',
      'Hardware Bus',
      'Safety Threshold',
      'Status',
      'Last Value',
      'Last Seen ISO',
      'Is Active'
    ]);
    registrySheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#0f172a').setFontColor('#38bdf8');
    registrySheet.setFrozenRows(1);

    const defaultSensors = [
      ['FORCE-01', 'Main Stay Cable T1 Load Cell', 'force', 'kN', 'Main Cable', 'Arduino Pin A0', 5000, 'idle', '', '', 'true'],
      ['FORCE-02', 'Main Stay Cable T2 Load Cell', 'force', 'kN', 'Main Cable', 'Arduino Pin A1', 5000, 'idle', '', '', 'true'],
      ['FORCE-03', 'Main Stay Cable T3 Load Cell', 'force', 'kN', 'Main Cable', 'Arduino Pin A2', 5000, 'idle', '', '', 'true'],
      ['DISPLACEMENT-01', 'South Expansion Joint LVDT', 'displacement', 'mm', 'Expansion Joint', 'Arduino Pin A3', 150, 'idle', '', '', 'true'],
      ['DISPLACEMENT-02', 'North Expansion Joint LVDT', 'displacement', 'mm', 'Expansion Joint', 'Arduino Pin A4', 150, 'idle', '', '', 'true'],
      ['STRAIN-01', 'Mid-Span Girder Strain Rosette', 'strain', 'µε', 'Deck', 'Arduino Pin A5', 1000, 'idle', '', '', 'true']
    ];
    defaultSensors.forEach(row => registrySheet.appendRow(row));
  }

  // 3. Settings Sheet
  let settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEET_SETTINGS);
    settingsSheet.appendRow(['Key', 'Value']);
    settingsSheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#0f172a').setFontColor('#38bdf8');

    const defaultSettings = [
      ['bridgeName', 'St. Lawrence Cable-Stayed Viaduct'],
      ['bridgeCode', 'SLV-SPAN-04B'],
      ['bridgeType', 'Cable-Stayed Twin-Pylon Composite'],
      ['geographicLocation', '45.4972° N, 73.5543° W (St. Lawrence River)'],
      ['designLifeYears', '100'],
      ['commissionYear', '2019'],
      ['numberOfSpans', '6'],
      ['primaryMaterial', 'High-Performance Structural Steel & Reinforced Concrete'],
      ['assetOwner', 'Federal Bridge Infrastructure Authority'],
      ['inspectionIntervalMonths', '6'],
      ['hardwareMode', 'true'],
      ['googleAppsScriptUrl', ''],
      ['daqSamplingRate', '100 Hz (High Fidelity)'],
      ['unitSystem', 'Metric (kN, MPa, mm)'],
      ['themeMode', 'Dark Theme'],
      ['serialBaudRate', '115200']
    ];
    defaultSettings.forEach(row => settingsSheet.appendRow(row));
  }

  // 4. Alerts Log Sheet
  let alertsSheet = ss.getSheetByName(SHEET_ALERTS);
  if (!alertsSheet) {
    alertsSheet = ss.insertSheet(SHEET_ALERTS);
    alertsSheet.appendRow([
      'Alert ID',
      'Severity',
      'Sensor ID',
      'Sensor Name',
      'Subsystem',
      'Source Bus',
      'Trigger Value',
      'Safety Threshold',
      'Unit',
      'Title',
      'Description',
      'Recommended Action',
      'Timestamp ISO',
      'Status',
      'Resolved At',
      'Duration Text'
    ]);
    alertsSheet.getRange(1, 1, 1, 16).setFontWeight('bold').setBackground('#0f172a').setFontColor('#38bdf8');
    alertsSheet.setFrozenRows(1);
  }

  // 5. Users Sheet
  let usersSheet = ss.getSheetByName(SHEET_USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEET_USERS);
    usersSheet.appendRow([
      'User ID',
      'Full Name',
      'Email',
      'Organization',
      'Department',
      'Designation',
      'Country',
      'Phone Number',
      'Role',
      'Is Active',
      'Created At'
    ]);
    usersSheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#0f172a').setFontColor('#38bdf8');
    usersSheet.setFrozenRows(1);

    const defaultAdmin = [
      'usr_admin_01',
      'System Administrator',
      'admin@example.com',
      'Federal Infrastructure Authority',
      'SHM Operations',
      'Chief Engineer',
      'United States',
      '+1 555-0192',
      'admin',
      'true',
      new Date().toISOString()
    ];
    usersSheet.appendRow(defaultAdmin);
  }

  // 6. Sensor Types Sheet
  let typesSheet = ss.getSheetByName(SHEET_TYPES);
  if (!typesSheet) {
    typesSheet = ss.insertSheet(SHEET_TYPES);
    typesSheet.appendRow(['Type ID', 'Name', 'Unit', 'Default Threshold']);
    typesSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#0f172a').setFontColor('#38bdf8');

    const defaultTypes = [
      ['force', 'Load / Force', 'kN', 5000],
      ['displacement', 'Displacement', 'mm', 150],
      ['strain', 'Strain', 'µε', 1000],
      ['stress', 'Stress', 'MPa', 350],
      ['inclination', 'Tower Inclination', 'deg', 2.5],
      ['temperature', 'Ambient Temperature', '°C', 45],
      ['humidity', 'Relative Humidity', '%', 90]
    ];
    defaultTypes.forEach(row => typesSheet.appendRow(row));
  }

  // 7. Audit Log Sheet
  let auditSheet = ss.getSheetByName(SHEET_AUDIT);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(SHEET_AUDIT);
    auditSheet.appendRow(['Audit ID', 'Timestamp ISO', 'Actor Name', 'Actor Email', 'Action', 'Details']);
    auditSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#0f172a').setFontColor('#38bdf8');
    auditSheet.setFrozenRows(1);

    auditSheet.appendRow([
      'aud_01',
      new Date().toISOString(),
      'System Admin',
      'admin@example.com',
      'System Initialization',
      'Bridge AI SHM Production System initialized.'
    ]);
  }
}

/**
 * Main HTTP POST Action Dispatcher & Telemetry Ingestion Handler
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.tryLock(5000);
    initSheets();

    const contents = e.postData.contents;
    const payload = JSON.parse(contents);

    // Route state-changing RPC actions from index.html
    if (payload.action) {
      return handleRpcAction(payload);
    }

    // Otherwise handle raw/JSON Telemetry Ingestion from Python daq_bridge.py
    return handleTelemetryIngestion(payload, contents);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: { code: 'SERVER_ERROR', message: err.toString() } }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Handles telemetry packet ingestion from daq_bridge.py
 */
function handleTelemetryIngestion(data, rawContents) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nowMs = Date.now();
  const timestampISO = data.tickTimestamp || data.timestamp || new Date(nowMs).toISOString();
  const localTimeStr = Utilities.formatDate(new Date(nowMs), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const seq = Number(data.seq || data.sequenceNumber || 0);
  const daqStatus = data.daqStatus || 'ONLINE';
  const rawSensors = Array.isArray(data.sensors) ? data.sensors : [];

  // 1. Read persistent Sensor Registry
  const registrySheet = ss.getSheetByName(SHEET_REGISTRY);
  const regValues = registrySheet.getDataRange().getValues();
  const registeredSensors = [];

  for (let i = 1; i < regValues.length; i++) {
    const r = regValues[i];
    registeredSensors.push({
      id: String(r[0]),
      name: String(r[1]),
      type: String(r[2]),
      unit: String(r[3]),
      subsystem: String(r[4]),
      hardwareBus: String(r[5]),
      threshold: Number(r[6]),
      status: String(r[7]),
      lastValue: r[8] !== '' && !isNaN(r[8]) ? Number(r[8]) : null,
      lastSeen: String(r[9]),
      isActive: String(r[10]).toLowerCase() === 'true',
      rowIndex: i + 1
    });
  }

  // 2. Read existing active alerts from AlertsLog
  const alertsSheet = ss.getSheetByName(SHEET_ALERTS);
  const alertsValues = alertsSheet.getDataRange().getValues();
  const activeAlerts = [];

  for (let i = 1; i < alertsValues.length; i++) {
    const row = alertsValues[i];
    activeAlerts.push({
      id: String(row[0]),
      severity: String(row[1]),
      sensorId: String(row[2]),
      sensorName: String(row[3]),
      subsystem: String(row[4]),
      sourceBus: String(row[5]),
      triggerValue: Number(row[6]),
      safetyThreshold: Number(row[7]),
      unit: String(row[8]),
      title: String(row[9]),
      description: String(row[10]),
      recommendedAction: String(row[11]),
      timestamp: String(row[12]),
      status: String(row[13]),
      resolvedAt: String(row[14]),
      durationText: String(row[15]),
      rowIndex: i + 1
    });
  }

  // 3. Process each registered sensor with incoming telemetry
  const readingsMap = {};
  const updatedSensors = registeredSensors.map(sensor => {
    const match = rawSensors.find(e => String(e.sensorId || e.id || '').toUpperCase() === sensor.id.toUpperCase());

    if (match && sensor.isActive) {
      const rawStatus = String(match.status || 'offline').toLowerCase();
      const isOnline = (rawStatus === 'online' || rawStatus === 'raw' || rawStatus === 'ok') && daqStatus === 'ONLINE';
      const val = (match.value !== null && match.value !== undefined && !isNaN(match.value)) ? Number(match.value) : null;

      if (isOnline && val !== null) {
        readingsMap[sensor.id] = val;
        let newStatus = 'online';

        // Server-Side Threshold Evaluation (Section 9)
        if (val >= sensor.threshold) {
          newStatus = val >= sensor.threshold * 1.15 ? 'critical' : 'warning';
          const alertSev = newStatus === 'critical' ? 'CRITICAL' : 'WARNING';
          const alertTitle = `Threshold Exceeded: ${sensor.id} — ${val.toFixed(1)} ${sensor.unit} > ${sensor.threshold} ${sensor.unit} limit`;

          // Check if active unacknowledged alert already exists for this sensor threshold
          const existingAlert = activeAlerts.find(a => a.sensorId === sensor.id && a.title.includes('Threshold Exceeded') && a.status === 'Unacknowledged');
          if (!existingAlert) {
            const newAlertRow = [
              `alt_thresh_${nowMs}_${sensor.id}`,
              alertSev,
              sensor.id,
              sensor.name,
              sensor.subsystem,
              sensor.hardwareBus,
              val,
              sensor.threshold,
              sensor.unit,
              alertTitle,
              `Live telemetry reading of ${val.toFixed(1)} ${sensor.unit} surpassed safety threshold limit of ${sensor.threshold} ${sensor.unit}.`,
              sensor.type === 'force' ? 'Inspect stay cable tension anchors & load distribution.' : sensor.type === 'displacement' ? 'Verify expansion joint bearings for thermal bind.' : 'Perform non-destructive ultrasonic testing on deck weld rosettes.',
              timestampISO,
              'Unacknowledged',
              '',
              ''
            ];
            alertsSheet.appendRow(newAlertRow);
          }
        }

        // Update Registry Sheet Row
        registrySheet.getRange(sensor.rowIndex, 8, 1, 3).setValues([[newStatus, val, timestampISO]]);

        return {
          ...sensor,
          currentValue: val,
          lastKnownValue: val,
          status: newStatus,
          lastSeen: timestampISO
        };
      } else {
        readingsMap[sensor.id] = null;
        const newStatus = isOnline ? 'disconnected' : rawStatus;
        registrySheet.getRange(sensor.rowIndex, 8, 1, 3).setValues([[newStatus, sensor.lastValue, sensor.lastSeen]]);
        return {
          ...sensor,
          currentValue: null,
          status: newStatus
        };
      }
    } else {
      readingsMap[sensor.id] = null;
      return {
        ...sensor,
        currentValue: null,
        status: daqStatus === 'ONLINE' ? (sensor.status === 'idle' ? 'idle' : 'disconnected') : 'offline'
      };
    }
  });

  // 4. Server-Side Sensor Disconnection Watchdog Check
  const unavailableSensors = updatedSensors.filter(s => s.isActive && (s.status === 'disconnected' || s.status === 'stale' || s.status === 'invalid' || s.status === 'offline'));
  if (unavailableSensors.length > 0 && daqStatus === 'ONLINE') {
    if (unavailableSensors.length === 1) {
      const s = unavailableSensors[0];
      const activeDiscAlert = activeAlerts.find(a => a.sensorId === s.id && a.title.includes('SENSOR DISCONNECTED') && a.status === 'Unacknowledged');
      if (!activeDiscAlert) {
        alertsSheet.appendRow([
          `alt_sng_disc_${nowMs}_${s.id}`,
          'WARNING',
          s.id,
          s.name,
          s.subsystem,
          s.hardwareBus,
          0,
          s.threshold,
          s.unit,
          `SENSOR DISCONNECTED: ${s.id}`,
          `${s.id} (${s.name}) has stopped providing valid sensor data while the Arduino remains ONLINE.`,
          'Inspect sensor wiring, connector, power supply and signal-conditioning circuit.',
          timestampISO,
          'Unacknowledged',
          '',
          ''
        ]);
      }
    } else {
      const activeMultiAlert = activeAlerts.find(a => a.title.includes('MULTIPLE SENSOR DISCONNECTION') && a.status === 'Unacknowledged');
      if (!activeMultiAlert) {
        alertsSheet.appendRow([
          `alt_multi_disc_${nowMs}`,
          'CRITICAL',
          unavailableSensors.map(s => s.id).join(', '),
          `${unavailableSensors.length} Disconnected Nodes`,
          'Deck',
          'Hardware Bus',
          unavailableSensors.length,
          1,
          'NODES',
          `MULTIPLE SENSOR DISCONNECTION (${unavailableSensors.length} Nodes)`,
          `${unavailableSensors.length} sensors (${unavailableSensors.map(s => s.id).join(', ')}) have stopped providing valid data.`,
          'Inspect DAQ wiring, sensor power distribution and common signal path.',
          timestampISO,
          'Unacknowledged',
          '',
          ''
        ]);
      }
    }
  }

  // 5. Append Telemetry Data Row Permanently
  const telemetrySheet = ss.getSheetByName(SHEET_TELEMETRY);
  telemetrySheet.appendRow([
    timestampISO,
    localTimeStr,
    seq,
    daqStatus,
    JSON.stringify(rawSensors),
    rawContents
  ]);

  // 6. Build Live Cache State Object
  const dataPoint = {
    timestamp: timestampISO,
    timeLabel: Utilities.formatDate(new Date(nowMs), Session.getScriptTimeZone(), 'HH:mm:ss'),
    seq: seq,
    daqStatus: daqStatus,
    readingsMap: readingsMap
  };
  updatedSensors.forEach(s => {
    dataPoint[s.id] = s.currentValue;
  });

  const cache = CacheService.getScriptCache();
  let recentEntries = [];
  const cachedStateRaw = cache.get(CACHE_KEY_LIVE_STATE);
  if (cachedStateRaw) {
    try {
      const parsedState = JSON.parse(cachedStateRaw);
      if (Array.isArray(parsedState.recentEntries)) {
        recentEntries = parsedState.recentEntries;
      }
    } catch (e) {}
  }
  recentEntries.push(dataPoint);
  if (recentEntries.length > 50) recentEntries = recentEntries.slice(-50);

  // Grouped statistics calculation
  const calcGroupStats = (type) => {
    const typeSensors = updatedSensors.filter(s => s.type === type);
    const validVals = typeSensors.map(s => s.currentValue).filter(v => v !== null && !isNaN(v));
    if (validVals.length === 0) {
      return { activeCount: 0, totalCount: typeSensors.length, avg: null, max: null, min: null, isInstantLive: false };
    }
    const sum = validVals.reduce((a, b) => a + b, 0);
    return {
      activeCount: validVals.length,
      totalCount: typeSensors.length,
      avg: sum / validVals.length,
      max: Math.max(...validVals),
      min: Math.min(...validVals),
      isInstantLive: true
    };
  };

  const groupedStats = {
    force: calcGroupStats('force'),
    displacement: calcGroupStats('displacement'),
    strain: calcGroupStats('strain')
  };

  const inventoryCounts = {
    totalSensors: updatedSensors.length,
    onlineSensors: updatedSensors.filter(s => s.status === 'online').length,
    disconnectedSensors: updatedSensors.filter(s => s.status === 'disconnected').length,
    staleSensors: updatedSensors.filter(s => s.status === 'stale').length,
    invalidSensors: updatedSensors.filter(s => s.status === 'invalid').length,
    offlineSensors: updatedSensors.filter(s => s.status === 'offline').length
  };

  // Re-read active alerts for cache state
  const latestAlertsValues = alertsSheet.getDataRange().getValues();
  const latestAlerts = [];
  for (let i = 1; i < latestAlertsValues.length; i++) {
    const r = latestAlertsValues[i];
    latestAlerts.push({
      id: String(r[0]),
      severity: String(r[1]),
      sensorId: String(r[2]),
      sensorName: String(r[3]),
      subsystem: String(r[4]),
      sourceBus: String(r[5]),
      triggerValue: Number(r[6]),
      safetyThreshold: Number(r[7]),
      unit: String(r[8]),
      title: String(r[9]),
      description: String(r[10]),
      recommendedAction: String(r[11]),
      timestamp: String(r[12]),
      status: String(r[13]),
      resolvedAt: String(r[14]),
      durationText: String(r[15])
    });
  }

  const liveState = {
    status: 'OK',
    isDaqOnline: daqStatus === 'ONLINE',
    lastPacketTime: timestampISO,
    lastSequenceNum: seq,
    lastPacketTimestampMs: nowMs,
    packetAgeMs: 0,
    inventoryCounts: inventoryCounts,
    sensors: updatedSensors,
    groupedStats: groupedStats,
    recentEntries: recentEntries,
    alerts: latestAlerts
  };

  cache.put(CACHE_KEY_LIVE_STATE, JSON.stringify(liveState), 60);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, action: 'ingestTelemetry', seq: seq, timestamp: timestampISO }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles state-changing RPC actions from index.html
 */
function handleRpcAction(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = payload.action;
  const nowISO = new Date().toISOString();

  if (action === 'signIn') {
    const email = String(payload.email || '').trim().toLowerCase();
    const usersSheet = ss.getSheetByName(SHEET_USERS);
    const values = usersSheet.getDataRange().getValues();

    if (values.length <= 1 && email === 'admin@example.com') {
      const initialAdmin = ['usr_admin_01', 'System Administrator', 'admin@example.com', 'Federal Infrastructure Authority', 'SHM Operations', 'Chief Engineer', 'United States', '+1 555-0192', 'admin', 'true', nowISO];
      usersSheet.appendRow(initialAdmin);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, user: { id: 'usr_admin_01', fullName: 'System Administrator', email: 'admin@example.com', role: 'admin', isActive: true } })).setMimeType(ContentService.MimeType.JSON);
    }

    for (let i = 1; i < values.length; i++) {
      const r = values[i];
      if (String(r[2]).toLowerCase() === email) {
        const isActive = String(r[9]).toLowerCase() === 'true';
        if (!isActive) {
          return ContentService.createTextOutput(JSON.stringify({ ok: false, error: { code: 'DEACTIVATED', message: 'Account is deactivated. Contact Administrator.' } })).setMimeType(ContentService.MimeType.JSON);
        }
        return ContentService.createTextOutput(JSON.stringify({
          ok: true,
          user: {
            id: String(r[0]),
            fullName: String(r[1]),
            email: String(r[2]),
            organization: String(r[3]),
            department: String(r[4]),
            designation: String(r[5]),
            country: String(r[6]),
            phoneNumber: String(r[7]),
            role: String(r[8]),
            isActive: true
          }
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: { code: 'USER_NOT_FOUND', message: 'User account not registered.' } })).setMimeType(ContentService.MimeType.JSON);

  } else if (action === 'signUp') {
    const usersSheet = ss.getSheetByName(SHEET_USERS);
    const values = usersSheet.getDataRange().getValues();
    const email = String(payload.email || '').trim().toLowerCase();

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][2]).toLowerCase() === email) {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, error: { code: 'EXISTS', message: 'An account with this email already exists.' } })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    const assignedRole = values.length <= 1 ? 'admin' : 'user';
    const userId = `usr_${Date.now()}`;
    const newUserRow = [
      userId,
      payload.fullName || 'User',
      email,
      payload.organization || 'N/A',
      payload.department || 'N/A',
      payload.designation || 'Engineer',
      payload.country || 'United States',
      payload.phoneNumber || '',
      assignedRole,
      'true',
      nowISO
    ];

    usersSheet.appendRow(newUserRow);
    logAuditRow('System', email, 'User Sign Up', `Registered user ${payload.fullName} (${email}). Role: ${assignedRole}`);

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      user: {
        id: userId,
        fullName: payload.fullName,
        email: email,
        organization: payload.organization,
        department: payload.department,
        designation: payload.designation,
        country: payload.country,
        phoneNumber: payload.phoneNumber,
        role: assignedRole,
        isActive: true
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } else if (action === 'registerSensor') {
    const sheet = ss.getSheetByName(SHEET_REGISTRY);
    const s = payload.sensor;
    const newRow = [
      s.id.toUpperCase(),
      s.name,
      s.type,
      s.unit,
      s.subsystem,
      s.hardwareBus,
      s.threshold,
      'idle',
      '',
      '',
      'true'
    ];
    sheet.appendRow(newRow);
    logAuditRow(payload.actor || 'Admin', payload.actorEmail || 'admin@example.com', 'Register Sensor', `Registered node ${s.id} (${s.name}) on ${s.hardwareBus}.`);
    invalidateCache();
    return ContentService.createTextOutput(JSON.stringify({ ok: true, message: `Sensor ${s.id} registered.` })).setMimeType(ContentService.MimeType.JSON);

  } else if (action === 'removeSensor') {
    const sheet = ss.getSheetByName(SHEET_REGISTRY);
    const values = sheet.getDataRange().getValues();
    const sensorId = String(payload.sensorId).toUpperCase();

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).toUpperCase() === sensorId) {
        sheet.deleteRow(i + 1);
        logAuditRow(payload.actor || 'Admin', payload.actorEmail || 'admin@example.com', 'Remove Sensor', `Removed hardware node ${sensorId}.`);
        invalidateCache();
        return ContentService.createTextOutput(JSON.stringify({ ok: true, message: `Sensor ${sensorId} removed.` })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: { message: 'Sensor not found' } })).setMimeType(ContentService.MimeType.JSON);

  } else if (action === 'acknowledgeAlert' || action === 'resolveAlert') {
    const sheet = ss.getSheetByName(SHEET_ALERTS);
    const values = sheet.getDataRange().getValues();
    const alertId = String(payload.alertId);

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === alertId) {
        sheet.getRange(i + 1, 14, 1, 2).setValues([['Resolved', nowISO]]);
        invalidateCache();
        return ContentService.createTextOutput(JSON.stringify({ ok: true, message: `Alert ${alertId} resolved.` })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: { message: 'Alert not found' } })).setMimeType(ContentService.MimeType.JSON);

  } else if (action === 'updateSettings') {
    const sheet = ss.getSheetByName(SHEET_SETTINGS);
    const newSettings = payload.settings || {};
    const values = sheet.getDataRange().getValues();

    Object.keys(newSettings).forEach(key => {
      let found = false;
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === key) {
          sheet.getRange(i + 1, 2).setValue(String(newSettings[key]));
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([key, String(newSettings[key])]);
      }
    });

    logAuditRow(payload.actor || 'Admin', payload.actorEmail || 'admin@example.com', 'Update Settings', 'Updated bridge metadata and DAQ acquisition parameters.');
    invalidateCache();
    return ContentService.createTextOutput(JSON.stringify({ ok: true, message: 'Settings updated.' })).setMimeType(ContentService.MimeType.JSON);

  } else if (action === 'updateUserRole') {
    const sheet = ss.getSheetByName(SHEET_USERS);
    const values = sheet.getDataRange().getValues();
    const userId = String(payload.userId);
    const newRole = String(payload.role);

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === userId) {
        sheet.getRange(i + 1, 9).setValue(newRole);
        logAuditRow(payload.actor || 'Admin', payload.actorEmail || 'admin@example.com', 'Update User Role', `Changed role for user ${values[i][1]} to ${newRole.toUpperCase()}.`);
        return ContentService.createTextOutput(JSON.stringify({ ok: true, message: `User role updated to ${newRole}` })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: { message: 'User not found' } })).setMimeType(ContentService.MimeType.JSON);

  } else if (action === 'updateSensorTypeLimit') {
    const sheet = ss.getSheetByName(SHEET_TYPES);
    const values = sheet.getDataRange().getValues();
    const typeId = String(payload.typeId);
    const newLimit = Number(payload.newThreshold);

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === typeId) {
        sheet.getRange(i + 1, 4).setValue(newLimit);

        // Also update existing registered sensors of this type
        const regSheet = ss.getSheetByName(SHEET_REGISTRY);
        const regVals = regSheet.getDataRange().getValues();
        for (let j = 1; j < regVals.length; j++) {
          if (String(regVals[j][2]) === typeId) {
            regSheet.getRange(j + 1, 7).setValue(newLimit);
          }
        }

        logAuditRow(payload.actor || 'Admin', payload.actorEmail || 'admin@example.com', 'Update Default Limit', `Modified safety threshold for type ${typeId} to ${newLimit}.`);
        invalidateCache();
        return ContentService.createTextOutput(JSON.stringify({ ok: true, message: `Sensor type threshold updated to ${newLimit}` })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: { message: 'Sensor type not found' } })).setMimeType(ContentService.MimeType.JSON);

  } else if (action === 'resetTelemetry') {
    const teleSheet = ss.getSheetByName(SHEET_TELEMETRY);
    if (teleSheet && teleSheet.getLastRow() > 1) {
      teleSheet.getRange(2, 1, teleSheet.getLastRow() - 1, teleSheet.getLastColumn()).clearContent();
    }
    const alertSheet = ss.getSheetByName(SHEET_ALERTS);
    if (alertSheet && alertSheet.getLastRow() > 1) {
      alertSheet.getRange(2, 1, alertSheet.getLastRow() - 1, alertSheet.getLastColumn()).clearContent();
    }
    logAuditRow(payload.actor || 'Admin', payload.actorEmail || 'admin@example.com', 'Reset Telemetry', 'Wiped telemetry data points and reset active alerts.');
    invalidateCache();
    return ContentService.createTextOutput(JSON.stringify({ ok: true, message: 'Telemetry and alerts reset.' })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: { message: 'Unknown RPC action' } })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Writes an entry to AuditLog sheet
 */
function logAuditRow(actor, actorEmail, actionStr, detailsStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_AUDIT);
  if (!sheet) {
    initSheets();
    sheet = ss.getSheetByName(SHEET_AUDIT);
  }
  sheet.appendRow([
    `aud_${Date.now()}`,
    new Date().toISOString(),
    actor,
    actorEmail,
    actionStr,
    detailsStr
  ]);
}

/**
 * Invalidates live state cache
 */
function invalidateCache() {
  CacheService.getScriptCache().remove(CACHE_KEY_LIVE_STATE);
}

/**
 * Main HTTP GET Dispatcher
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

  if (action === 'getDashboardData') {
    return handleGetDashboardData();
  } else if (action === 'getHistory') {
    return handleGetHistory(e.parameter);
  } else if (action === 'getSensorRegistry') {
    return handleGetSensorRegistry();
  } else if (action === 'getAlerts') {
    return handleGetAlerts();
  } else if (action === 'getSettings') {
    return handleGetSettings();
  } else if (action === 'getUsers') {
    return handleGetUsers();
  } else if (action === 'getSensorTypes') {
    return handleGetSensorTypes();
  } else if (action === 'getAuditLog') {
    return handleGetAuditLog();
  }

  // Default: Serve Web App HTML
  const template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('Bridge AI — SHM Live SCADA Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Returns live dashboard data payload (high speed CacheService read)
 */
function handleGetDashboardData() {
  try {
    const cache = CacheService.getScriptCache();
    const cachedStateRaw = cache.get(CACHE_KEY_LIVE_STATE);
    const nowMs = Date.now();

    if (cachedStateRaw) {
      const state = JSON.parse(cachedStateRaw);
      const age = nowMs - state.lastPacketTimestampMs;
      state.packetAgeMs = age;
      state.isDaqOnline = age <= (WATCHDOG_TIMEOUT_SEC * 1000);

      if (!state.isDaqOnline) {
        state.inventoryCounts.onlineSensors = 0;
        state.inventoryCounts.offlineSensors = state.inventoryCounts.totalSensors;
        state.sensors = state.sensors.map(s => Object.assign({}, s, {
          status: 'offline',
          currentValue: null
        }));
      }

      return ContentService
        .createTextOutput(JSON.stringify(state))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Cache miss -> read from Sheets
    initSheets();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Read Settings
    const settingsObj = {};
    const settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
    const setVals = settingsSheet.getDataRange().getValues();
    for (let i = 1; i < setVals.length; i++) {
      settingsObj[setVals[i][0]] = setVals[i][1];
    }

    // Read Registry
    const registrySheet = ss.getSheetByName(SHEET_REGISTRY);
    const regValues = registrySheet.getDataRange().getValues();
    const sensors = [];
    for (let i = 1; i < regValues.length; i++) {
      const r = regValues[i];
      sensors.push({
        id: String(r[0]),
        name: String(r[1]),
        type: String(r[2]),
        unit: String(r[3]),
        subsystem: String(r[4]),
        hardwareBus: String(r[5]),
        threshold: Number(r[6]),
        status: String(r[7]),
        currentValue: r[8] !== '' && !isNaN(r[8]) ? Number(r[8]) : null,
        lastKnownValue: r[8] !== '' && !isNaN(r[8]) ? Number(r[8]) : null,
        lastSeen: String(r[9]),
        isActive: String(r[10]).toLowerCase() === 'true'
      });
    }

    // Read Alerts
    const alertsSheet = ss.getSheetByName(SHEET_ALERTS);
    const alertVals = alertsSheet.getDataRange().getValues();
    const alerts = [];
    for (let i = 1; i < alertVals.length; i++) {
      const r = alertVals[i];
      alerts.push({
        id: String(r[0]),
        severity: String(r[1]),
        sensorId: String(r[2]),
        sensorName: String(r[3]),
        subsystem: String(r[4]),
        sourceBus: String(r[5]),
        triggerValue: Number(r[6]),
        safetyThreshold: Number(r[7]),
        unit: String(r[8]),
        title: String(r[9]),
        description: String(r[10]),
        recommendedAction: String(r[11]),
        timestamp: String(r[12]),
        status: String(r[13]),
        resolvedAt: String(r[14]),
        durationText: String(r[15])
      });
    }

    // Read Telemetry Recent Entries
    const telemetrySheet = ss.getSheetByName(SHEET_TELEMETRY);
    const lastRow = telemetrySheet.getLastRow();
    const recentEntries = [];
    let isDaqOnline = false;
    let lastPacketTime = null;
    let lastSequenceNum = null;
    let packetAgeMs = 99999;

    if (lastRow > 1) {
      const startRow = Math.max(2, lastRow - 30 + 1);
      const numRows = lastRow - startRow + 1;
      const dataValues = telemetrySheet.getRange(startRow, 1, numRows, 6).getValues();

      dataValues.forEach(row => {
        const timeISO = String(row[0]);
        const seq = Number(row[2]);
        const daqStat = String(row[3]);
        let sensorsParsed = [];

        try {
          sensorsParsed = JSON.parse(String(row[4] || '[]'));
        } catch (err) {}

        const dataPoint = {
          timestamp: timeISO,
          timeLabel: timeISO ? Utilities.formatDate(new Date(timeISO), Session.getScriptTimeZone(), 'HH:mm:ss') : '',
          seq: seq,
          daqStatus: daqStat,
          readingsMap: {}
        };

        if (Array.isArray(sensorsParsed)) {
          sensorsParsed.forEach(s => {
            const sId = String(s.sensorId || s.id || '').toUpperCase();
            const val = (s.value !== null && s.value !== undefined && !isNaN(s.value)) ? Number(s.value) : null;
            dataPoint.readingsMap[sId] = val;
            dataPoint[sId] = val;
          });
        }
        recentEntries.push(dataPoint);
      });

      const latestRow = dataValues[dataValues.length - 1];
      const latestTimeMs = parseIsoTimestampMs(latestRow[0]);
      packetAgeMs = latestTimeMs > 0 ? (nowMs - latestTimeMs) : 999999;
      isDaqOnline = packetAgeMs >= 0 && packetAgeMs <= (WATCHDOG_TIMEOUT_SEC * 1000);
      lastPacketTime = String(latestRow[0]);
      lastSequenceNum = Number(latestRow[2]);
    }

    const inventoryCounts = {
      totalSensors: sensors.length,
      onlineSensors: isDaqOnline ? sensors.filter(s => s.status === 'online').length : 0,
      disconnectedSensors: isDaqOnline ? sensors.filter(s => s.status === 'disconnected').length : 0,
      staleSensors: isDaqOnline ? sensors.filter(s => s.status === 'stale').length : 0,
      invalidSensors: isDaqOnline ? sensors.filter(s => s.status === 'invalid').length : 0,
      offlineSensors: isDaqOnline ? sensors.filter(s => s.status === 'offline').length : sensors.length
    };

    const calcGroupStats = (type) => {
      const typeSensors = sensors.filter(s => s.type === type);
      const validVals = typeSensors.map(s => isDaqOnline ? s.currentValue : s.lastKnownValue).filter(v => v !== null && !isNaN(v));
      if (validVals.length === 0) {
        return { activeCount: 0, totalCount: typeSensors.length, avg: null, max: null, min: null, isInstantLive: false };
      }
      const sum = validVals.reduce((a, b) => a + b, 0);
      return {
        activeCount: isDaqOnline ? validVals.length : 0,
        totalCount: typeSensors.length,
        avg: sum / validVals.length,
        max: Math.max(...validVals),
        min: Math.min(...validVals),
        isInstantLive: isDaqOnline
      };
    };

    const groupedStats = {
      force: calcGroupStats('force'),
      displacement: calcGroupStats('displacement'),
      strain: calcGroupStats('strain')
    };

    const payload = {
      status: 'OK',
      serverTime: new Date(nowMs).toISOString(),
      isDaqOnline: isDaqOnline,
      lastPacketTime: lastPacketTime,
      lastSequenceNum: lastSequenceNum,
      packetAgeMs: packetAgeMs,
      inventoryCounts: inventoryCounts,
      sensors: sensors,
      groupedStats: groupedStats,
      recentEntries: recentEntries,
      alerts: alerts,
      settings: settingsObj
    };

    cache.put(CACHE_KEY_LIVE_STATE, JSON.stringify(payload), 60);

    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ERROR', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles GET history request for Historical Analytics
 */
function handleGetHistory(params) {
  try {
    initSheets();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const telemetrySheet = ss.getSheetByName(SHEET_TELEMETRY);
    const lastRow = telemetrySheet.getLastRow();

    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'OK', count: 0, entries: [] })).setMimeType(ContentService.MimeType.JSON);
    }

    const maxEntries = 500;
    const startRow = Math.max(2, lastRow - maxEntries + 1);
    const numRows = lastRow - startRow + 1;
    const dataValues = telemetrySheet.getRange(startRow, 1, numRows, 5).getValues();

    const entries = dataValues.map(row => {
      const timeISO = String(row[0]);
      let sensorsParsed = [];
      try {
        sensorsParsed = JSON.parse(String(row[4] || '[]'));
      } catch (e) {}

      const item = {
        timestamp: timeISO,
        timeLabel: timeISO ? Utilities.formatDate(new Date(timeISO), Session.getScriptTimeZone(), 'HH:mm:ss') : '',
        seq: Number(row[2]),
        daqStatus: String(row[3])
      };

      if (Array.isArray(sensorsParsed)) {
        sensorsParsed.forEach(s => {
          const id = String(s.sensorId || s.id || '').toUpperCase();
          const val = (s.value !== null && s.value !== undefined && !isNaN(s.value)) ? Number(s.value) : null;
          item[id] = val;
        });
      }
      return item;
    });

    return ContentService.createTextOutput(JSON.stringify({ status: 'OK', count: entries.length, entries: entries })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ERROR', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetSensorRegistry() {
  initSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const values = ss.getSheetByName(SHEET_REGISTRY).getDataRange().getValues();
  const list = [];
  for (let i = 1; i < values.length; i++) {
    list.push({
      id: values[i][0],
      name: values[i][1],
      type: values[i][2],
      unit: values[i][3],
      subsystem: values[i][4],
      hardwareBus: values[i][5],
      threshold: values[i][6],
      status: values[i][7],
      lastValue: values[i][8],
      lastSeen: values[i][9],
      isActive: String(values[i][10]).toLowerCase() === 'true'
    });
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'OK', sensors: list })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetAlerts() {
  initSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const values = ss.getSheetByName(SHEET_ALERTS).getDataRange().getValues();
  const list = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    list.push({
      id: r[0], severity: r[1], sensorId: r[2], sensorName: r[3], subsystem: r[4], sourceBus: r[5],
      triggerValue: r[6], safetyThreshold: r[7], unit: r[8], title: r[9], description: r[10],
      recommendedAction: r[11], timestamp: r[12], status: r[13], resolvedAt: r[14], durationText: r[15]
    });
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'OK', alerts: list })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetSettings() {
  initSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const values = ss.getSheetByName(SHEET_SETTINGS).getDataRange().getValues();
  const obj = {};
  for (let i = 1; i < values.length; i++) {
    obj[values[i][0]] = values[i][1];
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'OK', settings: obj })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetUsers() {
  initSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const values = ss.getSheetByName(SHEET_USERS).getDataRange().getValues();
  const list = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    list.push({
      id: r[0], fullName: r[1], email: r[2], organization: r[3], department: r[4], designation: r[5],
      country: r[6], phoneNumber: r[7], role: r[8], isActive: String(r[9]).toLowerCase() === 'true', createdAt: r[10]
    });
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'OK', users: list })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetSensorTypes() {
  initSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const values = ss.getSheetByName(SHEET_TYPES).getDataRange().getValues();
  const list = [];
  for (let i = 1; i < values.length; i++) {
    list.push({ id: values[i][0], name: values[i][1], unit: values[i][2], defaultThreshold: Number(values[i][3]) });
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'OK', sensorTypes: list })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetAuditLog() {
  initSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const values = ss.getSheetByName(SHEET_AUDIT).getDataRange().getValues();
  const list = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    list.push({ id: r[0], timestamp: r[1], actor: r[2], actorEmail: r[3], action: r[4], details: r[5] });
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'OK', auditLog: list.reverse() })).setMimeType(ContentService.MimeType.JSON);
}
