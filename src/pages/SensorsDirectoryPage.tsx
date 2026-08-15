import React, { useState } from 'react';
import { useSHM } from '../context/SHMContext';
import { useAuth } from '../context/AuthContext';
import {
  HardDrive,
  Search,
  Download,
  PlusCircle,
  Trash2,
  Edit,
  CheckCircle2,
  AlertTriangle,
  Radio,
  FileSpreadsheet,
  WifiOff,
  Clock,
  XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { RegisterSensorModal } from '../components/modals/RegisterSensorModal';

export const SensorsDirectoryPage: React.FC = () => {
  const { sensors, telemetryHistory, removeSensor, isDaqOnline } = useSHM();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [subsystemFilter, setSubsystemFilter] = useState<string>('All');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);

  // Custom Data Export State
  const [selectedSensorIds, setSelectedSensorIds] = useState<string[]>([]);
  const [exportInterval, setExportInterval] = useState<'1H' | '2H' | '12H' | '24H' | 'Custom'>('24H');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');

  // Counters
  const totalCount = sensors.length;
  const onlineCount = isDaqOnline ? sensors.filter(s => s.status === 'online').length : 0;
  const warnCritCount = sensors.filter(s => s.status === 'warning' || s.status === 'critical').length;
  const disconnectedCount = isDaqOnline ? sensors.filter(s => s.status === 'disconnected').length : 0;

  // Search & Filtered sensors
  const filteredSensors = sensors.filter(sensor => {
    const matchesSearch =
      sensor.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sensor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sensor.subsystem.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sensor.hardwareBus.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || sensor.status === statusFilter.toLowerCase();
    const matchesSubsystem = subsystemFilter === 'All' || sensor.subsystem === subsystemFilter;

    return matchesSearch && matchesStatus && matchesSubsystem;
  });

  // Toggle selection for export
  const toggleSensorSelection = (id: string) => {
    if (selectedSensorIds.includes(id)) {
      setSelectedSensorIds(selectedSensorIds.filter(s => s !== id));
    } else {
      setSelectedSensorIds([...selectedSensorIds, id]);
    }
  };

  const selectAllSensorsForExport = () => {
    if (selectedSensorIds.length === sensors.length) {
      setSelectedSensorIds([]);
    } else {
      setSelectedSensorIds(sensors.map(s => s.id));
    }
  };

  // Export Selected Sensor Data (.xlsx / .csv)
  const handleExportSelectedData = () => {
    const targetSensors = selectedSensorIds.length > 0 ? selectedSensorIds : sensors.map(s => s.id);
    if (targetSensors.length === 0) {
      alert('Please select at least one sensor node to export data.');
      return;
    }

    const exportRows = telemetryHistory.map(dp => {
      const row: Record<string, any> = {
        Timestamp: dp.timestamp,
        TimeLabel: dp.timeLabel,
      };
      targetSensors.forEach(id => {
        const s = sensors.find(item => item.id === id);
        row[`${id} (${s?.unit || ''})`] = dp[id] ?? 'N/A';
      });
      return row;
    });

    if (exportRows.length === 0) {
      alert('No telemetry stream records recorded for the selected interval.');
      return;
    }

    if (exportFormat === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'SHM Telemetry Data');
      XLSX.writeFile(workbook, `Bridge_SHM_Selected_Sensors_${exportInterval}.xlsx`);
    } else {
      const headers = Object.keys(exportRows[0]).join(',');
      const csvData = exportRows.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([`${headers}\n${csvData}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bridge_SHM_Selected_Sensors_${exportInterval}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Render Sensor Activity Status Badge (Section 7, 20 & Screenshot Fix)
  const renderSensorStatusBadge = (status: string) => {
    const s = (status || 'offline').toLowerCase();
    if (s === 'online') {
      return (
        <span className="badge badge-green">
          <CheckCircle2 style={{ width: 12, height: 12 }} /> ● ONLINE
        </span>
      );
    } else if (s === 'disconnected') {
      return (
        <span className="badge badge-yellow">
          <WifiOff style={{ width: 12, height: 12 }} /> ● DISCONNECTED
        </span>
      );
    } else if (s === 'stale') {
      return (
        <span className="badge badge-yellow">
          <Clock style={{ width: 12, height: 12 }} /> ● STALE
        </span>
      );
    } else if (s === 'invalid') {
      return (
        <span className="badge badge-red">
          <XCircle style={{ width: 12, height: 12 }} /> ● INVALID
        </span>
      );
    } else if (s === 'warning' || s === 'critical') {
      return (
        <span className="badge badge-red">
          <AlertTriangle style={{ width: 12, height: 12 }} /> ● {s.toUpperCase()}
        </span>
      );
    } else {
      return (
        <span className="badge badge-red">
          <Radio style={{ width: 12, height: 12 }} /> ● OFFLINE
        </span>
      );
    }
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Bar & Admin Register Button */}
      <div className="shm-card animate-slideUp" style={{ padding: '1.5rem', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <HardDrive style={{ color: 'var(--accent-cyan)', width: 24, height: 24 }} />
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Sensor Node Directory & Device Health
              </h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '0.2rem' }}>
              Hardware Pin Mapping Registry, DAQ Bus Channels & Custom Telemetry Data Exporter.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Status Counters */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="badge badge-cyan">TOTAL: {totalCount}</span>
              <span className="badge badge-green">ONLINE: {onlineCount}</span>
              <span className="badge badge-yellow">DISC: {disconnectedCount}</span>
              <span className="badge badge-red">WARN/CRIT: {warnCritCount}</span>
            </div>

            {/* ADMIN ONLY BUTTON */}
            {isAdmin && (
              <button onClick={() => setIsRegisterModalOpen(true)} className="btn-cyan">
                <PlusCircle style={{ width: 16, height: 16 }} /> + Register Hardware Sensor
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Custom Excel / CSV Data Export Tool */}
      <div className="shm-card" style={{ padding: '1.25rem', background: 'var(--inner-box-bg)', borderColor: 'var(--card-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet style={{ color: 'var(--accent-cyan)', width: 20, height: 20 }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Custom Data Export Tool (.xlsx / .csv)
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Selected: <strong style={{ color: 'var(--accent-cyan)' }}>{selectedSensorIds.length || sensors.length}</strong> Sensor(s)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
              SELECT SPECIFIC SENSORS (MULTI-SELECT)
            </label>
            <button
              onClick={selectAllSensorsForExport}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', width: '100%', justifyContent: 'center' }}
            >
              {selectedSensorIds.length === sensors.length ? 'Deselect All' : 'Select All Hardware Nodes'}
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
              TIME INTERVAL SELECTION
            </label>
            <select
              className="shm-select"
              style={{ fontSize: '0.8rem', padding: '0.4rem' }}
              value={exportInterval}
              onChange={e => setExportInterval(e.target.value as any)}
            >
              <option value="1H">1 Hour Interval</option>
              <option value="2H">2 Hours Interval</option>
              <option value="12H">12 Hours Interval</option>
              <option value="24H">24 Hours Interval</option>
              <option value="Custom">Custom Range</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
              FILE FORMAT
            </label>
            <select
              className="shm-select"
              style={{ fontSize: '0.8rem', padding: '0.4rem' }}
              value={exportFormat}
              onChange={e => setExportFormat(e.target.value as any)}
            >
              <option value="xlsx">Excel Workbook (.xlsx)</option>
              <option value="csv">Comma-Separated (.csv)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={handleExportSelectedData} className="btn-cyan" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
              <Download style={{ width: 15, height: 15 }} /> Export Selected Sensor Data
            </button>
          </div>

        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="shm-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--card-bg)' }}>
        
        {/* Search Bar */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)', width: 16, height: 16 }} />
          <input
            type="text"
            className="shm-input"
            style={{ paddingLeft: '2.2rem' }}
            placeholder="Search by Sensor ID, name, location, or bus pin..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
          <select
            className="shm-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Online">Online Only</option>
            <option value="Disconnected">Disconnected Only</option>
            <option value="Offline">Offline Only</option>
            <option value="Warning">Warning Only</option>
          </select>
        </div>

        {/* Subsystem Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Subsystem:</span>
          <select
            className="shm-select"
            style={{ width: 'auto' }}
            value={subsystemFilter}
            onChange={e => setSubsystemFilter(e.target.value)}
          >
            <option value="All">All Subsystems</option>
            <option value="Main Cable">Main Cable</option>
            <option value="Deck">Deck</option>
            <option value="Pylon">Pylon</option>
            <option value="Expansion Joint">Expansion Joint</option>
          </select>
        </div>

      </div>

      {/* Installed Sensors Data Table */}
      <div className="shm-card" style={{ padding: 0, overflow: 'hidden', background: 'var(--card-bg)' }}>
        <table className="shm-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedSensorIds.length === sensors.length && sensors.length > 0}
                  onChange={selectAllSensorsForExport}
                  style={{ accentColor: 'var(--accent-cyan)' }}
                />
              </th>
              <th>Sensor ID</th>
              <th>Name / Type</th>
              <th>Subsystem Location</th>
              <th>Hardware Bus / Pin</th>
              <th>Current Value</th>
              <th>Safety Threshold</th>
              <th>Status</th>
              {isAdmin && <th style={{ textAlign: 'right' }}>Admin Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredSensors.length > 0 ? (
              filteredSensors.map(sensor => (
                <tr key={sensor.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedSensorIds.includes(sensor.id)}
                      onChange={() => toggleSensorSelection(sensor.id)}
                      style={{ accentColor: 'var(--accent-cyan)' }}
                    />
                  </td>

                  <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {sensor.id}
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sensor.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      Type: {sensor.type} ({sensor.unit})
                    </div>
                  </td>

                  <td>
                    <span className="badge badge-cyan">{sensor.subsystem}</span>
                  </td>

                  <td className="font-mono" style={{ color: 'var(--text-main)', fontSize: '0.8rem' }}>
                    {sensor.hardwareBus}
                  </td>

                  <td className="font-mono" style={{ fontWeight: 700 }}>
                    {sensor.currentValue !== null && sensor.status === 'online' ? (
                      <span style={{ color: sensor.currentValue >= sensor.threshold ? 'var(--coral-critical)' : 'var(--emerald-green)' }}>
                        {sensor.currentValue.toFixed(1)} {sensor.unit}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>

                  <td className="font-mono" style={{ color: 'var(--text-muted)' }}>
                    {sensor.threshold} {sensor.unit}
                  </td>

                  <td>
                    {renderSensorStatusBadge(sensor.status)}
                  </td>

                  {/* Admin Actions */}
                  {isAdmin && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => alert(`Edit hardware pin configuration for ${sensor.id}`)}
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                          title="Edit Parameters (Admin Only)"
                        >
                          <Edit style={{ width: 14, height: 14 }} />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to unregister sensor ${sensor.id}?`)) {
                              removeSensor(sensor.id);
                            }
                          }}
                          className="btn-danger"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                          title="Remove Sensor (Admin Only)"
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <HardDrive style={{ width: 32, height: 32, margin: '0 auto 0.5rem auto', color: 'var(--text-muted)' }} />
                  <div>No sensor nodes match your search query or filters.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RegisterSensorModal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} />

    </div>
  );
};
