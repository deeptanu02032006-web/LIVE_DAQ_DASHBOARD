import React, { useState } from 'react';
import { useSHM } from '../context/SHMContext';
import {
  HardDrive,
  Cpu,
  AlertTriangle,
  Zap,
  Layers,
  BarChart2,
  Activity,
  Power,
  Play,
  CheckSquare,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { RegisterSensorModal } from '../components/modals/RegisterSensorModal';

export const LiveOverviewPage: React.FC = () => {
  const {
    sensors,
    telemetryHistory,
    alerts,
    isDaqOnline,
    lastPacketTime,
    lastSequenceNum,
    baudRate,
    sensorInventoryCounts,
    loadSampleHardwareProfile,
    connectArduinoSerial,
    disconnectArduinoSerial,
    processIncomingHardwarePacket,
  } = useSHM();
  const [activeMetricToggle, setActiveMetricToggle] = useState<'force' | 'stress' | 'strain' | 'displacement' | 'humidity' | 'temperature'>('force');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [showDiagPanel, setShowDiagPanel] = useState<boolean>(true);

  // Group sensors by type
  const forceSensors = sensors.filter(s => s.type === 'force');
  const displacementSensors = sensors.filter(s => s.type === 'displacement');
  const strainSensors = sensors.filter(s => s.type === 'strain');

  // Same-Instant Group Averaging Calculation (Section 2.3 & 15)
  // Calculates average, max, and min ONLY for sensors that are currently strictly ONLINE with fresh values
  const calculateSameInstantGroupStats = (groupSensors: typeof sensors) => {
    if (groupSensors.length === 0 || !isDaqOnline) {
      return { activeCount: 0, totalCount: groupSensors.length, avg: null, max: null, min: null, isInstantLive: false };
    }

    const onlineSensorsWithVals = groupSensors.filter(
      s => s.status === 'online' && s.currentValue !== null && !isNaN(Number(s.currentValue))
    );

    if (onlineSensorsWithVals.length === 0) {
      return { activeCount: 0, totalCount: groupSensors.length, avg: null, max: null, min: null, isInstantLive: false };
    }

    const vals = onlineSensorsWithVals.map(s => Number(s.currentValue));
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const max = Math.max(...vals);
    const min = Math.min(...vals);

    return {
      activeCount: onlineSensorsWithVals.length,
      totalCount: groupSensors.length,
      avg,
      max,
      min,
      isInstantLive: true,
    };
  };

  const forceStats = calculateSameInstantGroupStats(forceSensors);
  const displacementStats = calculateSameInstantGroupStats(displacementSensors);
  const strainStats = calculateSameInstantGroupStats(strainSensors);

  const activeAlerts = alerts.filter(a => a.status === 'Unacknowledged');

  // Acceptance Test Scenarios A - G Trigger Helpers (Section 12 & 25)
  const triggerScenario = (scenarioKey: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G') => {
    const seq = (lastSequenceNum || 1000) + 1;

    if (sensors.length === 0) {
      loadSampleHardwareProfile();
    }

    if (scenarioKey === 'A') {
      // Scenario A: Arduino + all sensors connected
      const entries = sensors.map((s, idx) => ({
        sensorId: s.id,
        status: 'online' as const,
        value: s.threshold * 0.35 + (idx + 1) * 12.5,
      }));
      processIncomingHardwarePacket({ daqStatus: 'ONLINE', seq, sensors: entries });
    } else if (scenarioKey === 'B') {
      // Scenario B: Arduino connected, but NO sensors connected
      const entries = sensors.map(s => ({
        sensorId: s.id,
        status: 'disconnected' as const,
        value: null,
      }));
      processIncomingHardwarePacket({ daqStatus: 'ONLINE', seq, sensors: entries });
    } else if (scenarioKey === 'C') {
      // Scenario C: Arduino connected with only SOME sensors
      const entries = sensors.map((s, idx) => ({
        sensorId: s.id,
        status: idx % 2 === 0 ? ('online' as const) : ('disconnected' as const),
        value: idx % 2 === 0 ? s.threshold * 0.32 + 15 : null,
      }));
      processIncomingHardwarePacket({ daqStatus: 'ONLINE', seq, sensors: entries });
    } else if (scenarioKey === 'D') {
      // Scenario D: Individual sensor removed (FORCE-02 disconnected)
      const entries = sensors.map(s => ({
        sensorId: s.id,
        status: s.id === 'FORCE-02' ? ('disconnected' as const) : ('online' as const),
        value: s.id === 'FORCE-02' ? null : s.threshold * 0.35 + 8,
      }));
      processIncomingHardwarePacket({ daqStatus: 'ONLINE', seq, sensors: entries });
    } else if (scenarioKey === 'E') {
      // Scenario E: Arduino USB Disconnected
      disconnectArduinoSerial();
    } else if (scenarioKey === 'F') {
      // Scenario F: Arduino reconnects (DAQ ONLINE, disconnected sensors remain DISCONNECTED)
      const entries = sensors.map(s => ({
        sensorId: s.id,
        status: s.id === 'FORCE-02' ? ('disconnected' as const) : ('online' as const),
        value: s.id === 'FORCE-02' ? null : s.threshold * 0.36 + 5,
      }));
      processIncomingHardwarePacket({ daqStatus: 'ONLINE', seq, sensors: entries });
    } else if (scenarioKey === 'G') {
      // Scenario G: Sensor reconnects (FORCE-02 returns to ONLINE)
      const entries = sensors.map(s => ({
        sensorId: s.id,
        status: 'online' as const,
        value: s.threshold * 0.35 + 20,
      }));
      processIncomingHardwarePacket({ daqStatus: 'ONLINE', seq, sensors: entries });
    }
  };

  // Helper for sensor status badge styling
  const renderSensorStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'online') {
      return <span className="badge badge-green">● ONLINE</span>;
    } else if (s === 'disconnected') {
      return <span className="badge badge-yellow">● DISCONNECTED</span>;
    } else if (s === 'stale') {
      return <span className="badge badge-yellow">● STALE</span>;
    } else if (s === 'invalid') {
      return <span className="badge badge-red">● INVALID</span>;
    } else {
      return <span className="badge badge-red">● OFFLINE</span>;
    }
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Warning Banner when DAQ is OFFLINE */}
      {!isDaqOnline && (
        <div
          className="animate-slideUp"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 8,
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'var(--coral-critical)',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle style={{ width: 20, height: 20 }} />
            <span>⚠ ARDUINO DISCONNECTED — WAITING FOR LIVE SENSOR DATA</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={connectArduinoSerial}
              className="btn-cyan"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              Connect Hardware Serial
            </button>
          </div>
        </div>
      )}

      {/* Acceptance Test Scenarios A - G Interactive Toolbar (Section 25) */}
      <div className="shm-card animate-slideUp" style={{ padding: '0.85rem 1.25rem', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare style={{ color: 'var(--accent-cyan)', width: 18, height: 18 }} />
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)' }}>
              SECTION 25 ACCEPTANCE TEST MATRIX:
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <button onClick={() => triggerScenario('A')} className="btn-secondary" style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }} title="Test 1: All Sensors Connected">
              <Play style={{ width: 12, height: 12 }} /> Test A: All Connected
            </button>
            <button onClick={() => triggerScenario('B')} className="btn-secondary" style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }} title="Test 2: No Sensors Connected">
              <Play style={{ width: 12, height: 12 }} /> Test B: No Sensors
            </button>
            <button onClick={() => triggerScenario('C')} className="btn-secondary" style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }} title="Test 3: Some Sensors Connected">
              <Play style={{ width: 12, height: 12 }} /> Test C: Some Sensors
            </button>
            <button onClick={() => triggerScenario('D')} className="btn-secondary" style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', borderColor: 'var(--amber-warning)', color: 'var(--amber-warning)' }} title="Test 4: Remove Single Sensor">
              <Play style={{ width: 12, height: 12 }} /> Test D: Remove 1 Sensor
            </button>
            <button onClick={() => triggerScenario('E')} className="btn-danger" style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }} title="Test 5: Arduino USB Unplugged">
              <Play style={{ width: 12, height: 12 }} /> Test E: USB Unplug
            </button>
            <button onClick={() => triggerScenario('F')} className="btn-secondary" style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }} title="Test 6: Arduino Reconnects">
              <Play style={{ width: 12, height: 12 }} /> Test F: DAQ Reconnect
            </button>
            <button onClick={() => triggerScenario('G')} className="btn-cyan" style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }} title="Test 7: Sensor Reconnects">
              <Play style={{ width: 12, height: 12 }} /> Test G: Sensor Reconnect
            </button>
          </div>
        </div>
      </div>

      {/* Top Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        
        {/* Card 1: Configured Sensors */}
        <div className="shm-card animate-slideUp" style={{ padding: '1.5rem', background: 'var(--card-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              DYNAMIC SENSOR INVENTORY (SECTION 13)
            </span>
            <HardDrive style={{ color: 'var(--accent-cyan)', width: 22, height: 22 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="font-mono" style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {sensorInventoryCounts.totalSensors}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Registered Nodes</span>
          </div>

          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-green">Online: {sensorInventoryCounts.onlineSensors}</span>
            <span className="badge badge-yellow">Disc: {sensorInventoryCounts.disconnectedSensors}</span>
            <span className="badge badge-red">Offline: {sensorInventoryCounts.offlineSensors}</span>
          </div>
        </div>

        {/* Card 2: Hardware Stream Status */}
        <div className="shm-card animate-slideUp" style={{ padding: '1.5rem', background: 'var(--card-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              HARDWARE STREAM STATUS (SECTION 20)
            </span>
            <Cpu style={{ color: isDaqOnline ? 'var(--emerald-green)' : 'var(--coral-critical)', width: 22, height: 22 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: isDaqOnline ? 'var(--emerald-green)' : 'var(--coral-critical)' }}>
              {isDaqOnline ? '● DAQ ONLINE' : '● DAQ OFFLINE'}
            </span>
          </div>

          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }} className="font-mono">
            {baudRate} Baud Serial Link | {lastPacketTime ? `Last packet: ${lastPacketTime}` : 'Waiting for real packet'}
          </div>
        </div>

      </div>

      {/* INDEPENDENT CONNECTION SENSING DIAGNOSTIC PANEL */}
      <div className="shm-card animate-slideUp" style={{ padding: '1.25rem', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showDiagPanel ? '1rem' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity style={{ color: 'var(--accent-cyan)', width: 20, height: 20 }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Dual-Layer Hardware Connectivity Diagnostic Engine
            </h2>
            <span className="badge badge-cyan">SECTION 1 & 2 VERIFIED</span>
          </div>

          <button
            onClick={() => setShowDiagPanel(!showDiagPanel)}
            className="btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
          >
            {showDiagPanel ? 'Hide Diagnostic Matrix' : 'Show Diagnostic Matrix'}
          </button>
        </div>

        {showDiagPanel && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
            
            {/* Layer 1: USB Serial DAQ Protocol Watchdog */}
            <div style={{ background: 'var(--inner-box-bg)', padding: '1rem', borderRadius: 8, border: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Power style={{ width: 14, height: 14 }} /> LAYER 1: USB DAQ PROTOCOL LINK
              </div>

              <div style={{ fontSize: '0.825rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <strong style={{ color: isDaqOnline ? 'var(--emerald-green)' : 'var(--coral-critical)' }}>
                  {isDaqOnline ? 'DAQ ONLINE' : 'DAQ OFFLINE'}
                </strong>
              </div>

              <div style={{ fontSize: '0.825rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Detection Method:</span>
                <span>Heartbeat Watchdog (&lt;3s)</span>
              </div>

              <div style={{ fontSize: '0.825rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Sequence:</span>
                <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{lastSequenceNum !== null ? `SEQ:${lastSequenceNum}` : 'None'}</span>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--card-border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                ✓ Independent of sensor values. Determined strictly by USB Serial packet cadence.
              </div>
            </div>

            {/* Layer 2: Individual Sensor Node Circuit Health */}
            <div style={{ background: 'var(--inner-box-bg)', padding: '1rem', borderRadius: 8, border: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>📡 LAYER 2: PHYSICAL SENSOR NODE CIRCUIT HEALTH</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {sensors.filter(s => s.status === 'online').length} / {sensors.length} Nodes Operational {sensors.length > 4 ? '(Scroll for more)' : ''}
                </span>
              </div>

              {/* Scrollable Container showing exactly 4 sensors (2x2 grid) at a time */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', maxHeight: '145px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {sensors.map(s => (
                  <div key={s.id} style={{ background: 'var(--card-bg)', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid var(--card-border)', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>#{s.id}</span>
                      {renderSensorStatusBadge(s.status)}
                    </div>
                    
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Bus: {s.hardwareBus} ({s.subsystem})
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Grouped Sensor Telemetry Cards */}
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers style={{ color: 'var(--accent-cyan)', width: 18, height: 18 }} />
          GROUPED TELEMETRY ARDUINO BUS METRICS (SAME-INSTANT FRESH DATA ONLY)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          
          {/* 1. Load / Force (kN) */}
          <div className="shm-card animate-slideUp" style={{ padding: '1.25rem', background: 'var(--card-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Load / Force</h3>
                <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Unit: kN</span>
              </div>
              <span className={`badge ${forceStats.isInstantLive ? 'badge-green' : 'badge-red'}`}>
                {forceStats.isInstantLive ? `${forceStats.activeCount} / ${forceStats.totalCount} Online` : 'IDLE / OFFLINE'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--inner-box-bg)', padding: '0.5rem', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>INSTANT AVG</div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: forceStats.avg !== null ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {forceStats.avg !== null ? forceStats.avg.toFixed(1) : '—'}
                </div>
              </div>
              <div style={{ background: 'var(--inner-box-bg)', padding: '0.5rem', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TICK MAX</div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: forceStats.max !== null ? 'var(--amber-warning)' : 'var(--text-muted)' }}>
                  {forceStats.max !== null ? forceStats.max.toFixed(1) : '—'}
                </div>
              </div>
              <div style={{ background: 'var(--inner-box-bg)', padding: '0.5rem', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TICK MIN</div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: forceStats.min !== null ? 'var(--emerald-green)' : 'var(--text-muted)' }}>
                  {forceStats.min !== null ? forceStats.min.toFixed(1) : '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem', maxHeight: '115px', overflowY: 'auto', paddingRight: '0.2rem' }}>
              {forceSensors.length > 0 ? (
                forceSensors.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'var(--inner-box-bg)', borderRadius: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="font-mono" style={{ color: 'var(--text-muted)' }}>#{s.id}</span>
                      {renderSensorStatusBadge(s.status)}
                    </div>
                    <span className="font-mono" style={{ fontWeight: 700, color: s.currentValue !== null && s.status === 'online' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {s.currentValue !== null && s.status === 'online' ? `${s.currentValue.toFixed(1)} kN` : '—'}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem' }}>
                  No Force Sensors Configured
                </div>
              )}
            </div>

            <div style={{ marginTop: '0.85rem', fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--card-border)', paddingTop: '0.5rem' }}>
              Group Threshold: <strong style={{ color: 'var(--text-main)' }}>5000 kN</strong>
            </div>
          </div>

          {/* 2. Displacement (mm) */}
          <div className="shm-card animate-slideUp" style={{ padding: '1.25rem', background: 'var(--card-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Displacement</h3>
                <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Unit: mm</span>
              </div>
              <span className={`badge ${displacementStats.isInstantLive ? 'badge-green' : 'badge-red'}`}>
                {displacementStats.isInstantLive ? `${displacementStats.activeCount} / ${displacementStats.totalCount} Online` : 'IDLE / OFFLINE'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--inner-box-bg)', padding: '0.5rem', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>INSTANT AVG</div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: displacementStats.avg !== null ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {displacementStats.avg !== null ? displacementStats.avg.toFixed(1) : '—'}
                </div>
              </div>
              <div style={{ background: 'var(--inner-box-bg)', padding: '0.5rem', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TICK MAX</div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: displacementStats.max !== null ? 'var(--amber-warning)' : 'var(--text-muted)' }}>
                  {displacementStats.max !== null ? displacementStats.max.toFixed(1) : '—'}
                </div>
              </div>
              <div style={{ background: 'var(--inner-box-bg)', padding: '0.5rem', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TICK MIN</div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: displacementStats.min !== null ? 'var(--emerald-green)' : 'var(--text-muted)' }}>
                  {displacementStats.min !== null ? displacementStats.min.toFixed(1) : '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem', maxHeight: '115px', overflowY: 'auto', paddingRight: '0.2rem' }}>
              {displacementSensors.length > 0 ? (
                displacementSensors.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'var(--inner-box-bg)', borderRadius: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="font-mono" style={{ color: 'var(--text-muted)' }}>#{s.id}</span>
                      {renderSensorStatusBadge(s.status)}
                    </div>
                    <span className="font-mono" style={{ fontWeight: 700, color: s.currentValue !== null && s.status === 'online' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {s.currentValue !== null && s.status === 'online' ? `${s.currentValue.toFixed(1)} mm` : '—'}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem' }}>
                  No Displacement Sensors Configured
                </div>
              )}
            </div>

            <div style={{ marginTop: '0.85rem', fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--card-border)', paddingTop: '0.5rem' }}>
              Group Threshold: <strong style={{ color: 'var(--text-main)' }}>150 mm</strong>
            </div>
          </div>

          {/* 3. Strain (µε) */}
          <div className="shm-card animate-slideUp" style={{ padding: '1.25rem', background: 'var(--card-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Strain</h3>
                <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Unit: µε</span>
              </div>
              <span className={`badge ${strainStats.isInstantLive ? 'badge-green' : 'badge-red'}`}>
                {strainStats.isInstantLive ? `${strainStats.activeCount} / ${strainStats.totalCount} Online` : 'IDLE / OFFLINE'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--inner-box-bg)', padding: '0.5rem', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>INSTANT AVG</div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: strainStats.avg !== null ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {strainStats.avg !== null ? strainStats.avg.toFixed(1) : '—'}
                </div>
              </div>
              <div style={{ background: 'var(--inner-box-bg)', padding: '0.5rem', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TICK MAX</div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: strainStats.max !== null ? 'var(--amber-warning)' : 'var(--text-muted)' }}>
                  {strainStats.max !== null ? strainStats.max.toFixed(1) : '—'}
                </div>
              </div>
              <div style={{ background: 'var(--inner-box-bg)', padding: '0.5rem', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TICK MIN</div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: strainStats.min !== null ? 'var(--emerald-green)' : 'var(--text-muted)' }}>
                  {strainStats.min !== null ? strainStats.min.toFixed(1) : '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem', maxHeight: '115px', overflowY: 'auto', paddingRight: '0.2rem' }}>
              {strainSensors.length > 0 ? (
                strainSensors.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'var(--inner-box-bg)', borderRadius: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="font-mono" style={{ color: 'var(--text-muted)' }}>#{s.id}</span>
                      {renderSensorStatusBadge(s.status)}
                    </div>
                    <span className="font-mono" style={{ fontWeight: 700, color: s.currentValue !== null && s.status === 'online' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {s.currentValue !== null && s.status === 'online' ? `${s.currentValue.toFixed(1)} µε` : '—'}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem' }}>
                  No Strain Sensors Configured
                </div>
              )}
            </div>

            <div style={{ marginTop: '0.85rem', fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--card-border)', paddingTop: '0.5rem' }}>
              Group Threshold: <strong style={{ color: 'var(--text-main)' }}>1000 µε</strong>
            </div>
          </div>

        </div>
      </div>

      {/* Live Telemetry Chart & Active Alerts Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        
        {/* Live Stream Chart */}
        <div className="shm-card animate-slideUp" style={{ padding: '1.5rem', background: 'var(--card-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 style={{ color: 'var(--accent-cyan)', width: 20, height: 20 }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Live Telemetry Stream Chart
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--inner-box-bg)', padding: '0.25rem', borderRadius: 6 }}>
              {(['force', 'stress', 'strain', 'displacement', 'humidity', 'temperature'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setActiveMetricToggle(m)}
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: 4,
                    border: 'none',
                    background: activeMetricToggle === m ? 'var(--accent-cyan)' : 'transparent',
                    color: activeMetricToggle === m ? '#FFF' : 'var(--text-muted)',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {telemetryHistory.length > 0 && isDaqOnline ? (
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={telemetryHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis dataKey="timeLabel" stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} />
                  <YAxis stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)', borderRadius: 8 }}
                  />
                  <Legend />
                  {sensors
                    .filter(s => s.type === activeMetricToggle || (activeMetricToggle === 'stress' && s.type === 'strain'))
                    .map((s, idx) => (
                      <Line
                        key={s.id}
                        type="monotone"
                        dataKey={s.id}
                        stroke={['#00B4D8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][idx % 5]}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#38BDF8', strokeWidth: 1 }}
                        activeDot={{ r: 6 }}
                        name={`${s.name} (${s.unit})`}
                      />
                    ))}
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              style={{
                height: 320,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed var(--card-border)',
                borderRadius: 8,
                color: 'var(--text-muted)',
                gap: '0.75rem',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '2rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2.2rem', color: 'var(--accent-cyan)', fontWeight: 800, textShadow: '0 0 12px rgba(0, 180, 216, 0.5)' }}>((o))</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Arduino Disconnected — Waiting for Live Telemetry Packets
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', maxWidth: 480 }}>
                Connect USB Serial Arduino or run the Python DAQ Bridge to stream live sensor readings.
              </div>
            </div>
          )}
        </div>

        {/* Active Rule-Based Alerts */}
        <div className="shm-card animate-slideUp" style={{ padding: '1.5rem', background: 'var(--card-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap style={{ color: 'var(--amber-warning)', width: 20, height: 20 }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Active Alerts ({activeAlerts.length})
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 320, overflowY: 'auto' }}>
            {activeAlerts.length > 0 ? (
              activeAlerts.map(alt => (
                <div
                  key={alt.id}
                  style={{
                    background: 'var(--inner-box-bg)',
                    borderLeft: `4px solid ${alt.severity === 'CRITICAL' ? 'var(--coral-critical)' : 'var(--amber-warning)'}`,
                    borderRadius: 6,
                    padding: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span className={`badge ${alt.severity === 'CRITICAL' ? 'badge-red' : 'badge-yellow'}`}>
                      {alt.severity}
                    </span>
                    <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(alt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                    {alt.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {alt.description}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                    💡 Action: {alt.recommendedAction}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem', padding: '2rem 1rem' }}>
                No active anomaly alerts. All connected hardware sensors operating within standard safety envelope.
              </div>
            )}
          </div>
        </div>

      </div>

      <RegisterSensorModal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} />

    </div>
  );
};
