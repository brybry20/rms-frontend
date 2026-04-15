import { useState, useEffect } from 'react';
import axios from 'axios';
import locationData from '../data/philippine_locations.json';
import logo from '../assets/logo2.png';
import './Register.css';

// ✅ Defined OUTSIDE parent — prevents remount / focus loss on every keystroke
const Field = ({ label, required, hint, children }) => (
  <div className="auth-field">
    <label>
      {label}
      {required && <span className="required"> *</span>}
    </label>
    {children}
    <span className="auth-field-hint">{hint || ''}</span>
  </div>
);

export default function Register({ onSwitch }) {
  const [formData, setFormData] = useState({
    username: '', password: '', confirmPassword: '', email: '',
    contact_number: '+63', distributor_name: '',
    region_code: '', province_code: '', city_code: '', barangay_code: '',
    region: '', province: '', city: '', barangay: '',
  });

  const [regions,   setRegions]   = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities,    setCities]    = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [toast,     setToast]     = useState({ show: false, message: '', type: '' });
  const [loading,   setLoading]   = useState(false);
  const [showPw,    setShowPw]    = useState(false);
  const [showCpw,   setShowCpw]   = useState(false);

  useEffect(() => {
    const list = Object.keys(locationData)
      .map(code => ({ code, name: locationData[code].region_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setRegions(list);
  }, []);

  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(() => setToast({ show: false, message: '', type: '' }), 3500);
    return () => clearTimeout(t);
  }, [toast.show]);

  const showToast = (message, type) => setToast({ show: true, message, type });
  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegionChange = e => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    const list = Object.keys(locationData[code].province_list)
      .map(n => ({ code: n, name: n }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setProvinces(list); setCities([]); setBarangays([]);
    setFormData({ ...formData, region_code: code, region: name, province_code: '', province: '', city_code: '', city: '', barangay_code: '', barangay: '' });
  };

  const handleProvinceChange = e => {
    const name = e.target.value;
    const list = Object.keys(locationData[formData.region_code].province_list[name].municipality_list)
      .map(n => ({ code: n, name: n }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setCities(list); setBarangays([]);
    setFormData({ ...formData, province_code: name, province: name, city_code: '', city: '', barangay_code: '', barangay: '' });
  };

  const handleCityChange = e => {
    const name = e.target.value;
    const list = locationData[formData.region_code].province_list[formData.province_code]
      .municipality_list[name].barangay_list
      .map(n => ({ code: n, name: n }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setBarangays(list);
    setFormData({ ...formData, city_code: name, city: name, barangay_code: '', barangay: '' });
  };

  const handleBarangayChange = e =>
    setFormData({ ...formData, barangay_code: e.target.value, barangay: e.target.value });

  const handleContactChange = e => {
    let v = e.target.value;
    if (!v.startsWith('+63')) v = '+63' + v.replace(/^\+63/, '');
    const num = v.substring(3).replace(/\D/g, '').substring(0, 10);
    setFormData({ ...formData, contact_number: '+63' + num });
  };

  const validate = () => {
    const checks = [
      [!formData.username.trim(),                               'Username is required'],
      [!formData.password,                                      'Password is required'],
      [formData.password.length < 6,                            'Password must be at least 6 characters'],
      [formData.password !== formData.confirmPassword,          'Passwords do not match'],
      [!formData.email,                                         'Email is required'],
      [!formData.contact_number || formData.contact_number === '+63', 'Contact number is required'],
      [!/^\+63\d{10}$/.test(formData.contact_number),          'Format: +63 followed by 10 digits'],
      [!formData.distributor_name.trim(),                       'Distributor name is required'],
      [!formData.region_code,                                   'Please select a region'],
      [!formData.province_code,                                 'Please select a province'],
      [!formData.city_code,                                     'Please select a city / municipality'],
      [!formData.barangay_code,                                 'Please select a barangay'],
    ];
    for (const [cond, msg] of checks) {
      if (cond) { showToast(msg, 'error'); return false; }
    }
    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { confirmPassword, region_code, province_code, city_code, barangay_code, ...data } = formData;
      data.company_name = data.distributor_name;
      delete data.distributor_name;
      const res = await axios.post('http://localhost:5000/api/register', data);
      showToast(res.data.message, 'success');
      setTimeout(() => onSwitch(), 2200);
    } catch (err) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root auth-root--wide">
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? '✓' : '!'}</span>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => setToast({ show: false, message: '', type: '' })}>×</button>
        </div>
      )}

      <div className="auth-card auth-card--wide">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-logo-wrap">
            <img src={logo} alt="Deltaplus logo" />
          </div>
          <div>
            <div className="auth-brand-name">Deltaplus</div>
            <div className="auth-brand-sub">RMA Management System</div>
          </div>
        </div>

        <h2 className="auth-title">Create dealer account</h2>
        <p className="auth-subtitle">
          Dealer registration only. Your account will be reviewed by an administrator before activation.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">

          {/* ── Account Info ── */}
          <div className="form-section-title">Account Information</div>

          <Field label="Username" required>
            <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Choose a username" autoComplete="username" />
          </Field>

          <div className="auth-field-row">
            <Field label="Password" required>
              <div className="input-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password" value={formData.password}
                  onChange={handleChange} placeholder="Min. 6 characters"
                  autoComplete="new-password"
                />
                <button type="button" className="toggle-pw" onClick={() => setShowPw(p => !p)}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
            <Field label="Confirm Password" required>
              <div className="input-wrap">
                <input
                  type={showCpw ? 'text' : 'password'}
                  name="confirmPassword" value={formData.confirmPassword}
                  onChange={handleChange} placeholder="Repeat password"
                  autoComplete="new-password"
                />
                <button type="button" className="toggle-pw" onClick={() => setShowCpw(p => !p)}>
                  {showCpw ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
          </div>

          <div className="auth-field-row">
            <Field label="Email" required>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@company.com" autoComplete="email" />
            </Field>
            <Field label="Contact Number" required hint="Format: +63 followed by 10 digits">
              <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleContactChange} placeholder="+639123456789" />
            </Field>
          </div>

          {/* ── Distributor ── */}
          <div className="form-section-title">Distributor Information</div>

          <Field label="Distributor / Company Name" required>
            <input type="text" name="distributor_name" value={formData.distributor_name} onChange={handleChange} placeholder="Official company or distributor name" />
          </Field>

          {/* ── Location ── */}
          <div className="form-section-title">Location</div>

          <div className="auth-field-row">
            <Field label="Region" required>
              <select name="region_code" value={formData.region_code} onChange={handleRegionChange}>
                <option value="">Select Region</option>
                {regions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Province" required>
              <select name="province_code" value={formData.province_code} onChange={handleProvinceChange} disabled={!formData.region_code}>
                <option value="">Select Province</option>
                {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="auth-field-row">
            <Field label="City / Municipality" required>
              <select name="city_code" value={formData.city_code} onChange={handleCityChange} disabled={!formData.province_code}>
                <option value="">Select City</option>
                {cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Barangay" required>
              <select name="barangay_code" value={formData.barangay_code} onChange={handleBarangayChange} disabled={!formData.city_code}>
                <option value="">Select Barangay</option>
                {barangays.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </Field>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <button onClick={onSwitch}>Sign in here</button>
        </p>
      </div>
    </div>
  );
}