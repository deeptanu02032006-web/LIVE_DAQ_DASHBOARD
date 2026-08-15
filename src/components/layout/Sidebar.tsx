import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSHM } from '../../context/SHMContext';
import {
  Activity,
  LineChart,
  HardDrive,
  AlertTriangle,
  Settings,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { alerts } = useSHM();
  const isAdmin = user?.role === 'admin';

  const unacknowledgedCount = alerts.filter(a => a.status === 'Unacknowledged').length;

  return (
    <aside
      style={{
        width: '260px',
        minWidth: '260px',
        backgroundColor: 'var(--sidebar-bg, #0B1220)',
        borderRight: '1px solid var(--card-border, #1E2D4A)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.25rem 0.85rem',
        userSelect: 'none',
      }}
    >
      <div>
        {/* Brand / Logo Header Area (Image 2 Target) */}
        <div style={{ padding: '0.25rem 0.5rem 1.25rem 0.5rem', borderBottom: '1px solid var(--card-border, #1E2D4A)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                backgroundColor: '#0C1E38',
                border: '1px solid rgba(0, 180, 216, 0.4)',
                boxShadow: '0 0 12px rgba(0, 180, 216, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Activity style={{ color: '#00B4D8', width: 22, height: 22 }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Bridge<span style={{ color: '#00B4D8' }}>AI</span> SHM
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.08em', marginTop: 2 }}>
                TELEMETRY V2.4
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu Links (Image 2 Target) */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.68rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: isActive ? 700 : 500,
              textDecoration: 'none',
              color: isActive ? '#00B4D8' : '#94A3B8',
              backgroundColor: isActive ? 'rgba(0, 180, 216, 0.14)' : 'transparent',
              border: isActive ? '1px solid #00B4D8' : '1px solid transparent',
              transition: 'all 0.15s ease',
              boxShadow: isActive ? '0 0 12px rgba(0, 180, 216, 0.15)' : 'none',
            })}
          >
            {({ isActive }) => (
              <>
                <Activity style={{ width: 18, height: 18, color: isActive ? '#00B4D8' : '#94A3B8', flexShrink: 0 }} />
                <span>Live Overview</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/analytics"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.68rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: isActive ? 700 : 500,
              textDecoration: 'none',
              color: isActive ? '#00B4D8' : '#94A3B8',
              backgroundColor: isActive ? 'rgba(0, 180, 216, 0.14)' : 'transparent',
              border: isActive ? '1px solid #00B4D8' : '1px solid transparent',
              transition: 'all 0.15s ease',
              boxShadow: isActive ? '0 0 12px rgba(0, 180, 216, 0.15)' : 'none',
            })}
          >
            {({ isActive }) => (
              <>
                <LineChart style={{ width: 18, height: 18, color: isActive ? '#00B4D8' : '#94A3B8', flexShrink: 0 }} />
                <span>Historical Analytics</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/sensors"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.68rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: isActive ? 700 : 500,
              textDecoration: 'none',
              color: isActive ? '#00B4D8' : '#94A3B8',
              backgroundColor: isActive ? 'rgba(0, 180, 216, 0.14)' : 'transparent',
              border: isActive ? '1px solid #00B4D8' : '1px solid transparent',
              transition: 'all 0.15s ease',
              boxShadow: isActive ? '0 0 12px rgba(0, 180, 216, 0.15)' : 'none',
            })}
          >
            {({ isActive }) => (
              <>
                <HardDrive style={{ width: 18, height: 18, color: isActive ? '#00B4D8' : '#94A3B8', flexShrink: 0 }} />
                <span>Sensors Directory</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/alerts"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.68rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: isActive ? 700 : 500,
              textDecoration: 'none',
              color: isActive ? '#00B4D8' : '#94A3B8',
              backgroundColor: isActive ? 'rgba(0, 180, 216, 0.14)' : 'transparent',
              border: isActive ? '1px solid #00B4D8' : '1px solid transparent',
              transition: 'all 0.15s ease',
              boxShadow: isActive ? '0 0 12px rgba(0, 180, 216, 0.15)' : 'none',
            })}
          >
            {({ isActive }) => (
              <>
                <AlertTriangle style={{ width: 18, height: 18, color: isActive ? '#00B4D8' : '#94A3B8', flexShrink: 0 }} />
                <span>Alerts & Events</span>
                {unacknowledgedCount > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#EF4444',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.55rem',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {unacknowledgedCount}
                  </span>
                )}
              </>
            )}
          </NavLink>

          {/* System Admin — STRICTLY ADMIN ONLY */}
          {isAdmin && (
            <NavLink
              to="/settings"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.68rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 700 : 500,
                textDecoration: 'none',
                color: isActive ? '#00B4D8' : '#94A3B8',
                backgroundColor: isActive ? 'rgba(0, 180, 216, 0.14)' : 'transparent',
                border: isActive ? '1px solid #00B4D8' : '1px solid transparent',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 0 12px rgba(0, 180, 216, 0.15)' : 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  <Settings style={{ width: 18, height: 18, color: isActive ? '#00B4D8' : '#94A3B8', flexShrink: 0 }} />
                  <span>System Admin</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      backgroundColor: 'rgba(0, 180, 216, 0.15)',
                      color: '#00B4D8',
                      border: '1px solid rgba(0, 180, 216, 0.4)',
                      borderRadius: '9999px',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.45rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    ADMIN
                  </span>
                </>
              )}
            </NavLink>
          )}

          {/* Sign In / Persona — Bottom Utility Navigation */}
          {!user && (
            <NavLink
              to="/signin"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.68rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 700 : 500,
                textDecoration: 'none',
                color: isActive ? '#00B4D8' : '#94A3B8',
                backgroundColor: isActive ? 'rgba(0, 180, 216, 0.14)' : 'transparent',
                border: isActive ? '1px solid #00B4D8' : '1px solid transparent',
                transition: 'all 0.15s ease',
                marginTop: '0.75rem',
                borderTop: '1px solid var(--card-border, #1E2D4A)',
                paddingTop: '0.85rem',
              })}
            >
              {({ isActive }) => (
                <>
                  <Lock style={{ width: 18, height: 18, color: isActive ? '#00B4D8' : '#94A3B8', flexShrink: 0 }} />
                  <span>Sign In / Persona</span>
                </>
              )}
            </NavLink>
          )}
        </nav>
      </div>

      {/* Persistent Footer Widget */}
      <div style={{ background: 'var(--inner-box-bg, #0F172A)', padding: '0.75rem 0.85rem', borderRadius: 8, border: '1px solid var(--card-border, #1E2D4A)', fontSize: '0.75rem', color: '#94A3B8' }}>
        {isAdmin ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#00B4D8', fontWeight: 700, marginBottom: '0.2rem' }}>
              <ShieldCheck style={{ width: 15, height: 15 }} />
              SYSTEM ADMIN
            </div>
            <div style={{ color: '#F8FAFC', fontSize: '0.75rem', fontWeight: 500 }}>
              Bridge Monitoring & Sensor Management
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10B981', fontWeight: 700, marginBottom: '0.2rem' }}>
              <User style={{ width: 15, height: 15 }} />
              {user?.fullName?.toUpperCase() || 'OPERATOR'}
            </div>
            <div style={{ color: '#F8FAFC', fontSize: '0.75rem', fontWeight: 500 }}>
              Bridge Monitoring & Sensor Telemetry
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
