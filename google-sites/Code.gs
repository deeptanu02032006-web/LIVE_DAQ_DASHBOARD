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

const CACHE_KEY_LIVE_STATE = 'SHM_LIVE_TELEMETRY_STATE_V2';
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
  // Clean microseconds e.g. .553435+00:00 -> .553+00:00
  const cleaned = str.replace(/(\.\d{3})\d+/, '$1');
  const parsed = new Date(cleaned).getTime();
  if (!isNaN(parsed)) return parsed;
  const direct = new Date(str).getTime();
  return isNaN(direct) ? 0 : direct;
}

/**
 * Ensures required sheets and headers exist.
 */
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Telemetry Data Sheet (Permanent Database — NEVER DELETED)
  let telemetrySheet = ss.getSheetByName(SHEET_TELEMETRY);
  const targetHeaders = [
    'Timestamp ISO',
    'Local Time',
    'Sequence Number',
    'DAQ Status',
    'Force',
    'Stress',
    'Strain',
    'Displacement',
    'Temperature',
    'Humidity',
    'Raw Serial Frame'
  ];

  if (!telemetrySheet) {
    telemetrySheet = ss.insertSheet(SHEET_TELEMETRY);
    telemetrySheet.appendRow(targetHeaders);
    telemetrySheet.getRange(1, 1, 1, targetHeaders.length).setFontWeight('bold').setBackground('#0f172a').setFontColor('#38bdf8');
    telemetrySheet.setFrozenRows(1);
  } else {
    // Check and upgrade header row if using old 6-column format or raw JSON payload header
    const firstRowValues = telemetrySheet.getRange(1, 1, 1, Math.max(6, telemetrySheet.getLastColumn())).getValues()[0];
    if (firstRowValues[4] === 'Sensors JSON Payload' || firstRowValues.length < 11) {
      telemetrySheet.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]).setFontWeight('bold').setBackground('#0f172a').setFontColor('#38bdf8');
    }
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
      'Last Seen ISO'
    ]);
    registrySheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#0f172a').setFontColor('#38bdf8');
    registrySheet.setFrozenRows(1);

    const defaultSensors = [
      ['FORCE-01', 'Main Stay Cable T1 Load Cell', 'force', 'kN', 'Main Cable', 'Arduino Pin A0', 5000, 'online', 2500, ''],
      ['DISPLACEMENT-01', 'South Expansion Joint LVDT', 'displacement', 'mm', 'Expansion Joint', 'Arduino Pin A1', 150, 'online', 75, ''],
      ['STRAIN-01', 'Mid-Span Girder Strain Rosette', 'strain', 'µε', 'Deck', 'Arduino Pin A2', 1000, 'online', 500, '']
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
      ['serialBaudRate', '115200'],
      ['daqSamplingRate', '100 Hz (High Fidelity)'],
      ['unitSystem', 'Metric (kN, MPa, mm)'],
      ['themeMode', 'Dark Theme']
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
      'Resolved At'
    ]);
    alertsSheet.getRange(1, 1, 1, 15).setFontWeight('bold').setBackground('#0f172a').setFontColor('#38bdf8');
    alertsSheet.setFrozenRows(1);
  }
}

/**
 * Handles incoming POST requests from Python DAQ Bridge.
 * High-performance path: Updates CacheService in <5ms and appends row to TelemetryData permanently.
 */
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const contents = e.postData.contents;
    const data = JSON.parse(contents);

    const nowMs = Date.now();
    const timestampISO = data.tickTimestamp || data.timestamp || new Date(nowMs).toISOString();
    const localTimeStr = Utilities.formatDate(new Date(nowMs), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const seq = Number(data.seq || data.sequenceNumber || 0);
    const daqStatus = data.daqStatus || 'ONLINE';
    const rawSensors = Array.isArray(data.sensors) ? data.sensors : [];

    // Helper to format individual parameter column string with (ONLINE)/(OFFLINE) status bracket
    function formatParameterCell(typeKey, sensors, daqStatus) {
      const match = sensors.find(s => {
        const id = String(s.sensorId || s.id || '').toUpperCase();
        const t = String(s.type || '').toLowerCase();
        if (typeKey === 'force') return t === 'force' || id.startsWith('FORCE') || id.startsWith('FO');
        if (typeKey === 'stress') return t === 'stress' || id.startsWith('STRESS');
        if (typeKey === 'strain') return t === 'strain' || id.startsWith('STRAIN') || id.startsWith('HX');
        if (typeKey === 'displacement') return t === 'displacement' || id.startsWith('DISP');
        if (typeKey === 'temperature') return t === 'temperature' || id.startsWith('TEMP');
        if (typeKey === 'humidity') return t === 'humidity' || id.startsWith('HUM');
        return false;
      });

      if (!match) {
        return daqStatus === 'ONLINE' ? 'N/A (OFFLINE)' : '(OFFLINE)';
      }

      const sStatus = String(match.status || 'offline').toUpperCase();
      const isOnline = (sStatus === 'ONLINE' || sStatus === 'RAW' || sStatus === 'OK') && daqStatus === 'ONLINE';
      const val = (match.value !== null && match.value !== undefined && !isNaN(match.value)) ? Number(match.value) : null;

      if (isOnline && val !== null) {
        return `${val.toFixed(1)} (${sStatus})`;
      } else if (val !== null) {
        return `${val.toFixed(1)} (OFFLINE)`;
      } else {
        return `(OFFLINE)`;
      }
    }

    const forceCol = formatParameterCell('force', rawSensors, daqStatus);
    const stressCol = formatParameterCell('stress', rawSensors, daqStatus);
    const strainCol = formatParameterCell('strain', rawSensors, daqStatus);
    const dispCol = formatParameterCell('displacement', rawSensors, daqStatus);
    const tempCol = formatParameterCell('temperature', rawSensors, daqStatus);
    const humidityCol = formatParameterCell('humidity', rawSensors, daqStatus);

    // 1. Appends normalized telemetry parameters permanently to TelemetryData sheet
    let telemetrySheet = ss.getSheetByName(SHEET_TELEMETRY);
    if (!telemetrySheet) {
      initSheets();
      telemetrySheet = ss.getSheetByName(SHEET_TELEMETRY);
    }
    
    telemetrySheet.appendRow([
      timestampISO,
      localTimeStr,
      seq,
      daqStatus,
      forceCol,
      stressCol,
      strainCol,
      dispCol,
      tempCol,
      humidityCol,
      contents
    ]);

    // 2. Prepare fast normalized sensor payload
    const sensorsList = rawSensors.map(s => {
      const sId = String(s.sensorId || s.id || '').toUpperCase();
      const rawStatus = String(s.status || 'offline').toLowerCase();
      const isOnline = rawStatus === 'online' || rawStatus === 'raw' || rawStatus === 'ok';
      const val = s.value !== null && s.value !== undefined && !isNaN(s.value) ? Number(s.value) : null;
      const type = s.type || (sId.startsWith('FORCE') ? 'force' : sId.startsWith('DISP') ? 'displacement' : sId.startsWith('STRAIN') ? 'strain' : 'sensor');
      const unit = s.unit || (type === 'force' ? 'kN' : type === 'displacement' ? 'mm' : type === 'strain' ? 'µε' : '');
      const defaultThresh = type === 'force' ? 5000 : type === 'displacement' ? 150 : 1000;

      return {
        id: sId,
        name: s.name || `${sId} Sensor`,
        type: type,
        unit: unit,
        subsystem: s.subsystem || (type === 'force' ? 'Main Cable' : type === 'displacement' ? 'Expansion Joint' : 'Deck'),
        hardwareBus: s.hardwareBus || `Arduino Channel`,
        threshold: s.threshold || defaultThresh,
        status: isOnline ? (val !== null ? 'online' : 'disconnected') : rawStatus,
        currentValue: isOnline ? val : null,
        lastKnownValue: val,
        lastSeen: timestampISO,
        isActive: true
      };
    });

    // 3. Build fast data point for recent history
    const readingsMap = {};
    sensorsList.forEach(s => {
      readingsMap[s.id] = s.currentValue;
    });

    const dataPoint = {
      timestamp: timestampISO,
      timeLabel: Utilities.formatDate(new Date(nowMs), Session.getScriptTimeZone(), 'HH:mm:ss'),
      seq: seq,
      daqStatus: daqStatus,
      readingsMap: readingsMap
    };
    sensorsList.forEach(s => {
      dataPoint[s.id] = s.currentValue;
    });

    // Update in-cache recent history buffer
    const cache = CacheService.getScriptCache();
    let cachedStateRaw = cache.get(CACHE_KEY_LIVE_STATE);
    let recentEntries = [];
    let activeAlerts = [];

    if (cachedStateRaw) {
      try {
        const parsedState = JSON.parse(cachedStateRaw);
        if (Array.isArray(parsedState.recentEntries)) {
          recentEntries = parsedState.recentEntries;
        }
        if (Array.isArray(parsedState.alerts)) {
          activeAlerts = parsedState.alerts;
        }
      } catch (err) {}
    }

    recentEntries.push(dataPoint);
    if (recentEntries.length > 30) {
      recentEntries = recentEntries.slice(-30);
    }

    // 4. Calculate Same-Instant Group Statistics
    const calcStats = (type) => {
      const typeSensors = sensorsList.filter(s => s.type === type);
      const onlineVals = typeSensors
        .filter(s => s.status === 'online' && s.currentValue !== null)
        .map(s => s.currentValue);

      if (onlineVals.length === 0) {
        return { activeCount: 0, totalCount: typeSensors.length, avg: null, max: null, min: null, isInstantLive: false };
      }
      const sum = onlineVals.reduce((a, b) => a + b, 0);
      return {
        activeCount: onlineVals.length,
        totalCount: typeSensors.length,
        avg: sum / onlineVals.length,
        max: Math.max(...onlineVals),
        min: Math.min(...onlineVals),
        isInstantLive: true
      };
    };

    const groupedStats = {
      force: calcStats('force'),
      displacement: calcStats('displacement'),
      strain: calcStats('strain')
    };

    const inventoryCounts = {
      totalSensors: sensorsList.length,
      onlineSensors: sensorsList.filter(s => s.status === 'online').length,
      disconnectedSensors: sensorsList.filter(s => s.status === 'disconnected').length,
      staleSensors: sensorsList.filter(s => s.status === 'stale').length,
      invalidSensors: sensorsList.filter(s => s.status === 'invalid').length,
      offlineSensors: sensorsList.filter(s => s.status === 'offline').length
    };

    const liveState = {
      status: 'OK',
      isDaqOnline: true,
      lastPacketTime: timestampISO,
      lastSequenceNum: seq,
      lastPacketTimestampMs: nowMs,
      packetAgeMs: 0,
      inventoryCounts: inventoryCounts,
      sensors: sensorsList,
      groupedStats: groupedStats,
      recentEntries: recentEntries,
      alerts: activeAlerts
    };

    // Store in CacheService for 60s
    cache.put(CACHE_KEY_LIVE_STATE, JSON.stringify(liveState), 60);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'SUCCESS', message: 'Telemetry logged permanently', seq: seq }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ERROR', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles GET requests:
 * fast action=getDashboardData (reads CacheService <10ms)
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

  if (action === 'getDashboardData') {
    return handleGetDashboardData();
  } else if (action === 'getHistory') {
    return handleGetHistory(e.parameter);
  } else if (action === 'getSensorRegistry') {
    return handleGetSensorRegistry();
  }

  // Default: Serve Web App HTML
  const template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('Bridge AI — SHM Live SCADA Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Returns structured live dashboard payload. High speed CacheService read.
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
          currentValue: null,
          lastKnownValue: s.lastKnownValue !== undefined ? s.lastKnownValue : s.currentValue
        }));
      }

      return ContentService
        .createTextOutput(JSON.stringify(state))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Cache Miss -> Read directly from Google Sheet
    initSheets();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
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
        isActive: true
      });
    }

    // Read Telemetry
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
      const numCols = Math.min(11, telemetrySheet.getLastColumn() || 11);
      const dataValues = telemetrySheet.getRange(startRow, 1, numRows, numCols).getValues();

      const parseColNum = (cellStr) => {
        if (!cellStr) return null;
        const match = String(cellStr).match(/([0-9]+(?:\.[0-9]+)?)/);
        return match ? Number(match[1]) : null;
      };

      dataValues.forEach(row => {
        const timeISO = String(row[0]);
        const seq = Number(row[2]);
        const daqStat = String(row[3]);
        let sensorsParsed = [];

        const col4Str = String(row[4] || '').trim();
        if (col4Str.startsWith('[') || col4Str.startsWith('{')) {
          try {
            sensorsParsed = JSON.parse(col4Str);
          } catch (err) {}
        } else {
          const fVal = parseColNum(row[4]);
          const strVal = parseColNum(row[5]);
          const stVal = parseColNum(row[6]);
          const dVal = parseColNum(row[7]);
          const tVal = parseColNum(row[8]);
          const hVal = parseColNum(row[9]);

          if (fVal !== null) sensorsParsed.push({ sensorId: 'FORCE-01', type: 'force', value: fVal, status: 'online' });
          if (strVal !== null) sensorsParsed.push({ sensorId: 'STRESS-01', type: 'stress', value: strVal, status: 'online' });
          if (stVal !== null) sensorsParsed.push({ sensorId: 'STRAIN-01', type: 'strain', value: stVal, status: 'online' });
          if (dVal !== null) sensorsParsed.push({ sensorId: 'DISPLACEMENT-01', type: 'displacement', value: dVal, status: 'online' });
          if (tVal !== null) sensorsParsed.push({ sensorId: 'TEMP-01', type: 'temperature', value: tVal, status: 'online' });
          if (hVal !== null) sensorsParsed.push({ sensorId: 'HUMIDITY-01', type: 'humidity', value: hVal, status: 'online' });
        }

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
            dataPoint.readingsMap[sId] = s.value;
            dataPoint[sId] = s.value;
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

      // Populate sensor values from latest row of TelemetryData
      let latestSensorsParsed = [];
      const latestCol4 = String(latestRow[4] || '').trim();
      if (latestCol4.startsWith('[') || latestCol4.startsWith('{')) {
        try {
          latestSensorsParsed = JSON.parse(latestCol4);
        } catch (err) {}
      } else {
        const fVal = parseColNum(latestRow[4]);
        const strVal = parseColNum(latestRow[5]);
        const stVal = parseColNum(latestRow[6]);
        const dVal = parseColNum(latestRow[7]);
        const tVal = parseColNum(latestRow[8]);
        const hVal = parseColNum(latestRow[9]);
        if (fVal !== null) latestSensorsParsed.push({ sensorId: 'FORCE-01', value: fVal });
        if (strVal !== null) latestSensorsParsed.push({ sensorId: 'STRESS-01', value: strVal });
        if (stVal !== null) latestSensorsParsed.push({ sensorId: 'STRAIN-01', value: stVal });
        if (dVal !== null) latestSensorsParsed.push({ sensorId: 'DISPLACEMENT-01', value: dVal });
        if (tVal !== null) latestSensorsParsed.push({ sensorId: 'TEMP-01', value: tVal });
        if (hVal !== null) latestSensorsParsed.push({ sensorId: 'HUMIDITY-01', value: hVal });
      }

      if (Array.isArray(latestSensorsParsed)) {
        latestSensorsParsed.forEach(sParsed => {
          const sId = String(sParsed.sensorId || sParsed.id || '').toUpperCase();
          const target = sensors.find(s => s.id === sId);
          const val = sParsed.value !== null && sParsed.value !== undefined && !isNaN(sParsed.value) ? Number(sParsed.value) : null;
          if (target) {
            target.lastKnownValue = val;
            target.currentValue = isDaqOnline ? val : null;
            target.status = isDaqOnline ? (val !== null ? 'online' : 'disconnected') : 'offline';
            target.lastSeen = lastPacketTime;
          }
        });
      }
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
      if (typeSensors.length === 0) {
        return { activeCount: 0, totalCount: 0, avg: null, max: null, min: null, isInstantLive: false };
      }
      const validVals = typeSensors
        .map(s => isDaqOnline ? s.currentValue : s.lastKnownValue)
        .filter(v => v !== null && v !== undefined && !isNaN(v));

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
      alerts: []
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
 * Handles GET history request for Historical Analytics page.
 */
function handleGetHistory(params) {
  try {
    initSheets();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const telemetrySheet = ss.getSheetByName(SHEET_TELEMETRY);
    const lastRow = telemetrySheet.getLastRow();

    if (lastRow <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'OK', count: 0, entries: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const maxEntries = 500;
    const startRow = Math.max(2, lastRow - maxEntries + 1);
    const numRows = lastRow - startRow + 1;
    const numCols = Math.min(11, telemetrySheet.getLastColumn() || 11);
    const dataValues = telemetrySheet.getRange(startRow, 1, numRows, numCols).getValues();

    const parseColNum = (cellStr) => {
      if (!cellStr) return null;
      const match = String(cellStr).match(/([0-9]+(?:\.[0-9]+)?)/);
      return match ? Number(match[1]) : null;
    };

    const entries = dataValues.map(row => {
      const timeISO = String(row[0]);
      let sensorsParsed = [];

      const col4Str = String(row[4] || '').trim();
      if (col4Str.startsWith('[') || col4Str.startsWith('{')) {
        try {
          sensorsParsed = JSON.parse(col4Str);
        } catch (e) {}
      } else {
        const fVal = parseColNum(row[4]);
        const strVal = parseColNum(row[5]);
        const stVal = parseColNum(row[6]);
        const dVal = parseColNum(row[7]);
        const tVal = parseColNum(row[8]);
        const hVal = parseColNum(row[9]);

        if (fVal !== null) sensorsParsed.push({ sensorId: 'FORCE-01', value: fVal });
        if (strVal !== null) sensorsParsed.push({ sensorId: 'STRESS-01', value: strVal });
        if (stVal !== null) sensorsParsed.push({ sensorId: 'STRAIN-01', value: stVal });
        if (dVal !== null) sensorsParsed.push({ sensorId: 'DISPLACEMENT-01', value: dVal });
        if (tVal !== null) sensorsParsed.push({ sensorId: 'TEMP-01', value: tVal });
        if (hVal !== null) sensorsParsed.push({ sensorId: 'HUMIDITY-01', value: hVal });
      }

      const item = {
        timestamp: timeISO,
        timeLabel: timeISO ? Utilities.formatDate(new Date(timeISO), Session.getScriptTimeZone(), 'HH:mm:ss') : '',
        seq: Number(row[2]),
        daqStatus: String(row[3])
      };

      if (Array.isArray(sensorsParsed)) {
        sensorsParsed.forEach(s => {
          const id = String(s.sensorId || s.id || '').toUpperCase();
          item[id] = s.value;
        });
      }
      return item;
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'OK', count: entries.length, entries: entries }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ERROR', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Returns registered sensor inventory.
 */
function handleGetSensorRegistry() {
  initSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_REGISTRY);
  const values = sheet.getDataRange().getValues();
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
      lastSeen: values[i][9]
    });
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'OK', sensors: list })).setMimeType(ContentService.MimeType.JSON);
}
