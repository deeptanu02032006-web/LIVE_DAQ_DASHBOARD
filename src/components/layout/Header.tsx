import React, { useState, useEffect } from 'react';
import { useSHM } from '../../context/SHMContext';
import { useAuth } from '../../context/AuthContext';
import { Cpu, Wifi, WifiOff, LogOut, ShieldCheck, UserCheck, Bell, Sun, Moon, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { settings, alerts, isDaqOnline, lastPacketTime, lastSequenceNum, baudRate, sensorInventoryCounts, connectArduinoSerial, disconnectArduinoSerial, clearAllTelemetry, toggleTheme } = useSHM();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const unreadAlertsCount = alerts.filter(a => a.status === 'Unacknowledged').length;
  const isLight = settings.themeMode === 'Light Theme';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    setCurrentTime(new Date().toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    return () => clearInterval(timer);
  }, []);

  const handleResetData = () => {
    clearAllTelemetry();
    setShowResetConfirm(false);
  };

  return (
    <header className="shm-card" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '0.85rem 1.5rem', background: 'var(--header-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Left: Bridge Title & Hardware DAQ Connection Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu style={{ color: 'var(--accent-cyan)', width: 22, height: 22 }} />
              <h1 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-main)' }}>
                {settings.bridgeName} <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 400 }}>({settings.bridgeCode})</span>
              </h1>
            </div>
            
            {/* Dual Layer Connectivity Status (Section 20 & 22) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.75rem' }}>
              {/* Layer 1: USB Serial DAQ Controller */}
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: isDaqOnline ? 'var(--emerald-green)' : 'var(--coral-critical)' }}>
                <span className={`pulse-dot ${isDaqOnline ? 'pulse-dot-green' : 'pulse-dot-red'}`} />
                🔌 DAQ: {isDaqOnline ? 'ONLINE' : 'OFFLINE'}
              </span>

              {lastPacketTime && (
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                  (Last packet: {lastPacketTime})
                </span>
              )}

              {lastSequenceNum !== null && (
                <span className="badge badge-cyan font-mono" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                  SEQ:{lastSequenceNum}
                </span>
              )}

              <span style={{ color: 'var(--card-border)' }}>|</span>

              {/* Layer 2: Real-time Dynamic Sensor Inventory (Section 13) */}
              <span className="badge font-mono" style={{ backgroundColor: isDaqOnline ? (sensorInventoryCounts.disconnectedSensors > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)') : 'rgba(239,68,68,0.15)', color: isDaqOnline ? (sensorInventoryCounts.disconnectedSensors > 0 ? 'var(--amber-warning)' : 'var(--emerald-green)') : 'var(--coral-critical)' }}>
                📡 NODES (Total:{sensorInventoryCounts.totalSensors} | Online:{sensorInventoryCounts.onlineSensors} | Disc:{sensorInventoryCounts.disconnectedSensors})
              </span>

              <span style={{ color: 'var(--card-border)' }}>|</span>

              <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                LOCAL: {currentTime}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Theme Toggle, Notifications Bell, Hardware Connect, Reset & User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'var(--inner-box-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 8,
              padding: '0.5rem',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            title={`Switch to ${isLight ? 'Dark Theme' : 'Light Theme'}`}
          >
            {isLight ? (
              <Moon style={{ width: 18, height: 18, color: '#38BDF8' }} />
            ) : (
              <Sun style={{ width: 18, height: 18, color: '#F59E0B' }} />
            )}
          </button>

          {/* Notifications Bell with unread count */}
          <button
            onClick={() => navigate('/alerts')}
            style={{
              position: 'relative',
              background: 'var(--inner-box-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 8,
              padding: '0.5rem',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="View Unacknowledged Structural Alerts"
          >
            <Bell style={{ width: 18, height: 18, color: unreadAlertsCount > 0 ? 'var(--amber-warning)' : 'var(--text-muted)' }} />
            {unreadAlertsCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: 'var(--coral-critical)',
                  color: '#FFF',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Reset Telemetry Data Button */}
          <button
            onClick={() => setShowResetConfirm(!showResetConfirm)}
            className="btn-secondary"
            title="Clear live view & reset all telemetry history"
            style={{ fontSize: '0.78rem', padding: '0.5rem 0.8rem', borderColor: 'rgba(245,158,11,0.4)', color: 'var(--amber-warning)' }}
          >
            <RotateCcw style={{ width: 15, height: 15, color: 'var(--amber-warning)' }} />
            Reset View
          </button>

          {/* Hardware Connect / Disconnect */}
          {isDaqOnline ? (
            <button onClick={disconnectArduinoSerial} className="btn-secondary" style={{ borderColor: 'rgba(239,68,68,0.4)', color: 'var(--coral-critical)' }}>
              <WifiOff style={{ width: 16, height: 16 }} />
              Disconnect Arduino
            </button>
          ) : (
            <button onClick={connectArduinoSerial} className="btn-cyan">
              <Wifi style={{ width: 16, height: 16 }} />
              Connect USB Arduino ({baudRate} Baud)
            </button>
          )}

          {/* User Persona & Role Badge */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.35rem 0.75rem', background: 'var(--inner-box-bg)', borderRadius: 8, border: '1px solid var(--card-border)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)' }}>{user.fullName}</span>
                  <span className={`badge ${user.role === 'admin' ? 'badge-cyan' : 'badge-yellow'}`}>
                    {user.role === 'admin' ? <ShieldCheck style={{ width: 12, height: 12 }} /> : <UserCheck style={{ width: 12, height: 12 }} />}
                    {user.role.toUpperCase()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  signOut();
                  navigate('/signin');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--coral-critical)', cursor: 'pointer', padding: '0.2rem' }}
                title="Sign Out"
              >
                <LogOut style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ) : (
            <button onClick={() => navigate('/signin')} className="btn-cyan">
              Sign In
            </button>
          )}
        </div>

      </div>

      {/* Confirmation Banner for Telemetry Data Reset */}
      {showResetConfirm && (
        <div
          className="animate-slideUp"
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '0.6rem 1rem',
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--coral-critical)', fontWeight: 600 }}>
            ⚠️ Reset all live telemetry history, clear alerts, and restore a clean view point?
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleResetData}
              className="btn-danger"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
            >
              Confirm Reset
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
