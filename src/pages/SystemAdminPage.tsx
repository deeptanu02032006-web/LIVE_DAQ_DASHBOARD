import React, { useState } from 'react';
import { useSHM } from '../context/SHMContext';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  ShieldCheck,
  Cpu,
  Save,
  CheckCircle2,
  Lock,
  Building,
  Users,
  HardDrive,
  History,
  PlusCircle,
  UserCheck,
  UserX,
  Link,
  Radio,
  Edit2,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SystemAdminPage: React.FC = () => {
  const { users: authUsers, updateUserRole, toggleUserStatus } = useAuth() as any;
  const { settings, updateSettings, sensorTypes, addSensorType, updateSensorTypeDefaultLimit, auditLog, testAppsScriptConnection } = useSHM();
  const navigate = useNavigate();

  const user = (useAuth() as any).user;
  const isAdmin = user?.role === 'admin';

  const [activeAdminTab, setActiveAdminTab] = useState<'bridge' | 'daq' | 'users' | 'types' | 'audit'>('types');

  // Form State initialized from persistent SHM Context settings
  const [formData, setFormData] = useState({
    bridgeName: settings?.bridgeName || 'DEMO BRIDGE 01',
    bridgeCode: settings?.bridgeCode || 'DB-01',
    bridgeType: settings?.bridgeType || 'Demo Structure',
    geographicLocation: settings?.geographicLocation || '45.4972° N, 73.5543° W (St. Lawrence River)',
    designLifeYears: settings?.designLifeYears || 100,
    commissionYear: settings?.commissionYear || 2000,
    numberOfSpans: settings?.numberOfSpans || 6,
    primaryMaterial: settings?.primaryMaterial || 'High-Performance Structural Steel & Reinforced Concrete',
    assetOwner: settings?.assetOwner || 'Indian Institute of Technology Kanpur',
    inspectionIntervalMonths: settings?.inspectionIntervalMonths || 6,
    hardwareMode: settings?.hardwareMode ?? true,
    googleAppsScriptUrl: settings?.googleAppsScriptUrl || 'https://script.google.com/macros/s/AKfycbx_SHM_Bridge_App/exec',
    daqSamplingRate: settings?.daqSamplingRate || '100 Hz (High Fidelity)',
    unitSystem: settings?.unitSystem || 'Metric (kN, MPa, mm)',
    themeMode: settings?.themeMode || 'Dark Theme',
    serialBaudRate: settings?.serialBaudRate || 115200,
  });

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testConnStatus, setTestConnStatus] = useState<string | null>(null);

  // Editing Default Limits State for Sensor Types
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingLimitValue, setEditingLimitValue] = useState<number>(0);

  // ROUTE PROTECTION: Strict Access Control for Non-Admin Users
  if (!isAdmin) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="shm-card" style={{ padding: '3rem', background: 'var(--card-bg)', borderColor: 'var(--coral-critical)' }}>
          <Lock style={{ width: 48, height: 48, color: 'var(--coral-critical)', margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Access Denied — Administrator Credentials Required
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            System Administration and Hardware DAQ configuration is restricted exclusively to certified Administrators.
          </p>
          <button onClick={() => navigate('/')} className="btn-cyan">
            Return to Live Overview
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData, user?.fullName);
    setSaveMessage('System settings & hardware DAQ parameters saved successfully.');
    setTimeout(() => setSaveMessage(null), 4000);
  };

  const handleTestConnection = async () => {
    setTestConnStatus('Pinging Google Apps Script endpoint...');
    const res = await testAppsScriptConnection();
    setTestConnStatus(res.message);
    setTimeout(() => setTestConnStatus(null), 5000);
  };

  // New Sensor Type Form State
  const [newTypeName, setNewTypeName] = useState<string>('');
  const [newTypeUnit, setNewTypeUnit] = useState<string>('');
  const [newTypeThreshold, setNewTypeThreshold] = useState<number>(100);

  const handleAddSensorType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim() || !newTypeUnit.trim()) return;
    addSensorType({
      id: newTypeName.toLowerCase().replace(/\s+/g, '_'),
      name: newTypeName.trim(),
      unit: newTypeUnit.trim(),
      defaultThreshold: Number(newTypeThreshold),
    });
    setNewTypeName('');
    setNewTypeUnit('');
    setNewTypeThreshold(100);
    setSaveMessage(`Created sensor type ${newTypeName.trim()}`);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleStartEditLimit = (typeId: string, currentLimit: number) => {
    setEditingTypeId(typeId);
    setEditingLimitValue(currentLimit);
  };

  const handleSaveLimit = (typeId: string, typeName: string, unit: string) => {
    if (isNaN(editingLimitValue) || editingLimitValue <= 0) {
      alert('Please enter a valid positive numerical threshold limit.');
      return;
    }
    updateSensorTypeDefaultLimit(typeId, editingLimitValue, user?.fullName);
    setEditingTypeId(null);
    setSaveMessage(`Updated default safety limit for ${typeName} (${typeId}) to ${editingLimitValue} ${unit}.`);
    setTimeout(() => setSaveMessage(null), 4000);
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div className="shm-card animate-slideUp" style={{ padding: '1.5rem', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Settings style={{ color: 'var(--accent-cyan)', width: 26, height: 26 }} />
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                System Admin & Infrastructure Preferences
              </h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Bridge Metadata, Hardware DAQ Acquisition, Sensor Types Default Limits & Audit Log.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge-cyan">
              <ShieldCheck style={{ width: 12, height: 12 }} /> ADMIN AUTHENTICATED
            </span>
          </div>
        </div>
      </div>

      {/* Admin Sub-Tabs Navbar */}
      <div className="shm-card" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'var(--card-bg)' }}>
        {[
          { id: 'bridge', title: 'Bridge Infrastructure', icon: Building },
          { id: 'daq', title: 'Hardware Mode & DAQ', icon: Cpu },
          { id: 'users', title: 'User Management', icon: Users },
          { id: 'types', title: 'Sensor Types & Default Limits', icon: HardDrive },
          { id: 'audit', title: 'System Audit Log', icon: History },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              style={{
                padding: '0.6rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: 6,
                border: activeAdminTab === tab.id ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                backgroundColor: activeAdminTab === tab.id ? 'var(--accent-cyan-glow)' : 'transparent',
                color: activeAdminTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Icon style={{ width: 16, height: 16 }} />
              {tab.title}
            </button>
          );
        })}
      </div>

      {saveMessage && (
        <div
          className="animate-slideUp"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 8,
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--emerald-green)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 style={{ width: 18, height: 18 }} />
          {saveMessage}
        </div>
      )}

      {/* TAB 1: BRIDGE INFRASTRUCTURE PARAMETERS */}
      {activeAdminTab === 'bridge' && (
        <form onSubmit={handleSubmit} className="shm-card animate-slideUp" style={{ padding: '1.5rem', background: 'var(--card-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
            <Building style={{ color: 'var(--accent-cyan)', width: 20, height: 20 }} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Bridge Infrastructure Parameters
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                BRIDGE NAME *
              </label>
              <input type="text" className="shm-input" value={formData.bridgeName} onChange={e => handleChange('bridgeName', e.target.value)} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                BRIDGE CODE / ID *
              </label>
              <input type="text" className="shm-input font-mono" value={formData.bridgeCode} onChange={e => handleChange('bridgeCode', e.target.value)} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                BRIDGE TYPE *
              </label>
              <select className="shm-select" value={formData.bridgeType} onChange={e => handleChange('bridgeType', e.target.value)}>
                <option value="Cable-Stayed Twin-Pylon Composite">Cable-Stayed Twin-Pylon Composite</option>
                <option value="Suspension Span">Suspension Span</option>
                <option value="Steel Truss Girder">Steel Truss Girder</option>
                <option value="Concrete Segmental Arch">Concrete Segmental Arch</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                GEOGRAPHIC LOCATION *
              </label>
              <input type="text" className="shm-input" value={formData.geographicLocation} onChange={e => handleChange('geographicLocation', e.target.value)} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                DESIGN LIFE (YEARS) *
              </label>
              <input type="number" className="shm-input font-mono" value={formData.designLifeYears} onChange={e => handleChange('designLifeYears', Number(e.target.value))} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                COMMISSION YEAR *
              </label>
              <input type="number" className="shm-input font-mono" value={formData.commissionYear} onChange={e => handleChange('commissionYear', Number(e.target.value))} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                NUMBER OF SPANS *
              </label>
              <input type="number" className="shm-input font-mono" value={formData.numberOfSpans} onChange={e => handleChange('numberOfSpans', Number(e.target.value))} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                PRIMARY BRIDGE MATERIAL *
              </label>
              <input type="text" className="shm-input" value={formData.primaryMaterial} onChange={e => handleChange('primaryMaterial', e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-cyan">
              <Save style={{ width: 16, height: 16 }} /> Save Infrastructure Parameters
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: HARDWARE DAQ COMMUNICATION & GOOGLE APPS SCRIPT */}
      {activeAdminTab === 'daq' && (
        <form onSubmit={handleSubmit} className="shm-card animate-slideUp" style={{ padding: '1.5rem', background: 'var(--card-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
            <Cpu style={{ color: 'var(--accent-cyan)', width: 20, height: 20 }} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Hardware DAQ Acquisition Parameters & Endpoints
            </h2>
          </div>

          <div style={{ background: 'var(--inner-box-bg)', padding: '1.25rem', borderRadius: 8, marginBottom: '1.5rem', border: '1px solid var(--card-border)' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
              <Link style={{ width: 14, height: 14, display: 'inline', marginRight: 4 }} />
              GOOGLE APPS SCRIPT WEB APP ENDPOINT (SECTION 9.1 STAGE 3)
            </label>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="text"
                className="shm-input font-mono"
                value={formData.googleAppsScriptUrl}
                onChange={e => handleChange('googleAppsScriptUrl', e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                required
              />
              <button type="button" onClick={handleTestConnection} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                <Radio style={{ width: 14, height: 14 }} /> Test Connection
              </button>
            </div>

            {testConnStatus && (
              <div style={{ fontSize: '0.78rem', color: 'var(--emerald-green)', marginTop: '0.5rem', fontWeight: 600 }}>
                {testConnStatus}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                SERIAL BAUD RATE
              </label>
              <select className="shm-select font-mono" value={formData.serialBaudRate} onChange={e => handleChange('serialBaudRate', Number(e.target.value))}>
                <option value={9600}>9600 Baud</option>
                <option value={57600}>57600 Baud</option>
                <option value={115200}>115200 Baud (Recommended)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                UNIT SYSTEM
              </label>
              <select className="shm-select" value={formData.unitSystem} onChange={e => handleChange('unitSystem', e.target.value)}>
                <option value="Metric (kN, MPa, mm)">Metric (kN, MPa, mm)</option>
                <option value="Imperial (kips, ksi, in)">Imperial (kips, ksi, in)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                DAQ SAMPLING RATE
              </label>
              <select className="shm-select font-mono" value={formData.daqSamplingRate} onChange={e => handleChange('daqSamplingRate', e.target.value)}>
                <option value="10 Hz">10 Hz</option>
                <option value="50 Hz">50 Hz</option>
                <option value="100 Hz (High Fidelity)">100 Hz (High Fidelity)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-cyan">
              <Save style={{ width: 16, height: 16 }} /> Save DAQ Preferences
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: USER MANAGEMENT */}
      {activeAdminTab === 'users' && (
        <div className="shm-card animate-slideUp" style={{ padding: 0, overflow: 'hidden', background: 'var(--card-bg)' }}>
          <div style={{ padding: '1.25rem 1.5rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users style={{ color: 'var(--accent-cyan)', width: 20, height: 20 }} />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                User Management & Access Controls ({authUsers?.length || 0})
              </h2>
            </div>
          </div>

          <table className="shm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Organization / Dept</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {authUsers && authUsers.length > 0 ? (
                authUsers.map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.fullName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.country} ({u.phoneNumber})</div>
                    </td>
                    <td className="font-mono" style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>
                      {u.email}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {u.organization || 'N/A'} — {u.department || 'N/A'}
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-cyan' : 'badge-yellow'}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {u.isActive ? (
                        <span className="badge badge-green">ACTIVE</span>
                      ) : (
                        <span className="badge badge-red">DEACTIVATED</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => updateUserRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                          className="btn-secondary"
                          style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                          title="Toggle User Role"
                        >
                          Make {u.role === 'admin' ? 'User' : 'Admin'}
                        </button>
                        <button
                          onClick={() => toggleUserStatus(u.id)}
                          className={u.isActive ? 'btn-danger' : 'btn-cyan'}
                          style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                        >
                          {u.isActive ? <UserX style={{ width: 13, height: 13 }} /> : <UserCheck style={{ width: 13, height: 13 }} />}
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No registered users in system database yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: SENSOR TYPES & ADMIN EDITABLE DEFAULT LIMITS */}
      {activeAdminTab === 'types' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem' }}>
          
          <form onSubmit={handleAddSensorType} className="shm-card animate-slideUp" style={{ padding: '1.5rem', background: 'var(--card-bg)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
              Add System Sensor Type
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  TYPE NAME *
                </label>
                <input type="text" className="shm-input" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="e.g. Inclination" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  UNIT SYMBOL *
                </label>
                <input type="text" className="shm-input font-mono" value={newTypeUnit} onChange={e => setNewTypeUnit(e.target.value)} placeholder="e.g. deg" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  DEFAULT THRESHOLD *
                </label>
                <input type="number" className="shm-input font-mono" value={newTypeThreshold} onChange={e => setNewTypeThreshold(Number(e.target.value))} required />
              </div>
              <button type="submit" className="btn-cyan" style={{ marginTop: '0.5rem' }}>
                <PlusCircle style={{ width: 16, height: 16 }} /> Create Sensor Type
              </button>
            </div>
          </form>

          <div className="shm-card animate-slideUp" style={{ padding: 0, overflow: 'hidden', background: 'var(--card-bg)' }}>
            <div style={{ padding: '1rem 1.25rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Configured System Sensor Types & Default Safety Limits
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '0.15rem' }}>
                  ⚡ Administrators can modify default thresholds for any sensor channel below.
                </div>
              </div>
            </div>
            <table className="shm-table">
              <thead>
                <tr>
                  <th>Type ID</th>
                  <th>Name</th>
                  <th>Unit</th>
                  <th>Default Limit</th>
                  <th style={{ textAlign: 'right' }}>Admin Modify Limit</th>
                </tr>
              </thead>
              <tbody>
                {sensorTypes.map(st => {
                  const isEditing = editingTypeId === st.id;
                  return (
                    <tr key={st.id}>
                      <td className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{st.id}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{st.name}</td>
                      <td className="font-mono" style={{ color: 'var(--text-muted)' }}>{st.unit}</td>
                      <td className="font-mono" style={{ fontWeight: 700 }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <input
                              type="number"
                              className="shm-input font-mono"
                              style={{ width: '100px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                              value={editingLimitValue}
                              onChange={e => setEditingLimitValue(Number(e.target.value))}
                              autoFocus
                            />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{st.unit}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--amber-warning)' }}>
                            {st.defaultThreshold} {st.unit}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isEditing ? (
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => handleSaveLimit(st.id, st.name, st.unit)}
                              className="btn-cyan"
                              style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                              title="Save Default Limit"
                            >
                              <Check style={{ width: 13, height: 13 }} /> Save
                            </button>
                            <button
                              onClick={() => setEditingTypeId(null)}
                              className="btn-secondary"
                              style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEditLimit(st.id, st.defaultThreshold)}
                            className="btn-secondary"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
                            title="Modify Default Safety Limit (Admin Only)"
                          >
                            <Edit2 style={{ width: 13, height: 13 }} /> Edit Limit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 5: AUDIT LOG */}
      {activeAdminTab === 'audit' && (
        <div className="shm-card animate-slideUp" style={{ padding: 0, overflow: 'hidden', background: 'var(--card-bg)' }}>
          <div style={{ padding: '1.25rem 1.5rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Administrative Action Audit Log
            </h2>
          </div>
          <table className="shm-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map(entry => (
                <tr key={entry.id}>
                  <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{entry.actor}</div>
                    <div className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>{entry.actorEmail}</div>
                  </td>
                  <td>
                    <span className="badge badge-cyan">{entry.action}</span>
                  </td>
                  <td style={{ fontSize: '0.825rem', color: 'var(--text-main)' }}>
                    {entry.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
