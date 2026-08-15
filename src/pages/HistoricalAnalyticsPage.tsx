import React, { useState } from 'react';
import { useSHM } from '../context/SHMContext';
import { Download, Printer, Calendar, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const HistoricalAnalyticsPage: React.FC = () => {
  const { sensors, telemetryHistory } = useSHM();

  // Controls
  const [timeRange, setTimeRange] = useState<'24H' | '7D' | '30D' | '1Y' | 'Custom'>('24H');
  const [customStart, setCustomStart] = useState<string>('2026-08-01T00:00');
  const [customEnd, setCustomEnd] = useState<string>('2026-08-09T23:59');
  const [selectedSensorId, setSelectedSensorId] = useState<string>('ALL');
  const [primaryMetric, setPrimaryMetric] = useState<string>('Strain (µε)');
  const [secondaryMetric, setSecondaryMetric] = useState<string>('Single Metric View');

  // Helper to map metric string to sensor type
  const getMetricType = (metricStr: string): string => {
    if (metricStr.includes('Strain')) return 'strain';
    if (metricStr.includes('Force')) return 'force';
    if (metricStr.includes('Displacement')) return 'displacement';
    if (metricStr.includes('Stress')) return 'stress';
    if (metricStr.includes('Temperature')) return 'temperature';
    if (metricStr.includes('Humidity')) return 'humidity';
    return 'all';
  };

  const primaryType = getMetricType(primaryMetric);
  const secondaryType = secondaryMetric !== 'Single Metric View' ? getMetricType(secondaryMetric) : null;

  // Filter sensors based on selected metric and sensor scope
  const primarySensors = sensors.filter(s => {
    const matchesSensor = selectedSensorId === 'ALL' || s.id === selectedSensorId;
    const matchesMetric = primaryType === 'all' || s.type === primaryType || (primaryType === 'stress' && s.type === 'strain');
    return matchesSensor && matchesMetric;
  });

  const secondarySensors = secondaryType ? sensors.filter(s => {
    const matchesSensor = selectedSensorId === 'ALL' || s.id === selectedSensorId;
    const matchesMetric = s.type === secondaryType || (secondaryType === 'stress' && s.type === 'strain');
    return matchesSensor && matchesMetric;
  }) : [];

  // Export CSV Helper
  const handleExportCSV = () => {
    if (telemetryHistory.length === 0) {
      alert('No historical telemetry data available to export.');
      return;
    }
    const headers = ['Timestamp', 'TimeLabel', ...sensors.map(s => `${s.id} (${s.unit})`)].join(',');
    const rows = telemetryHistory.map(dp => {
      const vals = sensors.map(s => dp[s.id] ?? '');
      return [`"${dp.timestamp}"`, `"${dp.timeLabel}"`, ...vals].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bridge_SHM_Historical_${timeRange}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Chart Helper
  const handlePrintChart = () => {
    window.print();
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Header & Customization Controls */}
      <div className="shm-card animate-slideUp" style={{ padding: '1.25rem', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Historical Telemetry & Dual-Axis Overlay
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              Multi-parametric time-series overlay chart engine with left and right Y-axis dual metric plotting.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button onClick={handleExportCSV} className="btn-cyan">
              <Download style={{ width: 16, height: 16 }} /> Export CSV
            </button>
            <button onClick={handlePrintChart} className="btn-secondary">
              <Printer style={{ width: 16, height: 16 }} /> Print / Export Chart
            </button>
          </div>
        </div>

        {/* Controls Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
          
          {/* 1. Time Range Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              TIME RANGE SELECTOR
            </label>
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--inner-box-bg)', padding: '0.25rem', borderRadius: 6 }}>
              {(['24H', '7D', '30D', '1Y', 'Custom'] as const).map(tr => (
                <button
                  key={tr}
                  onClick={() => setTimeRange(tr)}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.2rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: 4,
                    border: 'none',
                    background: timeRange === tr ? 'var(--accent-cyan)' : 'transparent',
                    color: timeRange === tr ? '#FFF' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {tr}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Sensor Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              SENSOR NODE SELECTION
            </label>
            <select
              className="shm-select"
              value={selectedSensorId}
              onChange={e => setSelectedSensorId(e.target.value)}
            >
              <option value="ALL">ALL Bridge Sensors (Combined Stream)</option>
              {sensors.map(s => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.name} ({s.subsystem})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Primary Metric Axis */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              PRIMARY METRIC AXIS (LEFT Y-AXIS)
            </label>
            <select
              className="shm-select"
              value={primaryMetric}
              onChange={e => {
                const val = e.target.value;
                setPrimaryMetric(val);
                if (val === secondaryMetric) {
                  setSecondaryMetric('Single Metric View');
                }
              }}
            >
              <option value="Strain (µε)">Strain (µε)</option>
              <option value="Force (kN)">Force (kN)</option>
              <option value="Displacement (mm)">Displacement (mm)</option>
              <option value="Stress (MPa)">Stress (MPa)</option>
              <option value="Humidity (%)">Humidity (%)</option>
            </select>
          </div>

          {/* 4. Secondary Metric Overlay */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              SECONDARY METRIC OVERLAY (RIGHT Y-AXIS)
            </label>
            <select
              className="shm-select"
              value={secondaryMetric}
              onChange={e => {
                const val = e.target.value;
                if (val === primaryMetric) {
                  setSecondaryMetric('Single Metric View');
                } else {
                  setSecondaryMetric(val);
                }
              }}
            >
              <option value="Single Metric View">Single Metric View (No overlay)</option>
              <option value="Strain (µε)">Strain (µε)</option>
              <option value="Stress (MPa)">Stress (MPa)</option>
              <option value="Force (kN)">Force (kN)</option>
              <option value="Displacement (mm)">Displacement (mm)</option>
              <option value="Ambient Temperature (°C)">Ambient Temperature (°C)</option>
              <option value="Humidity (%)">Humidity (%)</option>
            </select>
          </div>

        </div>

        {/* Custom DateTime Picker when Custom is selected */}
        {timeRange === 'Custom' && (
          <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--card-border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Calendar style={{ color: 'var(--accent-cyan)', width: 18, height: 18 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Start Date & Time:</span>
            <input
              type="datetime-local"
              className="shm-input font-mono"
              style={{ width: 'auto' }}
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>End Date & Time:</span>
            <input
              type="datetime-local"
              className="shm-input font-mono"
              style={{ width: 'auto' }}
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Main Time-Series Visualizer */}
      <div className="shm-card animate-slideUp" style={{ padding: '1.75rem', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Time-Series Dual Axis Overlay ({timeRange})
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Left Y-Axis: <strong style={{ color: 'var(--accent-cyan)' }}>{primaryMetric}</strong>
              {secondaryMetric !== 'Single Metric View' && (
                <> | Right Y-Axis: <strong style={{ color: 'var(--amber-warning)' }}>{secondaryMetric}</strong></>
              )}
            </p>
          </div>
        </div>

        {telemetryHistory.length > 0 ? (
          <div style={{ width: '100%', height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetryHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="timeLabel" stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} />
                
                {/* Left Y-Axis for Primary Metric */}
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="var(--accent-cyan)"
                  style={{ fontSize: '0.75rem' }}
                  label={{ value: primaryMetric, angle: -90, position: 'insideLeft', fill: 'var(--accent-cyan)', style: { fontSize: '0.75rem' } }}
                />

                {/* Right Y-Axis for Secondary Metric (when enabled) */}
                {secondaryMetric !== 'Single Metric View' && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="var(--amber-warning)"
                    style={{ fontSize: '0.75rem' }}
                    label={{ value: secondaryMetric, angle: 90, position: 'insideRight', fill: 'var(--amber-warning)', style: { fontSize: '0.75rem' } }}
                  />
                )}

                <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }} />
                <Legend />

                {/* Primary Metric Lines on Left Y-Axis */}
                {(primarySensors.length > 0 ? primarySensors : sensors).map((s, idx) => (
                  <Line
                    key={`pri_${s.id}`}
                    yAxisId="left"
                    type="monotone"
                    dataKey={s.id}
                    stroke={['#00B4D8', '#10B981', '#38BDF8', '#8B5CF6'][idx % 4]}
                    strokeWidth={2.5}
                    dot={false}
                    name={`${s.name} (${s.unit}) — [Left Axis]`}
                  />
                ))}

                {/* Secondary Metric Lines on Right Y-Axis */}
                {secondaryMetric !== 'Single Metric View' && secondarySensors.map((s, idx) => (
                  <Line
                    key={`sec_${s.id}`}
                    yAxisId="right"
                    type="monotone"
                    dataKey={s.id}
                    stroke={['#F59E0B', '#EF4444', '#EC4899', '#F97316'][idx % 4]}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name={`${s.name} (${s.unit}) — [Right Axis]`}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--card-border)', borderRadius: 8 }}>
            <Activity style={{ width: 40, height: 40, margin: '0 auto 0.75rem auto', color: 'var(--text-muted)' }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No historical stream buffer logged for the selected time window.</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Connect Arduino telemetry hardware or run the data bridge to view live time series data.
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
