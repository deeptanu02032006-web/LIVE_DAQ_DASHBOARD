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
      className="shm-card"
      style={{
        width: '250px',
        minWidth: '250px',
        borderRadius: 0,
        borderTop: 'none',
        borderBottom: 'none',
        borderLeft: 'none',
        background: 'var(--sidebar-bg)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.25rem 0.85rem',
      }}
    >
      <div>
        {/* Logo / Brand Header */}
        <div style={{ padding: '0 0.5rem 1.25rem 0.5rem', borderBottom: '1px solid var(--card-border)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'var(--accent-cyan-glow)', padding: '0.45rem', borderRadius: 8, border: '1px solid var(--accent-cyan-glow)' }}>
              <Activity style={{ color: 'var(--accent-cyan)', width: 22, height: 22 }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Bridge<span style={{ color: 'var(--accent-cyan)' }}>AI</span> SHM
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                TELEMETRY V2.4
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--accent-cyan-glow)' : 'transparent',
              border: isActive ? '1px solid var(--accent-cyan)' : '1px solid transparent',
              transition: 'all 0.15s ease',
            })}
          >
            <Activity style={{ width: 18, height: 18 }} />
            Live Overview
          </NavLink>

          <NavLink
            to="/analytics"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--accent-cyan-glow)' : 'transparent',
              border: isActive ? '1px solid var(--accent-cyan)' : '1px solid transparent',
              transition: 'all 0.15s ease',
            })}
          >
            <LineChart style={{ width: 18, height: 18 }} />
            Historical Analytics
          </NavLink>

          <NavLink
            to="/sensors"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--accent-cyan-glow)' : 'transparent',
              border: isActive ? '1px solid var(--accent-cyan)' : '1px solid transparent',
              transition: 'all 0.15s ease',
            })}
          >
            <HardDrive style={{ width: 18, height: 18 }} />
            Sensors Directory
          </NavLink>

          <NavLink
            to="/alerts"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--accent-cyan-glow)' : 'transparent',
              border: isActive ? '1px solid var(--accent-cyan)' : '1px solid transparent',
              transition: 'all 0.15s ease',
            })}
          >
            <AlertTriangle style={{ width: 18, height: 18 }} />
            Alerts & Events
            {unacknowledgedCount > 0 && (
              <span className="badge badge-red font-mono" style={{ marginLeft: 'auto', padding: '0.1rem 0.45rem', fontSize: '0.7rem' }}>
                {unacknowledgedCount}
              </span>
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
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                backgroundColor: isActive ? 'var(--accent-cyan-glow)' : 'transparent',
                border: isActive ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                transition: 'all 0.15s ease',
              })}
            >
              <Settings style={{ width: 18, height: 18 }} />
              System Admin
              <span className="badge badge-cyan" style={{ marginLeft: 'auto', fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                ADMIN
              </span>
            </NavLink>
          )}

          {/* Sign In / Persona — Hide when user is logged in */}
          {!user && (
            <NavLink
              to="/signin"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                backgroundColor: isActive ? 'var(--accent-cyan-glow)' : 'transparent',
                border: isActive ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                transition: 'all 0.15s ease',
                marginTop: '0.75rem',
                borderTop: '1px solid var(--card-border)',
                paddingTop: '0.85rem',
              })}
            >
              <Lock style={{ width: 18, height: 18 }} />
              Sign In / Persona
            </NavLink>
          )}
        </nav>
      </div>

      {/* Persistent Footer Widget: Role & User Status */}
      <div style={{ background: 'var(--inner-box-bg)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--card-border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {isAdmin ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '0.2rem' }}>
              <ShieldCheck style={{ width: 16, height: 16 }} />
              SYSTEM ADMIN
            </div>
            <div style={{ color: 'var(--text-main)', fontSize: '0.75rem', fontWeight: 500 }}>
              Bridge Monitoring & Sensor Management
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--emerald-green)', fontWeight: 700, marginBottom: '0.2rem' }}>
              <User style={{ width: 16, height: 16 }} />
              {user?.fullName?.toUpperCase() || 'OPERATOR'}
            </div>
            <div style={{ color: 'var(--text-main)', fontSize: '0.75rem', fontWeight: 500 }}>
              Bridge Monitoring & Sensor Telemetry
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
