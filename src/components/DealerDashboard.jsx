import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Navbar from './Navbar';
import DealerNewRMA from './DealerNewRMA';
import './DealerDashboard.css';

const API = 'http://localhost:5000/api/dealer';
const STATUS_TEXT = { pending_dealer: 'Pending', pending_authorizer: 'Pending', pending_approver: 'Pending', authorized: 'Authorized', approved: 'Approved', rejected: 'Rejected' };
const STATUS_OPTS = [
  { v: 'all', l: 'All Status' }, { v: 'pending', l: 'Pending' }, { v: 'authorized', l: 'Authorized' },
  { v: 'approved', l: 'Approved' }, { v: 'rejected', l: 'Rejected' }
];

// ✅ FORMAT DATE to DD/MM/YYYY
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// ✅ DOWNLOAD SINGLE RMA as PDF
const downloadRMAPDF = (rma) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text('RMA DETAILS REPORT', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(`RMA Number: ${rma.rma_number}`, 14, 30);
  doc.text(`Status: ${STATUS_TEXT[rma.status] || rma.status}`, 14, 38);
  doc.text(`Date Created: ${formatDate(rma.created_at)}`, 14, 46);
  doc.text(`Last Updated: ${formatDate(rma.updated_at)}`, 14, 54);

  const tableData = [
    ['Filer Name', rma.filer_name || 'N/A'],
    ['Distributor Name', rma.distributor_name || 'N/A'],
    ['Product', rma.product || 'N/A'],
    ['Product Description', rma.product_description || 'N/A'],
    ['Return Type', rma.return_type || 'N/A'],
    ['Reason for Return', rma.reason_for_return || 'N/A'],
    ['Warranty', rma.warranty ? 'Yes' : 'No'],
    ['Work Environment', rma.work_environment || 'N/A'],
    ['PO Number', rma.po_number || 'N/A'],
    ['Sales Invoice Number', rma.sales_invoice_number || 'N/A'],
    ['Shipping Date', formatDate(rma.shipping_date)],
    ['Return Date', formatDate(rma.return_date)],
    ['End User Company', rma.end_user_company || 'N/A'],
    ['End User Location', rma.end_user_location || 'N/A'],
    ['End User Industry', rma.end_user_industry || 'N/A'],
    ['End User Contact', rma.end_user_contact_person || 'N/A'],
    ['Problem Description', rma.problem_description || 'N/A'],
    ['Dealer Comments', rma.dealer_comments || 'None'],
    ['Authorized By', rma.authorized_by || 'N/A'],
    ['Authorized Date', formatDate(rma.authorized_date)],
    ['Return Received By', rma.return_received_by || 'N/A'],
    ['Authorizer Comments', rma.authorizer_comments || 'None'],
    ['Approved By', rma.approved_by || 'N/A'],
    ['Approved Date', formatDate(rma.approved_date)],
    ['Approved With', rma.approved_with || 'N/A'],
    ['Replacement/Credit Note', rma.replacement_order_no || 'N/A'],
    ['Closed Date', formatDate(rma.closed_date)],
    ['Approver Comments', rma.approver_comments || 'None']
  ];

  autoTable(doc, {
    startY: 62,
    head: [['Field', 'Value']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 95], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  doc.save(`RMA_${rma.rma_number}.pdf`);
};

// ✅ DOWNLOAD SINGLE RMA as EXCEL
const downloadRMAExcel = (rma) => {
  const exportData = [{
    'RMA Number': rma.rma_number,
    'Status': STATUS_TEXT[rma.status] || rma.status,
    'Date Created': formatDate(rma.created_at),
    'Last Updated': formatDate(rma.updated_at),
    'Filer Name': rma.filer_name || 'N/A',
    'Distributor Name': rma.distributor_name || 'N/A',
    'Product': rma.product || 'N/A',
    'Product Description': rma.product_description || 'N/A',
    'Return Type': rma.return_type || 'N/A',
    'Reason for Return': rma.reason_for_return || 'N/A',
    'Warranty': rma.warranty ? 'Yes' : 'No',
    'Work Environment': rma.work_environment || 'N/A',
    'PO Number': rma.po_number || 'N/A',
    'Sales Invoice Number': rma.sales_invoice_number || 'N/A',
    'Shipping Date': formatDate(rma.shipping_date),
    'Return Date': formatDate(rma.return_date),
    'End User Company': rma.end_user_company || 'N/A',
    'End User Location': rma.end_user_location || 'N/A',
    'End User Industry': rma.end_user_industry || 'N/A',
    'End User Contact Person': rma.end_user_contact_person || 'N/A',
    'Problem Description': rma.problem_description || 'N/A',
    'Dealer Comments': rma.dealer_comments || 'None',
    'Authorized By': rma.authorized_by || 'N/A',
    'Authorized Date': formatDate(rma.authorized_date),
    'Return Received By': rma.return_received_by || 'N/A',
    'Authorizer Comments': rma.authorizer_comments || 'None',
    'Approved By': rma.approved_by || 'N/A',
    'Approved Date': formatDate(rma.approved_date),
    'Approved With': rma.approved_with || 'N/A',
    'Replacement/Credit Note': rma.replacement_order_no || 'N/A',
    'Closed Date': formatDate(rma.closed_date),
    'Approver Comments': rma.approver_comments || 'None'
  }];

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'RMA Details');
  XLSX.writeFile(wb, `RMA_${rma.rma_number}.xlsx`);
};

const parseAtts = a => !a ? [] : Array.isArray(a) ? a : (typeof a === 'string' ? (JSON.parse(a) || []) : []);
const getStatusTxt = s => STATUS_TEXT[s] || s;
const StatusBadge = ({ s }) => <span className={`dd-badge dd-badge-${s}`}>{getStatusTxt(s)}</span>;

function DealerDashboard({ user, onLogout }) {
  const [view, setView] = useState('my-rmas');
  const [rmas, setRmas] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, authorized: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [cancellingId, setCancellingId] = useState(null);
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [updatedIds, setUpdatedIds] = useState([]);
  const [lastFetch, setLastFetch] = useState(Date.now());
  const [dealerProfile, setDealerProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const prevRmasRef = useRef([]);
  const VIEWED_KEY = `viewed_updates_${user?.id}`;

  useEffect(() => { if (!user?.id) return; const ids = JSON.parse(localStorage.getItem(VIEWED_KEY) || '[]'); setUpdatedIds(ids); setNotifCount(ids.length); }, [user?.id]);
  useEffect(() => { document.title = notifCount > 0 ? `(${notifCount}) Dealer Dashboard` : 'Dealer Dashboard'; }, [notifCount]);
  useEffect(() => { if (user?.id) localStorage.setItem(VIEWED_KEY, JSON.stringify(updatedIds)); }, [updatedIds, user?.id]);
  useEffect(() => { if (toast.show) { const t = setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000); return () => clearTimeout(t); } }, [toast.show]);
  useEffect(() => { fetchRMAs(); fetchProfile(); const iv = setInterval(fetchRMAs, 10000); return () => clearInterval(iv); }, [user.id]);
  useEffect(() => { filterRMAs(); }, [rmas, search, statusFilter]);
  useEffect(() => { if ('Notification' in window && Notification.permission !== 'denied') Notification.requestPermission(); }, []);

  const showToast = (message, type) => setToast({ show: true, message, type });
  const markAsRead = id => { setUpdatedIds(p => p.filter(i => i !== id)); setNotifCount(p => Math.max(0, p - 1)); };
  const clearNotifs = () => { setUpdatedIds([]); setNotifCount(0); setShowNotifs(false); };
  const isUpdated = id => updatedIds.includes(id);
  const handleView = rma => {
    markAsRead(rma.id);
    setSelected({
      ...rma,
      attachments: parseAtts(rma.attachments),
      authorizer_attachments: parseAtts(rma.authorizer_attachments),
      approver_attachments: parseAtts(rma.approver_attachments)
    });
  };
  const closeModal = () => setSelected(null);

  const fetchProfile = async () => {
    try { const r = await axios.get(`${API}/profile/${user.id}`); setDealerProfile(r.data.profile); } catch (e) { }
  };

  const fetchRMAs = async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/rma/my-requests/${user.id}`);
      const parsed = (res.data.rmas || []).map(r => ({ ...r, attachments: parseAtts(r.attachments), authorizer_attachments: parseAtts(r.authorizer_attachments) }));
      const viewedIds = JSON.parse(localStorage.getItem(VIEWED_KEY) || '[]');
      const newUpd = prevRmasRef.current.length > 0
        ? parsed.filter(r => { const o = prevRmasRef.current.find(x => x.id === r.id); return o && o.status !== r.status && !viewedIds.includes(r.id); }).map(r => r.id)
        : [];
      setRmas(parsed);
      prevRmasRef.current = JSON.parse(JSON.stringify(parsed));
      setLastFetch(Date.now());
      if (newUpd.length) {
        setUpdatedIds(p => [...new Set([...p, ...newUpd])]);
        setNotifCount(p => p + newUpd.length);
        if (Notification.permission === 'granted') newUpd.forEach(id => { const r = parsed.find(x => x.id === id); if (r) new Notification('RMA Status Updated', { body: `RMA ${r.rma_number} → ${getStatusTxt(r.status)}` }); });
        showToast(`Status updated for ${newUpd.length} RMA(s)!`, 'info');
      }
      const isPending = r => ['pending_dealer', 'pending_authorizer', 'pending_approver'].includes(r.status);
      setStats({
        total: parsed.length,
        pending: parsed.filter(isPending).length,
        authorized: parsed.filter(r => r.status === 'authorized').length,
        approved: parsed.filter(r => r.status === 'approved').length,
        rejected: parsed.filter(r => r.status === 'rejected').length
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const filterRMAs = () => {
    let f = [...rmas];
    if (search) f = f.filter(r => [r.rma_number, r.product_description, r.reason_for_return].some(v => (v || '').toLowerCase().includes(search.toLowerCase())));
    if (statusFilter === 'pending') f = f.filter(r => ['pending_dealer', 'pending_authorizer', 'pending_approver'].includes(r.status));
    else if (statusFilter !== 'all') f = f.filter(r => r.status === statusFilter);
    setFiltered(f);
  };

  const handleCancel = async id => {
    if (!window.confirm('Cancel this RMA request? This cannot be undone.')) return;
    setCancellingId(id);
    try { await axios.delete(`${API}/rma/delete/${id}/${user.id}`); showToast('RMA cancelled.', 'success'); fetchRMAs(); }
    catch (e) { showToast(e.response?.data?.error || 'Failed to cancel', 'error'); }
    finally { setCancellingId(null); }
  };

  const exportToExcel = () => {
    try {
      const data = filtered.map(r => ({
        'RMA Number': r.rma_number,
        'Date': formatDate(r.created_at),
        'Status': getStatusTxt(r.status),
        'Return Type': r.return_type || '',
        'Reason': r.reason_for_return || '',
        'Warranty': r.warranty ? 'Yes' : 'No',
        'Product': r.product || '',
        'Description': r.product_description || '',
        'End User Company': r.end_user_company || '',
        'End User Location': r.end_user_location || '',
        'Problem': r.problem_description || '',
        'Dealer Comments': r.dealer_comments || ''
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'My RMA Requests');
      XLSX.writeFile(wb, `RMA_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Export successful!', 'success');
    } catch (e) { showToast('Export failed', 'error'); }
  };

  const AttachmentBlock = ({ atts, label, cls }) => !atts?.length ? null : (
    <div className="dd-attach-block">
      <div className={`dd-attach-label ${cls}`}>{label}</div>
      <div className="dd-attach-grid">
        {atts.map((a, i) => (
          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
            {a.resource_type === 'image' ? <img src={a.url} alt="" className="dd-att-img" /> : <video src={a.url} controls className="dd-att-video" />}
          </a>
        ))}
      </div>
    </div>
  );

  const STAT_CARDS = [
    { label: 'Total RMAs', value: stats.total, accent: '#1e3a5f', filter: null },
    { label: 'Pending', value: stats.pending, accent: '#f59e0b', filter: 'pending' },
    { label: 'Authorized', value: stats.authorized, accent: '#10b981', filter: 'authorized' },
    { label: 'Approved', value: stats.approved, accent: '#06b6d4', filter: 'approved' },
    { label: 'Rejected', value: stats.rejected, accent: '#ef4444', filter: 'rejected' },
  ];

  return (
    <div className="dd-root">
      <Navbar user={user} onLogout={onLogout} title="Dealer Dashboard" />

      {toast.show && (
        <div className={`dd-toast dd-toast-${toast.type}`}>
          <span className="dd-toast-icon">{toast.type === 'success' ? '✓' : toast.type === 'info' ? 'i' : '!'}</span>
          <span>{toast.message}</span>
          <button onClick={() => setToast({ show: false, message: '', type: '' })}>×</button>
        </div>
      )}

      <div className="dd-container">
        {/* Top Bar */}
        <div className="dd-topbar">
          <span className="dd-lastupdated">
            Last updated: {new Date(lastFetch).toLocaleTimeString()}
            {refreshing && <span className="dd-refreshing">Refreshing…</span>}
          </span>
          <div className="dd-topbar-right">
            <div className="dd-notif-wrap">
              <button className="dd-notif-btn" onClick={() => setShowNotifs(!showNotifs)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                {notifCount > 0 && <span className="dd-notif-badge">{notifCount}</span>}
              </button>
              {showNotifs && (
                <div className="dd-notif-drop">
                  <div className="dd-notif-head">Status Updates <button onClick={clearNotifs}>Clear all</button></div>
                  {updatedIds.length === 0 ? <div className="dd-notif-empty">No new updates</div>
                    : rmas.filter(r => updatedIds.includes(r.id)).map(r => (
                      <div key={r.id} className="dd-notif-item" onClick={() => { handleView(r); setShowNotifs(false); }}>
                        <div className="dd-notif-rma">{r.rma_number}</div>
                        <div className="dd-notif-status">{getStatusTxt(r.status)}</div>
                        <div className="dd-notif-time">{new Date(r.updated_at).toLocaleString()}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <button className="dd-btn-refresh" onClick={fetchRMAs}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="dd-stats-row">
          {STAT_CARDS.map((s, i) => (
            <div className={`dd-stat-card${s.filter ? '  dd-stat-clickable' : ''}`} key={i} onClick={() => s.filter && setStatusFilter(s.filter)}>
              <div className="dd-stat-accent" style={{ backgroundColor: s.accent }} />
              <div className="dd-stat-label">{s.label}</div>
              <div className="dd-stat-value" style={{ color: s.accent }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filter Pills */}
        <div className="dd-pills">
          {[
            { v: 'all', l: `All (${stats.total})`, ac: '#1e3a5f' },
            { v: 'pending', l: `Pending (${stats.pending})`, ac: '#f59e0b' },
            { v: 'authorized', l: `Authorized (${stats.authorized})`, ac: '#10b981' },
            { v: 'approved', l: `Approved (${stats.approved})`, ac: '#06b6d4' },
            { v: 'rejected', l: `Rejected (${stats.rejected})`, ac: '#ef4444' }
          ].map(p => (
            <button key={p.v} className={`dd-pill${statusFilter === p.v ? ' active' : ''}`} style={statusFilter === p.v ? { background: p.ac, borderColor: p.ac, color: 'white' } : {}} onClick={() => setStatusFilter(p.v)}>{p.l}</button>
          ))}
        </div>

        {/* Tabs */}
        <div className="dd-tab-bar">
          <button className={`dd-tab-btn${view === 'my-rmas' ? ' active' : ''}`} onClick={() => setView('my-rmas')}>My RMA Requests</button>
          <button className={`dd-tab-btn${view === 'new' ? ' active' : ''}`} onClick={() => setView('new')}>+ New RMA Request</button>
        </div>

        {/* New RMA */}
        {view === 'new' && <DealerNewRMA dealerId={user.id} onSuccess={() => { setView('my-rmas'); fetchRMAs(); }} dealerProfile={dealerProfile} />}

        {/* My RMAs */}
        {view === 'my-rmas' && (
          <div className="dd-panel">
            <div className="dd-panel-head">
              <span className="dd-panel-title">My RMA Requests</span>
              <div className="dd-panel-actions">
                <div className="dd-search-wrap">
                  <svg className="dd-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input className="dd-search" placeholder="Search RMA, product, reason…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="dd-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  {STATUS_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <button className="dd-btn-ghost" onClick={() => { setSearch(''); setStatusFilter('all'); }}>Clear</button>
                <button className="dd-btn-excel" onClick={exportToExcel}>Export Excel</button>
              </div>
            </div>
            <div className="dd-result-count">Showing {filtered.length} of {rmas.length} requests</div>

            {loading ? <div className="dd-empty">Loading…</div>
              : filtered.length === 0 ? <div className="dd-empty">No RMA requests found.</div>
                : (
                  <div className="dd-table-wrap">
                    <table className="dd-table">
                      <thead>
                        <tr><th>RMA Number</th><th>Date</th><th>Product</th><th>Status</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {filtered.map(r => (
                          <tr key={r.id} className={isUpdated(r.id) ? 'dd-row-updated' : ''}>
                            <td className="dd-td-rma">{r.rma_number}{isUpdated(r.id) && <span className="dd-new-badge">UPDATED</span>}</td>
                            <td>{formatDate(r.created_at)}</td>
                            <td className="dd-td-trunc">{(r.product_description || '').substring(0, 40)}{r.product_description?.length > 40 ? '…' : ''}</td>
                            <td><StatusBadge s={r.status} /></td>
                            <td>
                              <div className="dd-action-btns">
                                <button className="dd-btn-action dd-btn-view" onClick={() => handleView(r)}>View</button>
                                {['pending_dealer', 'pending_authorizer'].includes(r.status) && (
                                  <button className="dd-btn-action dd-btn-cancel" onClick={() => handleCancel(r.id)} disabled={cancellingId === r.id}>
                                    {cancellingId === r.id ? '…' : 'Cancel'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
          </div>
        )}
      </div>

      {/* View Modal with EXPORT buttons */}
      {selected && (
        <div className="dd-overlay" onClick={closeModal}>
          <div className="dd-modal" onClick={e => e.stopPropagation()}>
            <div className="dd-modal-head">
              <h2>RMA Details — {selected.rma_number}</h2>
              <button className="dd-modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="dd-meta">
              <div><StatusBadge s={selected.status} /></div>
              <div><strong>Created:</strong> {formatDate(selected.created_at)}</div>
              <div><strong>Updated:</strong> {formatDate(selected.updated_at)}</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button className="dd-btn-excel" onClick={() => downloadRMAExcel(selected)} style={{ padding: '4px 12px', fontSize: '11px' }}>📎 Excel</button>
                <button className="dd-btn-excel" onClick={() => downloadRMAPDF(selected)} style={{ padding: '4px 12px', fontSize: '11px', background: '#fef3f2', borderColor: '#fecdc9', color: '#c2410c' }}>📄 PDF</button>
              </div>
            </div>
            <div className="dd-section">
              <div className="dd-section-title">Filer Information</div>
              <div className="dd-grid-3">
                <div><span>Filer Name</span>{selected.filer_name || 'N/A'}</div>
                <div><span>Distributor</span>{selected.distributor_name || 'N/A'}</div>
                <div><span>Date Filled</span>{formatDate(selected.date_filled)}</div>
              </div>
            </div>
            <div className="dd-section">
              <div className="dd-section-title">Return Merchandise Authorization</div>
              <div className="dd-grid-2">
                <div><span>Product</span>{selected.product || 'N/A'}</div>
                <div><span>Description</span>{selected.product_description || 'N/A'}</div>
                <div><span>Return Type</span>{selected.return_type || 'N/A'}</div>
                <div><span>Reason</span>{selected.reason_for_return || 'N/A'}</div>
                <div><span>Warranty</span>{selected.warranty ? 'Yes' : 'No'}</div>
                <div><span>Work Environment</span>{selected.work_environment || 'N/A'}</div>
                <div><span>PO Number</span>{selected.po_number || 'N/A'}</div>
                <div><span>Sales Invoice</span>{selected.sales_invoice_number || 'N/A'}</div>
                <div><span>Shipping Date</span>{formatDate(selected.shipping_date)}</div>
                <div><span>Return Date</span>{formatDate(selected.return_date)}</div>
              </div>
              <AttachmentBlock atts={selected.attachments} label="Dealer Attachments" cls="dd-cls-blue" />
            </div>
            <div className="dd-section">
              <div className="dd-section-title">End User Details</div>
              <div className="dd-grid-2">
                <div><span>Company</span>{selected.end_user_company || 'N/A'}</div>
                <div><span>Location</span>{selected.end_user_location || 'N/A'}</div>
                <div><span>Industry</span>{selected.end_user_industry || 'N/A'}</div>
                <div><span>Contact</span>{selected.end_user_contact_person || 'N/A'}</div>
              </div>
            </div>
            <div className="dd-section">
              <div className="dd-section-title">Problem & Comments</div>
              <div className="dd-prose">
                <p><strong>Problem Description</strong><br />{selected.problem_description || 'N/A'}</p>
                <p><strong>Dealer Comments</strong><br />{selected.dealer_comments || 'None'}</p>
              </div>
            </div>
            {selected.authorized_by && (
              <div className="dd-section">
                <div className="dd-section-title dd-cls-pink">Authorization Details</div>
                <div className="dd-grid-2">
                  <div><span>Authorized By</span>{selected.authorized_by}</div>
                  <div><span>Authorized Date</span>{formatDate(selected.authorized_date)}</div>
                  <div><span>Return Received By</span>{selected.return_received_by || 'N/A'}</div>
                  <div><span>Comments</span>{selected.authorizer_comments || 'None'}</div>
                </div>
                <AttachmentBlock atts={selected.authorizer_attachments} label="Authorizer Attachments" cls="dd-cls-pink" />
              </div>
            )}
            {selected.approved_by && (
              <div className="dd-section">
                <div className="dd-section-title dd-cls-green">Approval Details</div>
                <div className="dd-grid-2">
                  <div><span>Approved By</span>{selected.approved_by}</div>
                  <div><span>Approved Date</span>{formatDate(selected.approved_date)}</div>
                  <div><span>Approved With</span>{selected.approved_with || 'N/A'}</div>
                  <div><span>Replacement / Credit Note</span>{selected.replacement_order_no || 'N/A'}</div>
                  <div><span>Closed Date</span>{formatDate(selected.closed_date)}</div>
                  <div><span>Comments</span>{selected.approver_comments || 'None'}</div>
                </div>
                <AttachmentBlock atts={selected.approver_attachments} label="Approver Attachments" cls="dd-cls-green" />
              </div>
            )}
            <div className="dd-modal-foot">
              {['pending_dealer', 'pending_authorizer'].includes(selected.status) && (
                <button className="dd-btn-cancel-cta" onClick={() => { handleCancel(selected.id); closeModal(); }}>Cancel Request</button>
              )}
              <button className="dd-btn-primary" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DealerDashboard;