import { useState, useEffect } from 'react';
import axios from 'axios';
import locationData from '../data/philippine_locations.json';
import './DealerNewRMA.css';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const RETURN_TYPES = ['Return Only','Return for Credit','Return for Exchange'];
const REASONS = {
  'Return Only': ['Recall - DPP Initiated Returns'],
  'Return for Credit': ['Cancelled by End User - Quality Issues','Cancelled by End User - Out of the box Issues','Cancelled by End User - Missing Items','Cancelled by End User - Lead Time','Cancelled by End User - MoQ','Cancelled by Dealer - Over quantity','Cancelled by Dealer - Time constraints','Cancelled by Dealer - Project constraints','Cancelled by Dealer - Price constraints','Cancelled by Dealer - Financial Constraints','Cancelled by DPP - DPP Error'],
  'Return for Exchange': ['Incorrect item ordered','Incorrect size ordered','Incorrect color ordered','DPP - Incorrect item delivered','DPP - Incorrect size delivered','DPP - Incorrect color delivered','Damaged','Manufacturing Defects','Others']
};
const PRODUCTS = ['hardhat','eyewear','earmuff','earplug','mask/respirator/gloves','workwear','technical wear (HiViz, Thermal, Jackets, etc.)','safety shoes','fall protection','others'];
const REQUIRED  = ['filer_name','distributor_name','product','product_description','end_user_company','end_user_location','end_user_contact_person','problem_description'];

const dispVal = v => (v===undefined||v===null||v==='')?'—':(typeof v==='boolean'?( v?'Yes':'No'):v);

const Field = ({label, req, children}) => (
  <div className="dnr-field">
    <label className="dnr-label">{label}{req&&<span className="dnr-req">*</span>}</label>
    {children}
  </div>
);

// ✅ GET FILE ICON based on file type
const getFileIcon = (fileType) => {
  if (fileType?.startsWith('image/')) return '🖼️';
  if (fileType?.startsWith('video/')) return '🎥';
  if (fileType === 'application/pdf') return '📄';
  if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
  if (fileType?.includes('sheet') || fileType?.includes('excel')) return '📊';
  if (fileType?.includes('zip') || fileType?.includes('rar')) return '🗜️';
  return '📎';
};

function DealerNewRMA({ dealerId, onSuccess, dealerProfile }) {
  const [form, setForm] = useState({
    dealer_id: dealerId,
    return_type: 'Return Only',
    reason_for_return: 'Recall - DPP Initiated Returns',
    warranty: true,
    filer_name: '',
    distributor_name: '',
    date_filled: new Date().toISOString().split('T')[0],
    product: '',
    product_description: '',
    work_environment: '',
    po_number: '',
    sales_invoice_number: '',
    shipping_date: '',
    return_date: '',
    end_user_company: '',
    end_user_location: '',
    end_user_industry: '',
    end_user_contact_person: '',
    end_user_region_code: '',
    end_user_region: '',
    end_user_province_code: '',
    end_user_province: '',
    end_user_city_code: '',
    end_user_city: '',
    end_user_barangay_code: '',
    end_user_barangay: '',
    problem_description: '',
    dealer_comments: '',
    other_reason: ''
  });
  
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  
  const [attachments, setAttachments] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Load regions
  useEffect(() => {
    const list = Object.keys(locationData).map(code => ({
      code: code,
      name: locationData[code].region_name
    }));
    list.sort((a, b) => a.name.localeCompare(b.name));
    setRegions(list);
  }, []);

  // Auto-fill distributor name from dealer profile
  useEffect(() => {
    if (dealerProfile?.company_name) {
      setForm(p => ({ ...p, distributor_name: dealerProfile.company_name }));
    }
  }, [dealerProfile]);

  // Auto-hide toast
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (message, type) => setToast({ show: true, message, type });
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ✅ LOCATION HANDLERS - build full address
  const handleRegionChange = (e) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex]?.text || '';
    const provinceList = code ? Object.keys(locationData[code].province_list).map(n => ({ code: n, name: n })).sort((a, b) => a.name.localeCompare(b.name)) : [];
    setProvinces(provinceList);
    setCities([]);
    setBarangays([]);
    setForm(p => ({
      ...p,
      end_user_region_code: code,
      end_user_region: name,
      end_user_province_code: '',
      end_user_province: '',
      end_user_city_code: '',
      end_user_city: '',
      end_user_barangay_code: '',
      end_user_barangay: '',
      end_user_location: name
    }));
  };

  const handleProvinceChange = (e) => {
    const name = e.target.value;
    if (!name || !form.end_user_region_code) return;
    const cityList = Object.keys(locationData[form.end_user_region_code].province_list[name].municipality_list)
      .map(n => ({ code: n, name: n }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setCities(cityList);
    setBarangays([]);
    setForm(p => ({
      ...p,
      end_user_province_code: name,
      end_user_province: name,
      end_user_city_code: '',
      end_user_city: '',
      end_user_barangay_code: '',
      end_user_barangay: '',
      end_user_location: `${name}, ${p.end_user_region}`
    }));
  };

  const handleCityChange = (e) => {
    const name = e.target.value;
    if (!name || !form.end_user_region_code || !form.end_user_province_code) return;
    const barangayList = locationData[form.end_user_region_code].province_list[form.end_user_province_code].municipality_list[name].barangay_list
      .map(n => ({ code: n, name: n }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setBarangays(barangayList);
    setForm(p => ({
      ...p,
      end_user_city_code: name,
      end_user_city: name,
      end_user_barangay_code: '',
      end_user_barangay: '',
      end_user_location: `${name}, ${p.end_user_province}, ${p.end_user_region}`
    }));
  };

  const handleBarangayChange = (e) => {
    const name = e.target.value;
    setForm(p => ({
      ...p,
      end_user_barangay_code: name,
      end_user_barangay: name,
      end_user_location: `${name}, ${p.end_user_city}, ${p.end_user_province}, ${p.end_user_region}`
    }));
  };

  const handleReturnTypeChange = e => {
    const rt = e.target.value;
    setForm(p => ({ ...p, return_type: rt, reason_for_return: REASONS[rt][0], other_reason: '' }));
    setShowOther(false);
  };
  
  const handleReasonChange = e => {
    const r = e.target.value;
    setField('reason_for_return', r);
    setShowOther(r === 'Others');
    if (r !== 'Others') setField('other_reason', '');
  };

  // ✅ HANDLE FILE CHANGE - supports all file types
  const handleFileChange = e => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(p => [...p, {
          type: file.type,
          url: reader.result,
          name: file.name,
          size: file.size,
          original_filename: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
    
    setAttachments(p => [...p, ...files]);
  };

  const removeFile = i => {
    setAttachments(p => p.filter((_, j) => j !== i));
    setPreviews(p => p.filter((_, j) => j !== i));
  };

  const handleSubmitClick = e => {
    e.preventDefault();
    for (const f of REQUIRED) {
      if (!form[f]) {
        showToast(`${f.replace(/_/g, ' ')} is required`, 'error');
        return;
      }
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setLoading(true);
    const fd = new FormData();
    const fields = [
        'dealer_id', 'return_type', 'reason_for_return', 'warranty',
        'filer_name', 'distributor_name', 'date_filled', 'product', 'product_description',
        'work_environment', 'po_number', 'sales_invoice_number',
        'shipping_date', 'return_date', 'end_user_company', 'end_user_location',
        'end_user_industry', 'end_user_contact_person', 'problem_description', 'dealer_comments'
    ];
    
    fields.forEach(k => {
        let v = form[k];
        if (k === 'reason_for_return' && v === 'Others') v = form.other_reason;
        if (v !== undefined && v !== null && v !== '') fd.append(k, v);
    });
    
    // ✅ MAG-SEND NG ORIGINAL FILENAMES
    const originalNames = attachments.map(f => f.name);
    fd.append('attachment_names', JSON.stringify(originalNames));
    
    attachments.forEach(f => fd.append('attachments', f));
    
    try {
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const res = await axios.post(`${API_BASE_URL}/api/dealer/rma/create`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast(res.data.message, 'success');
        setTimeout(() => onSuccess(), 1500);
    } catch (e) {
        showToast(e.response?.data?.error || 'Failed to create RMA', 'error');
    } finally {
        setLoading(false);
    }
};

  // Preview renderer for different file types
  const renderPreview = (p, i) => {
    if (p.type?.startsWith('image/')) {
      return <img src={p.url} alt="preview" className="dnr-preview-img" />;
    }
    if (p.type?.startsWith('video/')) {
      return <video src={p.url} controls className="dnr-preview-video" />;
    }
    // Document preview (PDF, Word, Excel, etc.)
    return (
      <div className="dnr-preview-file-box">
        <div className="dnr-preview-icon-large">{getFileIcon(p.type)}</div>
        <div className="dnr-preview-file-name">{p.name?.substring(0, 20)}</div>
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="dnr-preview-link">Open</a>
      </div>
    );
  };

  return (
    <div className="dnr-root">
      {toast.show && (
        <div className={`dnr-toast dnr-toast-${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '!'}</span>
          <span>{toast.message}</span>
          <button onClick={() => setToast({ show: false, message: '', type: '' })}>×</button>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="dnr-overlay" onClick={() => setShowConfirm(false)}>
          <div className="dnr-confirm" onClick={e => e.stopPropagation()}>
            <div className="dnr-confirm-head">
              <h3>Confirm RMA Request</h3>
              <button onClick={() => setShowConfirm(false)}>×</button>
            </div>
            {[
              { title: 'Filer Information', rows: [['Filer Name', form.filer_name], ['Distributor Name', form.distributor_name], ['Date Filled', form.date_filled]] },
              { title: 'Return Merchandise Authorization', rows: [['Return Type', form.return_type], ['Reason', form.reason_for_return === 'Others' ? form.other_reason : form.reason_for_return], ['Warranty', form.warranty], ['Product', form.product], ['Description', form.product_description], ['Work Environment', form.work_environment], ['PO Number', form.po_number], ['Sales Invoice', form.sales_invoice_number], ['Shipping Date', form.shipping_date], ['Return Date', form.return_date]] },
              { title: 'End User Details', rows: [['Company', form.end_user_company], ['Location', form.end_user_location], ['Industry', form.end_user_industry], ['Contact', form.end_user_contact_person]] },
              { title: 'Problem & Comments', rows: [['Problem Description', form.problem_description], ['Additional Comments', form.dealer_comments]] },
            ].map(s => (
              <div className="dnr-confirm-section" key={s.title}>
                <div className="dnr-confirm-title">{s.title}</div>
                <div className="dnr-confirm-grid">
                  {s.rows.map(([l, v]) => <div key={l}><span>{l}</span>{dispVal(v)}</div>)}
                </div>
              </div>
            ))}
            {attachments.length > 0 && (
              <div className="dnr-confirm-section">
                <div className="dnr-confirm-title">Attachments ({attachments.length})</div>
                <div className="dnr-confirm-files">{attachments.map((f, i) => <div key={i}>📎 {f.name}</div>)}</div>
              </div>
            )}
            <div className="dnr-confirm-foot">
              <button className="dnr-btn-ghost-dark" onClick={() => setShowConfirm(false)}>Edit</button>
              <button className="dnr-btn-primary" onClick={handleConfirm} disabled={loading}>{loading ? 'Submitting…' : 'Confirm & Submit'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="dnr-card">
        <div className="dnr-card-head">New RMA Request Form</div>
        <form onSubmit={handleSubmitClick}>

          {/* Filer Info */}
          <div className="dnr-section">
            <div className="dnr-section-title">Filer Information</div>
            <div className="dnr-grid-3">
              <Field label="Filer Name" req>
                <input className="dnr-input" name="filer_name" value={form.filer_name} onChange={e => setField('filer_name', e.target.value)} required />
              </Field>
              <Field label="Distributor Name" req>
                <input className="dnr-input" name="distributor_name" value={form.distributor_name} onChange={e => setField('distributor_name', e.target.value)} required readOnly={!!dealerProfile?.company_name} />
              </Field>
              <Field label="Date Filled" req>
                <input className="dnr-input dnr-input-disabled" type="date" value={form.date_filled} disabled />
              </Field>
            </div>
          </div>

          {/* RMA */}
          <div className="dnr-section">
            <div className="dnr-section-title">Return Merchandise Authorization</div>
            <Field label="Return Type" req>
              <select className="dnr-input" value={form.return_type} onChange={handleReturnTypeChange}>
                {RETURN_TYPES.map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Reason for Return" req>
              <select className="dnr-input" value={form.reason_for_return} onChange={handleReasonChange}>
                {REASONS[form.return_type].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            {showOther && (
              <Field label="Please specify your reason" req>
                <input className="dnr-input" value={form.other_reason} onChange={e => setField('other_reason', e.target.value)} placeholder="Type your reason here…" required />
              </Field>
            )}
            <div className="dnr-field">
              <label className="dnr-checkbox-label">
                <input type="checkbox" checked={form.warranty} onChange={e => setField('warranty', e.target.checked)} />
                <span>Under Warranty</span>
              </label>
            </div>
            <div className="dnr-grid-1-2">
              <Field label="Product" req>
                <input className="dnr-input" list="dnr-products" value={form.product} onChange={e => setField('product', e.target.value)} placeholder="Type or select…" autoComplete="off" required />
                <datalist id="dnr-products">{PRODUCTS.map(p => <option key={p} value={p} />)}</datalist>
              </Field>
              <Field label="Product Description" req>
                <input className="dnr-input" value={form.product_description} onChange={e => setField('product_description', e.target.value)} required />
              </Field>
            </div>
            <Field label="Work Environment">
              <input className="dnr-input" value={form.work_environment} onChange={e => setField('work_environment', e.target.value)} />
            </Field>
            <div className="dnr-grid-2">
              <Field label="PO Number">
                <input className="dnr-input" value={form.po_number} onChange={e => setField('po_number', e.target.value)} />
              </Field>
              <Field label="Sales Invoice Number">
                <input className="dnr-input" value={form.sales_invoice_number} onChange={e => setField('sales_invoice_number', e.target.value)} />
              </Field>
              <Field label="Shipping / Delivery Date">
                <input className="dnr-input" type="date" value={form.shipping_date} onChange={e => setField('shipping_date', e.target.value)} />
              </Field>
              <Field label="Return Date">
                <input className="dnr-input" type="date" value={form.return_date} onChange={e => setField('return_date', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* End User Details with LOCATION SELECTOR */}
          <div className="dnr-section">
            <div className="dnr-section-title">End User Details</div>
            
            <div className="dnr-grid-2">
              <Field label="Company Name" req>
                <input className="dnr-input" value={form.end_user_company} onChange={e => setField('end_user_company', e.target.value)} required />
              </Field>
              <Field label="Contact Person" req>
                <input className="dnr-input" value={form.end_user_contact_person} onChange={e => setField('end_user_contact_person', e.target.value)} required />
              </Field>
            </div>
            
            <div className="dnr-grid-2">
              <Field label="Region" req>
                <select className="dnr-input" value={form.end_user_region_code} onChange={handleRegionChange} required>
                  <option value="">Select Region</option>
                  {regions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
              </Field>
              <Field label="Province" req>
                <select className="dnr-input" value={form.end_user_province_code} onChange={handleProvinceChange} required disabled={!form.end_user_region_code}>
                  <option value="">Select Province</option>
                  {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
              </Field>
            </div>
            
            <div className="dnr-grid-2">
              <Field label="City / Municipality" req>
                <select className="dnr-input" value={form.end_user_city_code} onChange={handleCityChange} required disabled={!form.end_user_province_code}>
                  <option value="">Select City</option>
                  {cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Barangay" req>
                <select className="dnr-input" value={form.end_user_barangay_code} onChange={handleBarangayChange} required disabled={!form.end_user_city_code}>
                  <option value="">Select Barangay</option>
                  {barangays.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                </select>
              </Field>
            </div>
            
            {form.end_user_location && (
              <div style={{ marginTop: '12px', padding: '10px 12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '13px', color: '#475569' }}>
                <strong>📍 Full Address:</strong> {form.end_user_location}
              </div>
            )}
            
            <Field label="Industry">
              <input className="dnr-input" value={form.end_user_industry} onChange={e => setField('end_user_industry', e.target.value)} />
            </Field>
          </div>

          {/* ATTACHMENTS - Supports all file types */}
          <div className="dnr-section">
            <div className="dnr-section-title">Attachments (Photos / Videos / Documents)</div>
            <Field label="Upload supporting files">
              <input 
                className="dnr-file" 
                type="file" 
                multiple 
                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                onChange={handleFileChange}
              />
              <small className="dnr-hint">
                Supported files: Images (JPG, PNG, GIF), Videos (MP4, MOV, AVI), PDF, Word, Excel, ZIP. Max 50MB total.
              </small>
            </Field>
            {previews.length > 0 && (
              <div className="dnr-preview-grid">
                {previews.map((p, i) => (
                  <div className="dnr-preview-item" key={i}>
                    {renderPreview(p, i)}
                    <button type="button" className="dnr-preview-remove" onClick={() => removeFile(i)}>×</button>
                    <div className="dnr-preview-name">{p.name?.substring(0, 15)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Problem */}
          <div className="dnr-section">
            <div className="dnr-section-title">Problem Description & Comments</div>
            <Field label="Problem Description" req>
              <textarea className="dnr-input dnr-textarea" name="problem_description" rows="4" value={form.problem_description} onChange={e => setField('problem_description', e.target.value)} required />
            </Field>
            <Field label="Additional Comments">
              <textarea className="dnr-input dnr-textarea" name="dealer_comments" rows="2" value={form.dealer_comments} onChange={e => setField('dealer_comments', e.target.value)} />
            </Field>
          </div>

          <div className="dnr-submit-wrap">
            <button type="submit" className="dnr-btn-submit" disabled={loading}>
              {loading ? 'Submitting…' : 'Review & Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DealerNewRMA;