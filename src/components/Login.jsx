import { useState } from 'react';
import axios from 'axios';
import logo from '../assets/logo2.png';
import './Login.css';

export default function Login({ onLogin, onSwitch }) {
  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message,      setMessage]      = useState('');
  const [loading,      setLoading]      = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post('http://localhost:5000/api/login', { username, password });
      onLogin(res.data.user);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      {/* ── Left Panel ── */}
      <div className="auth-panel-left">
        <div className="auth-panel-deco" />

        <div className="auth-brand-block">
          <div className="auth-logo-wrap">
            <img src={logo} alt="Deltaplus logo" />
          </div>
          <p className="auth-panel-brand">Deltaplus</p>
          <p className="auth-panel-sub">RMA Management System</p>
        </div>

        <div className="auth-panel-copy">
          <h1 className="auth-panel-tagline">
            Manage returns,<br />
            <span>effortlessly.</span>
          </h1>
          <p className="auth-panel-desc">
            A centralized platform for dealer RMA requests, real-time tracking,
            and streamlined approvals — all in one place.
          </p>
        </div>

        <div className="auth-panel-strip" />
      </div>

      {/* ── Right Panel ── */}
      <div className="auth-panel-right">
        <div className="auth-form-wrap">
          <div className="auth-header">
            <h2 className="auth-title">Welcome back</h2>
            <p className="auth-subtitle">Sign in to your dealer account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setShowPassword(p => !p)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {message && <div className="auth-error">{message}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{' '}
            <button onClick={onSwitch}>Register here</button>
          </p>
        </div>
      </div>
    </div>
  );
} 