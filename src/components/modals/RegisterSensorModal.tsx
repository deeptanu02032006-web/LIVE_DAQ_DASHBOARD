import React, { useState } from 'react';
import { useSHM } from '../../context/SHMContext';
import type { SensorType, SubsystemLocation } from '../../types/shm';
import { X, Cpu, PlusCircle } from 'lucide-react';

interface RegisterSensorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegisterSensorModal: React.FC<RegisterSensorModalProps> = ({ isOpen, onClose }) => {
  const { registerSensor } = useSHM();

  const [id, setId] = useState<string>('FORCE-03');
  const [name, setName] = useState<string>('North Span Anchor Cable Tension Sensor');
  const [type, setType] = useState<SensorType>('force');
  const [subsystem, setSubsystem] = useState<SubsystemLocation>('Main Cable');
  const [hardwareBus, setHardwareBus] = useState<string>('Arduino Pin A6 (ADC Channel 6)');
  const [threshold, setThreshold] = useState<number>(5000);
  const [unit, setUnit] = useState<string>('kN');

  if (!isOpen) return null;

  const handleTypeChange = (newType: SensorType) => {
    setType(newType);
    if (newType === 'force') setUnit('kN');
    else if (newType === 'displacement') setUnit('mm');
    else if (newType === 'strain') setUnit('µε');
    else if (newType === 'stress') setUnit('MPa');
    else if (newType === 'temperature') setUnit('°C');
    else if (newType === 'humidity') {
      setUnit('%');
      setThreshold(100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !name.trim()) return;

    registerSensor({
      id: id.trim().toUpperCase(),
      name: name.trim(),
      type,
      subsystem,
      hardwareBus: hardwareBus.trim(),
      threshold: Number(threshold),
      unit: unit.trim(),
    });

    onClose();
  };

  return (
    <div
      className="animate-fadeIn"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 18, 32, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        className="shm-card shm-card-glow animate-scaleIn"
        style={{
          width: '100%',
          maxWidth: '540px',
          padding: '1.75rem',
          backgroundColor: 'var(--card-bg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Cpu style={{ color: 'var(--accent-cyan)', width: 22, height: 22 }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Register Hardware Sensor
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#94A3B8', marginBottom: '0.35rem', fontWeight: 600 }}>
              SENSOR NODE IDENTIFIER (ID) *
            </label>
            <input
              type="text"
              className="shm-input font-mono"
              value={id}
              onChange={e => setId(e.target.value)}
              placeholder="e.g. FORCE-01, STRAIN-02"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#94A3B8', marginBottom: '0.35rem', fontWeight: 600 }}>
              SENSOR DISPLAY NAME *
            </label>
            <input
              type="text"
              className="shm-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. South Anchor Cable Tension Load Cell"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94A3B8', marginBottom: '0.35rem', fontWeight: 600 }}>
                SENSOR TYPE *
              </label>
              <select
                className="shm-select"
                value={type}
                onChange={e => handleTypeChange(e.target.value as SensorType)}
              >
                <option value="force">Load / Force (kN)</option>
                <option value="displacement">Displacement (mm)</option>
                <option value="strain">Strain (µε)</option>
                <option value="stress">Stress (MPa)</option>
                <option value="temperature">Temperature (°C)</option>
                <option value="humidity">Humidity (%)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94A3B8', marginBottom: '0.35rem', fontWeight: 600 }}>
                SUBSYSTEM LOCATION *
              </label>
              <select
                className="shm-select"
                value={subsystem}
                onChange={e => setSubsystem(e.target.value as SubsystemLocation)}
              >
                <option value="Main Cable">Main Cable</option>
                <option value="Deck">Deck</option>
                <option value="Pylon">Pylon</option>
                <option value="Expansion Joint">Expansion Joint</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94A3B8', marginBottom: '0.35rem', fontWeight: 600 }}>
                HARDWARE BUS / PIN MAPPING *
              </label>
              <input
                type="text"
                className="shm-input font-mono"
                value={hardwareBus}
                onChange={e => setHardwareBus(e.target.value)}
                placeholder="e.g. Arduino Pin A0, Bus 1"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94A3B8', marginBottom: '0.35rem', fontWeight: 600 }}>
                SAFETY THRESHOLD ({unit}) *
              </label>
              <input
                type="number"
                step="any"
                className="shm-input font-mono"
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-cyan">
              <PlusCircle style={{ width: 16, height: 16 }} /> Save Hardware Node
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
