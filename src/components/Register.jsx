import { useState, useEffect } from 'react';
import locationData from '../data/philippine_locations.json';
import logo from '../assets/logo2.png';
import './Register.css';
import api from '../api';

// Listahan ng mga distributors
const DISTRIBUTORS_LIST = [
  "2RM WORTHY INDUSTRIAL SUPPLIES",
  "3G1B ENTERPRISE",
  "3J GOLDEN DRAGON CORP",
  "5MLINK ENTERPRISE",
  "A. ALVAREZ TRADING & SERVICES",
  "AFFF GENERAL MERCHANDISE",
  "AGP TRADING",
  "AIC INDUSTRIAL AND SAFETY",
  "AJDA ENTERPRISES INC.",
  "AJDA INDUSTRIAL SUPPLY",
  "AKJ27 CONSTRUCTION SUPPLY AND",
  "ALPHA SOLUTIO ENTERPRISE",
  "AMCAS ENTERPRISES",
  "AMMCO INTERNATIONAL CONSUMER",
  "ANDUILLER INT'L. SALES CORP",
  "AQUARIAN MARINE SUPPLY INC.",
  "ARC-CARE ENTERPRISES",
  "ARUGA INTEGRATED SOLUTION OPC",
  "ASJZ TRADING",
  "BC-MAN ENTERPRISES INC.",
  "BEMX ENTERPRISES",
  "BESTMARC UNISALES INC.",
  "BIGVISION INTERNATIONAL TRADE",
  "BLUEPOWER VENTURES INC.",
  "BOHOL QUALITY CORPORATION",
  "BUENDEZ INDUSTRIAL",
  "BUILDSAFE MARKETING VENTURES",
  "C-CHOICE CONSTRUCTION SUPPLY",
  "CEBU ATLANTIC HARDWARE INC.",
  "CEBU BELMONT, INC",
  "CLEANGUARD JANITORIAL &",
  "COMFORT SEARCH ENTERPRISES",
  "COMPLIMENTS MEN'S BOUTIQUE",
  "CONREY IAN VALLEJOS",
  "CORAND SUPPORT MARKETING INC",
  "CS TRADING & GENERAL",
  "DC INDUSTRIAL & OFFICE",
  "DCM GLOBAL TECHNOLOGIES INC.",
  "DELS APPAREL CORPORATION",
  "DELS CORPORATION",
  "DELTA PLUS PHILIPPINES",
  "DENKI ELECTRIC CORPORATION",
  "DML SUBIC FREEPORT CORPORATION",
  "EHS BIOPRODUCTS INC",
  "ELITECLEAN INC",
  "ENBK PRINTING SERVICES",
  "FIL AMERICAN HARDWARE",
  "FIRST CHOICE INDUSTRIAL SAFETY",
  "FIRST POWER ELECTRICAL",
  "FOOTSAFE PHILIPPINES, INC.",
  "FORD GARMENTS AND SAFETY GEARS",
  "FOREMOST SCREWTECH BOLTS",
  "FRANCIS ECHAGUE",
  "FRANCIS MAGALLANES",
  "FRONTGUILD INC.",
  "GDA SEMICON TRADING",
  "GEN ASIA TRADING",
  "GENASCO MARKETING CORPORATION",
  "GLJM DIVERSIFIED",
  "GLOTOC TOOLS AND INDUSTRIAL",
  "GMAP ENTERPRISE",
  "GOSHIELD PROTECTIVE EQUIPMENT",
  "GOSON MARKETING INC.",
  "GRATEFUL MIND ENTERPRISE",
  "GREMCA-V INTERNATIONAL",
  "HANANI CONSUMER GOODS TRADING",
  "HONEY-WELL INTERNATIONAL SALES",
  "INTEGRATED SCIENTIFIC AND",
  "J. RANIDO ENTERPRISES",
  "JCC3 TRADING CORPORATION",
  "JEZHAN ENTERPRISES",
  "JV SAFETY AND PERSONAL",
  "KAZ TRADING",
  "KEY LINK SALES INTEGRATED INC.",
  "KING'S SAFETYNET INC.",
  "KJELD ENTERPRISE INC.",
  "KOI INDUSTRIAL SUPPLY",
  "KRISAN SAFETY AND INDUSTRIAL",
  "LATEX ENTERPRISES",
  "LEX CARRETAS",
  "LJM INDUSTRIAL SAFETY PRODUCTS",
  "LOCSEAL INDUSTRIAL CORPORATION",
  "LONGHAPROS MARKETING",
  "LSG INDUSTRIAL & OFFICE",
  "LTS HARDWARE, INC",
  "LUCKY 14 ENTERPRISE",
  "MAJIN INDUSTRIAL",
  "MANWORXXX MARKETING AND",
  "MARIEL GERES",
  "MARIO VARGAS",
  "MARKETING EVENT",
  "MASE PERSONAL PROTECTIVE",
  "MASIGASIG DISTRIBUTION",
  "MBN ENTERPRISE",
  "MC ARC INDUSTRIAL SUPPLY",
  "MERCHANTO ENTERPRISES CORP.",
  "MERF ISES OPC",
  "MICEL CORPORATION",
  "MILERK CONSUMER GOODS TRADING",
  "MOIKAI INCORPORATED",
  "MOIKAI INDUSTRIAL SUPPLIES AND",
  "MUSH ENTERPRISES",
  "NEMIKA ENTERPRISES",
  "NI-GATSU SAISEI CORPORATION",
  "NORDEN SUBIC ENTREPRENEURS INC",
  "NUPON TECHNOLOGY PHILIPPINES",
  "OLIVEROS PROTECTIVE EQUIPMENT",
  "OPTICHEM INDUSTRIES CHEMICAL",
  "ORIGIN8 BUILDERS & TRADING INC",
  "ORO FORMMS TRADING",
  "PEPSAN ENTERPRISES",
  "PHILSTAFF MANAGEMENT SERVICES,",
  "PPI ASIA LINKS CORP",
  "PRECISTO INDUSTRIAL TRADING",
  "PROFESSIONAL GEAR, INC.",
  "QUICSAFE GENERAL MERCHANDISE",
  "R.B. CASTILLO ENTERPRISES",
  "RAPIDSAFE PHILIPPINES INC.",
  "RCORDS INDUSTRIAL SUPPLIES AND",
  "RECON TRADING",
  "REIDAR ENTERPRISES",
  "REIDAR ENTERPRISES CO.",
  "REJOICE HARDWARE AND",
  "RICKMARK INDUSTRIAL SALES",
  "ROBART CONSTRUCTION SUPPLIES",
  "ROCKWELL ENTERPRISE INC",
  "ROLD MASILUNGAN",
  "ROMAN ESSENCE INTERNATIONAL",
  "ROMPRO INDUSTRIAL SUPPLY",
  "ROYAL HYGIENE AND SAFETY",
  "SAFETY4LESS INDUSTRIAL CORP.",
  "SAFETYKO INDUSTRIAL SUPPLIES",
  "SAFETYPRO INCORPORATED",
  "SAFEVIEW ENTERPRISES",
  "SEE MORE ENTERPRISE CO",
  "SGA TRADING",
  "SHOPBCD TRADING",
  "SMV ENTERPRISES",
  "SOUTHCOAST MARKETING",
  "ST. CLAIRE GARMENTS AND",
  "SUNCARE TRADING",
  "SUNTREK ENTERPRISES",
  "TAKEZO INDUSTRIAL SUPPLY",
  "TARGET SAFETY PERSONAL",
  "TOP LIFEGEAR MARKETING",
  "TRACMAC MARKETING",
  "TRI MAGNUM INC",
  "TRIBOHSE INDUSTRIAL TRADING",
  "TRI-JAGUAR SAFETY &",
  "TRIPLE A UNIVERSAL SAFETY",
  "TRIPLE K ENTERPRISES",
  "TRUEWORKS HARDWARE CORPORATION",
  "UNI-REAL TRADING CORPORATION",
  "UPRIGHT INDUSTRIAL CHEMICALS",
  "UPSAFE INDUSTRIAL COMPANY INC",
  "U-SAFE SAFETY SPECIALIST CORP.",
  "UYMATIAO TRADING CORPORATION",
  "VERDE MART",
  "VERIDIAN ENTERPRISES",
  "WASHINGTON ENTERPRISES INC.",
  "WELD POWERTOOLS INDUSTRIAL",
  "WORLD SAFETY SUPPLY CENTER INC",
  "YANG CHI TRADING",
  "ZENITH TECHNOLOGY INC.",
  "ZENTECH TRADING",
  "ZERO HAZARD TRADING"
].sort((a, b) => a.localeCompare(b));

// Component para sa distributor dropdown na may search
const DistributorInput = ({ value, onChange, onBlur }) => {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredDistributors, setFilteredDistributors] = useState([]);

  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = DISTRIBUTORS_LIST.filter(d => 
        d.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 15);
      setFilteredDistributors(filtered);
      setShowDropdown(true);
    } else {
      setFilteredDistributors(DISTRIBUTORS_LIST.slice(0, 15));
      setShowDropdown(true);
    }
  }, [searchTerm]);

  const handleSelect = (distributor) => {
    setSearchTerm(distributor);
    onChange({ target: { name: 'distributor_name', value: distributor } });
    setShowDropdown(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    onChange(e);
  };

  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 200);
    if (onBlur) onBlur();
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        name="distributor_name"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={handleBlur}
        placeholder="Type or select distributor..."
        autoComplete="off"
        required
      />
      {showDropdown && filteredDistributors.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '200px',
          overflowY: 'auto',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          {filteredDistributors.map((d, i) => (
            <div
              key={i}
              onClick={() => handleSelect(d)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
                fontSize: '13px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
            >
              {d}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Field component
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
      const res = await api.post('/api/register', data);
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

          {/* Account Info */}
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

          {/* Distributor Information with DROPDOWN */}
          <div className="form-section-title">Distributor Information</div>

          <Field label="Distributor / Company Name" required>
            <DistributorInput 
              value={formData.distributor_name}
              onChange={handleChange}
            />
          </Field>

          {/* Location */}
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