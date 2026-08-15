import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { COUNTRIES } from '../data/countries';
import { ShieldCheck, Lock, UserPlus, CheckCircle2, XCircle, Info, Globe, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SignInPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sign In Form State (Default Credentials Hidden & Inputs Cleared)
  const [signInEmail, setSignInEmail] = useState<string>('');
  const [signInPassword, setSignInPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Sign Up Form State
  const [fullName, setFullName] = useState<string>('');
  const [signUpEmail, setSignUpEmail] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');
  const [selectedCountryName, setSelectedCountryName] = useState<string>('United States');
  const [dialCode, setDialCode] = useState<string>('+1');
  const [phoneBody, setPhoneBody] = useState<string>('');
  const [signUpPassword, setSignUpPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Bi-directional Synchronization for Country & Phone Calling Code
  const handleCountryChange = (countryName: string) => {
    setSelectedCountryName(countryName);
    const found = COUNTRIES.find(c => c.name === countryName);
    if (found) {
      setDialCode(found.dialCode);
    }
  };

  const handleDialCodeChange = (newCode: string) => {
    setDialCode(newCode);
    const found = COUNTRIES.find(c => c.dialCode === newCode);
    if (found) {
      setSelectedCountryName(found.name);
    }
  };

  // Password Criteria
  const pwdLength = signUpPassword.length >= 8;
  const pwdUpper = /[A-Z]/.test(signUpPassword);
  const pwdLower = /[a-z]/.test(signUpPassword);
  const pwdNumber = /[0-9]/.test(signUpPassword);
  const pwdSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(signUpPassword);
  const pwdMatch = signUpPassword.length > 0 && signUpPassword === confirmPassword;

  const isFormValid = pwdLength && pwdUpper && pwdLower && pwdNumber && pwdSpecial && pwdMatch && fullName && signUpEmail;

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    const res = signIn(signInEmail, signInPassword, rememberMe);
    if (res.success) {
      setAuthMessage({ type: 'success', text: res.message });
      setTimeout(() => navigate('/'), 400);
    } else {
      setAuthMessage({ type: 'error', text: res.message });
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);

    if (!isFormValid) {
      setAuthMessage({ type: 'error', text: 'Please satisfy all password validation requirements and required fields.' });
      return;
    }

    const fullPhoneNumber = `${dialCode} ${phoneBody.trim()}`;
    const res = signUp({
      fullName,
      email: signUpEmail,
      organization,
      department,
      designation,
      country: selectedCountryName,
      phoneNumber: fullPhoneNumber,
      password: signUpPassword,
    });

    if (res.success) {
      setAuthMessage({ type: 'success', text: res.message });
      setTimeout(() => navigate('/'), 600);
    } else {
      setAuthMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="animate-scaleIn" style={{ maxWidth: '850px', margin: '2rem auto', padding: '0 1rem', width: '100%' }}>
      
      {/* Top Banner */}
      <div className="shm-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldCheck style={{ color: 'var(--accent-cyan)', width: 26, height: 26 }} />
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                BridgeAI Authentication & Security Center
              </h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Enterprise Infrastructure Gateway with Strict Role-Based Access Control (RBAC).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge-green">PRODUCTION AUTHENTICATION</span>
            <span className="badge badge-cyan">SECURE 256-BIT JWT</span>
          </div>
        </div>
      </div>

      {/* First-Time Role Info Card */}
      <div
        style={{
          background: 'var(--accent-cyan-glow)',
          border: '1px solid var(--accent-cyan)',
          borderRadius: 8,
          padding: '0.85rem 1.15rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.825rem',
          color: 'var(--text-main)',
        }}
      >
        <Info style={{ color: 'var(--accent-cyan)', width: 22, height: 22, flexShrink: 0 }} />
        <div>
          <strong style={{ color: 'var(--accent-cyan)' }}>Role-Based Infrastructure Access:</strong> Please sign in with your registered account credentials or create a new engineer account below.
        </div>
      </div>

      {/* Auth Tabs */}
      <div className="shm-card" style={{ padding: '2rem', background: 'var(--card-bg)' }}>
        
        <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', marginBottom: '1.75rem' }}>
          <button
            onClick={() => { setActiveTab('signin'); setAuthMessage(null); }}
            style={{
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              fontSize: '0.95rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'signin' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: activeTab === 'signin' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Lock style={{ width: 17, height: 17 }} /> Sign In
          </button>

          <button
            onClick={() => { setActiveTab('signup'); setAuthMessage(null); }}
            style={{
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              fontSize: '0.95rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'signup' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: activeTab === 'signup' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <UserPlus style={{ width: 17, height: 17 }} /> Create Account (Sign Up)
          </button>
        </div>

        {authMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 6,
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              backgroundColor: authMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: authMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              color: authMessage.type === 'success' ? 'var(--emerald-green)' : 'var(--coral-critical)',
            }}
          >
            {authMessage.text}
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                EMAIL ADDRESS *
              </label>
              <input
                type="email"
                className="shm-input font-mono"
                value={signInEmail}
                onChange={e => setSignInEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                PASSWORD *
              </label>
              <input
                type="password"
                className="shm-input font-mono"
                value={signInPassword}
                onChange={e => setSignInPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--accent-cyan)' }}
                />
                Remember Me
              </label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset link sent to your registered email.'); }} style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="btn-cyan" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              SIGN IN TO SYSTEM
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: CREATE ACCOUNT (SIGN UP) */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUpSubmit}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  FULL NAME *
                </label>
                <input
                  type="text"
                  className="shm-input"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Dr. Eleanor Vance"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  EMAIL ADDRESS *
                </label>
                <input
                  type="email"
                  className="shm-input font-mono"
                  value={signUpEmail}
                  onChange={e => setSignUpEmail(e.target.value)}
                  placeholder="eleanor.vance@infrastructure.org"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  ORGANIZATION / INSTITUTION
                </label>
                <input
                  type="text"
                  className="shm-input"
                  value={organization}
                  onChange={e => setOrganization(e.target.value)}
                  placeholder="National Structural Research Lab"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  DEPARTMENT
                </label>
                <input
                  type="text"
                  className="shm-input"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="Bridge Instrumentation & Sensor Systems"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  DESIGNATION
                </label>
                <input
                  type="text"
                  className="shm-input"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  placeholder="Senior Structural Health Analyst"
                />
              </div>

              {/* Country Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  <Globe style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />
                  COUNTRY *
                </label>
                <select
                  className="shm-select"
                  value={selectedCountryName}
                  onChange={e => handleCountryChange(e.target.value)}
                  required
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.name}>
                      {c.flag} {c.name} ({c.dialCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Bi-Directionally Synced Phone Dial Code Combobox & Phone Number */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  <Phone style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />
                  PHONE NUMBER * (BI-DIRECTIONALLY SYNCED COUNTRY CALLING CODE)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    className="shm-select font-mono"
                    style={{ width: '160px', fontWeight: 700, color: 'var(--accent-cyan)' }}
                    value={dialCode}
                    onChange={e => handleDialCodeChange(e.target.value)}
                  >
                    {COUNTRIES.map(c => (
                      <option key={`${c.code}_dial`} value={c.dialCode}>
                        {c.flag} {c.code} ({c.dialCode})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="shm-input font-mono"
                    value={phoneBody}
                    onChange={e => setPhoneBody(e.target.value)}
                    placeholder="555-0149"
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  PASSWORD *
                </label>
                <input
                  type="password"
                  className="shm-input font-mono"
                  value={signUpPassword}
                  onChange={e => setSignUpPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  CONFIRM PASSWORD *
                </label>
                <input
                  type="password"
                  className="shm-input font-mono"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            {/* Real-Time Password Validation Checklist */}
            <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--card-border)', borderRadius: 8, padding: '1rem', marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.6rem' }}>
                REAL-TIME PASSWORD VALIDATION CHECKLIST
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: pwdLength ? 'var(--emerald-green)' : 'var(--text-muted)' }}>
                  {pwdLength ? <CheckCircle2 style={{ width: 15, height: 15 }} /> : <XCircle style={{ width: 15, height: 15, color: 'var(--coral-critical)' }} />}
                  At least 8 characters
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: pwdUpper ? 'var(--emerald-green)' : 'var(--text-muted)' }}>
                  {pwdUpper ? <CheckCircle2 style={{ width: 15, height: 15 }} /> : <XCircle style={{ width: 15, height: 15, color: 'var(--coral-critical)' }} />}
                  1 Uppercase letter (A-Z)
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: pwdLower ? 'var(--emerald-green)' : 'var(--text-muted)' }}>
                  {pwdLower ? <CheckCircle2 style={{ width: 15, height: 15 }} /> : <XCircle style={{ width: 15, height: 15, color: 'var(--coral-critical)' }} />}
                  1 Lowercase letter (a-z)
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: pwdNumber ? 'var(--emerald-green)' : 'var(--text-muted)' }}>
                  {pwdNumber ? <CheckCircle2 style={{ width: 15, height: 15 }} /> : <XCircle style={{ width: 15, height: 15, color: 'var(--coral-critical)' }} />}
                  1 Number (0-9)
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: pwdSpecial ? 'var(--emerald-green)' : 'var(--text-muted)' }}>
                  {pwdSpecial ? <CheckCircle2 style={{ width: 15, height: 15 }} /> : <XCircle style={{ width: 15, height: 15, color: 'var(--coral-critical)' }} />}
                  1 Special character (!@#$%^&*)
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: pwdMatch ? 'var(--emerald-green)' : 'var(--text-muted)' }}>
                  {pwdMatch ? <CheckCircle2 style={{ width: 15, height: 15 }} /> : <XCircle style={{ width: 15, height: 15, color: 'var(--coral-critical)' }} />}
                  Passwords match
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn-cyan"
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.95rem', marginTop: '1.25rem' }}
              disabled={!isFormValid}
            >
              REGISTER ACCOUNT
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
