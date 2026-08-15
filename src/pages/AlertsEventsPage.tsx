import React, { useState } from 'react';
import { useSHM } from '../context/SHMContext';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  ShieldAlert,
  Clock,
  Wrench,
  Activity,
  Check,
} from 'lucide-react';

export const AlertsEventsPage: React.FC = () => {
  const { alerts, acknowledgeAlert, resolveAlert, isDaqOnline, sensors } = useSHM();

  const [severityFilter, setSeverityFilter] = useState<string>('All Severities');
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses');

  const unacknowledgedCount = alerts.filter(a => a.status === 'Unacknowledged').length;
  const resolvedCount = alerts.filter(a => a.status === 'Resolved').length;

  const filteredAlerts = alerts.filter(alt => {
    const matchesSeverity =
      severityFilter === 'All Severities' ||
      (severityFilter === 'Critical Only' && alt.severity === 'CRITICAL') ||
      (severityFilter === 'Warning Only' && alt.severity === 'WARNING') ||
      (severityFilter === 'Watch Only' && alt.severity === 'WATCH') ||
      (severityFilter === 'Info / Routine' && alt.severity === 'INFO');

    const matchesStatus =
      statusFilter === 'All Statuses' ||
      alt.status === statusFilter;

    return matchesSeverity && matchesStatus;
  });

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Header */}
      <div className="shm-card animate-slideUp" style={{ padding: '1.5rem', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldAlert style={{ color: 'var(--coral-critical)', width: 26, height: 26 }} />
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Structural Anomaly Triage & Event Log
              </h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Real-Time Hardware Rule-Based Alerts & Automated Connectivity Incident Resolution.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge-red font-mono">
              ACTIVE UNACKNOWLEDGED: {unacknowledgedCount}
            </span>
            <span className="badge badge-green font-mono">
              AUTO-RESOLVED: {resolvedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Auto-Resolution Behavior Explanation Banner */}
      <div
        className="shm-card"
        style={{
          padding: '1rem 1.25rem',
          background: 'var(--inner-box-bg)',
          borderLeft: '4px solid var(--accent-cyan)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.825rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Activity style={{ color: 'var(--accent-cyan)', width: 20, height: 20 }} />
          <div>
            <strong style={{ color: 'var(--text-main)', display: 'block' }}>
              ⚡ AUTOMATED ALERT RESOLUTION & WIPEOUT SYSTEM (SECTION 19)
            </strong>
            <span style={{ color: 'var(--text-muted)' }}>
              Connectivity alerts for Arduino USB or offline sensors automatically resolve and wipe out from active triage as soon as valid live telemetry resumes.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`badge ${isDaqOnline ? 'badge-green' : 'badge-red'}`}>
            {isDaqOnline ? '🔌 DAQ ONLINE' : '🔌 DAQ OFFLINE'}
          </span>
          <span className="badge badge-cyan font-mono">
            NODES OPERATIONAL: {sensors.filter(s => s.status === 'online').length} / {sensors.length}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="shm-card" style={{ padding: '1rem', display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          <Filter style={{ width: 16, height: 16, color: 'var(--accent-cyan)' }} />
          ALERT FILTERS:
        </div>

        {/* Severity Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Severity:</span>
          <select
            className="shm-select"
            style={{ width: 'auto' }}
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
          >
            <option value="All Severities">All Severities</option>
            <option value="Critical Only">Critical Only</option>
            <option value="Warning Only">Warning Only</option>
            <option value="Watch Only">Watch Only</option>
            <option value="Info / Routine">Info / Routine</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Status:</span>
          <select
            className="shm-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Unacknowledged">Unacknowledged Only</option>
            <option value="Resolved">Resolved Only</option>
          </select>
        </div>
      </div>

      {/* Strict Data Policy Note */}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 0.5rem' }}>
        * <strong>Strict Anomaly Policy:</strong> Anomaly & connectivity events are generated automatically by the hardware watchdog. Alerts automatically clear when serial packet streams resume.
      </div>

      {/* Event Stream Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(event => (
            <div
              key={event.id}
              className="shm-card animate-slideUp"
              style={{
                padding: '1.25rem',
                borderLeft: `5px solid ${event.severity === 'CRITICAL' ? 'var(--coral-critical)' : event.severity === 'WARNING' ? 'var(--amber-warning)' : 'var(--accent-cyan)'}`,
                background: 'var(--card-bg)',
              }}
            >
              {/* Event Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span className={`badge ${event.severity === 'CRITICAL' ? 'badge-red' : event.severity === 'WARNING' ? 'badge-yellow' : 'badge-cyan'}`}>
                    <AlertTriangle style={{ width: 12, height: 12 }} />
                    {event.severity}
                  </span>

                  <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', background: 'var(--inner-box-bg)', padding: '0.2rem 0.5rem', borderRadius: 4, border: '1px solid var(--card-border)' }}>
                    {event.sensorId}
                  </span>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {event.title}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }} className="font-mono">
                    <Clock style={{ width: 14, height: 14 }} />
                    Triggered: {new Date(event.timestamp).toLocaleString()}
                  </div>

                  {event.status === 'Resolved' && (
                    <span className="badge badge-green font-mono" style={{ fontSize: '0.7rem' }}>
                      <Check style={{ width: 12, height: 12 }} /> RESOLVED {event.resolvedAt ? `at ${new Date(event.resolvedAt).toLocaleTimeString()}` : ''} {event.durationText ? `(${event.durationText})` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Event Body */}
              <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
                {event.description}
              </p>

              {/* Recommended Engineering Action */}
              <div
                style={{
                  background: 'var(--inner-box-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 6,
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  fontSize: '0.825rem',
                }}
              >
                <Wrench style={{ color: 'var(--accent-cyan)', width: 18, height: 18, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '0.15rem' }}>
                    RECOMMENDED ENGINEERING ACTION:
                  </strong>
                  <span style={{ color: 'var(--text-main)' }}>{event.recommendedAction}</span>
                </div>
              </div>

              {/* Metadata Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '0.75rem',
                  background: 'var(--inner-box-bg)',
                  padding: '0.75rem 1rem',
                  borderRadius: 6,
                  marginBottom: '1rem',
                  fontSize: '0.75rem',
                  border: '1px solid var(--card-border)',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>SENSOR ID</span>
                  <span className="font-mono" style={{ color: 'var(--text-main)', fontWeight: 700 }}>{event.sensorId}</span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>SUBSYSTEM</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{event.subsystem}</span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>SOURCE BUS</span>
                  <span className="font-mono" style={{ color: 'var(--text-main)' }}>{event.sourceBus}</span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>TRIGGER VALUE</span>
                  <span className="font-mono" style={{ color: 'var(--coral-critical)', fontWeight: 700 }}>
                    {event.triggerValue} {event.unit}
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>SAFETY THRESHOLD</span>
                  <span className="font-mono" style={{ color: 'var(--emerald-green)', fontWeight: 700 }}>
                    {event.safetyThreshold} {event.unit}
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                {event.status === 'Unacknowledged' ? (
                  <>
                    <button
                      onClick={() => acknowledgeAlert(event.id)}
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                    >
                      Acknowledge Event
                    </button>
                    <button
                      onClick={() => resolveAlert(event.id)}
                      className="btn-cyan"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                    >
                      <CheckCircle2 style={{ width: 14, height: 14 }} /> Mark Resolved
                    </button>
                  </>
                ) : (
                  <span className="badge badge-green">
                    <CheckCircle2 style={{ width: 12, height: 12 }} /> EVENT RESOLVED & AUTO-WIPED FROM ACTIVE TRIAGE
                  </span>
                )}
              </div>

            </div>
          ))
        ) : (
          <div className="shm-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--card-bg)' }}>
            <AlertTriangle style={{ width: 36, height: 36, margin: '0 auto 0.5rem auto', color: 'var(--text-muted)' }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>No active structural anomalies or hardware disconnection alerts recorded matching filter criteria.</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Arduino USB link & hardware pins are operating within baseline structural safety tolerances.
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
