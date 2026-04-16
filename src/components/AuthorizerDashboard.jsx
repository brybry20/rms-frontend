import { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import Navbar from './Navbar';
import './AdminDashboard.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import logoSrc from '../assets/logo2.png';
import api from '../api';

// ─── Constants ────────────────────────────────────────────────────────────────
const API = '/api/admin';
const TT = { contentStyle: { borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' } };
const STATUS_COLORS = { 
  pending_dealer: '#f59e0b', 
  pending_authorizer: '#f97316', 
  pending_approver: '#8b5cf6', 
  authorized: '#10b981', 
  approved: '#06b6d4', 
  rejected: '#ef4444' 
};
const PIE_COLORS = ['#1e3a5f','#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];
const STATUS_TEXT = { 
  pending_dealer: 'Pending Dealer', 
  pending_authorizer: 'Pending Auth', 
  pending_approver: 'Pending Approver', 
  authorized: 'Authorized', 
  approved: 'Approved', 
  rejected: 'Rejected' 
};
const STATUS_OPTS = [
  { value:'all', label:'All Status' }, 
  { value:'pending_dealer', label:'Pending Dealer' },
  { value:'pending_authorizer', label:'Pending Auth' }, 
  { value:'pending_approver', label:'Pending Approver' },
  { value:'authorized', label:'Authorized' }, 
  { value:'approved', label:'Approved' }, 
  { value:'rejected', label:'Rejected' },
];
const COMPANY = {
  name:'DELTAPLUS PHILIPPINES, INC.', vat:'VAT REG. TIN-009-277-410-00000',
  sub:'Dels Apparel Corporation',
  address:'83 Felix Manalo St., Cubao, Immaculate Concepcion 1111, Quezon City NCR, Second District, Philippines',
  tel:'Tel. Nos.: +63 (2) 8655 7002  |  Fax No. +63 (2) 8655-0772 loc. 107', web:'www.deltaplus.ph',
};

const EDIT_FIELDS = [
  { label:'Status', key:'status', type:'select', opts:[
    {v:'pending_dealer',l:'Pending Dealer'},{v:'pending_authorizer',l:'Pending Authorizer'},
    {v:'pending_approver',l:'Pending Approver'},{v:'authorized',l:'Authorized'},
    {v:'approved',l:'Approved'},{v:'rejected',l:'Rejected'}
  ]},
  { label:'Return Type', key:'return_type', type:'select', opts:[
    {v:'Return Only',l:'Return Only'},{v:'Return for Credit',l:'Return for Credit'},{v:'Return for Exchange',l:'Return for Exchange'}
  ]},
  { label:'Reason for Return', key:'reason_for_return', type:'text' },
  { label:'Warranty', key:'warranty', type:'checkbox' },
  { label:'Filer Name', key:'filer_name', type:'text' },
  { label:'Distributor Name', key:'distributor_name', type:'text' },
  { label:'Product', key:'product', type:'text' },
  { label:'Product Description', key:'product_description', type:'textarea' },
  { label:'Work Environment', key:'work_environment', type:'text' },
  { label:'PO Number', key:'po_number', type:'text' },
  { label:'Sales Invoice Number', key:'sales_invoice_number', type:'text' },
  { label:'Shipping Date', key:'shipping_date', type:'date' },
  { label:'Return Date', key:'return_date', type:'date' },
  { label:'End User Company', key:'end_user_company', type:'text' },
  { label:'End User Location', key:'end_user_location', type:'text' },
  { label:'End User Industry', key:'end_user_industry', type:'text' },
  { label:'End User Contact Person', key:'end_user_contact_person', type:'text' },
  { label:'Problem Description', key:'problem_description', type:'textarea' },
  { label:'Dealer Comments', key:'dealer_comments', type:'textarea' },
  { label:'Authorized By', key:'authorized_by', type:'text' },
  { label:'Authorized Date', key:'authorized_date', type:'date' },
  { label:'Return Received By', key:'return_received_by', type:'text' },
  { label:'Authorizer Comments', key:'authorizer_comments', type:'textarea' },
  { label:'Approved By', key:'approved_by', type:'text' },
  { label:'Approved Date', key:'approved_date', type:'date' },
  { label:'Approved With', key:'approved_with', type:'select', opts:[
    {v:'Replacement Unit',l:'Replacement Unit'},{v:'Store Credit',l:'Store Credit'},{v:'Refund',l:'Refund'},
    {v:'Back Office Mistake - BOM1N',l:'Back Office Mistake (BOM1N)'},{v:'Back Office Mistake - BOM2H',l:'Back Office Mistake (BOM2H)'},
    {v:'Back Office Mistake - BOM3M',l:'Back Office Mistake (BOM3M)'},{v:'Cancelled Order (CO)',l:'Cancelled Order (CO)'},
    {v:'Changed Model (CM)',l:'Changed Model (CM)'},{v:'Changed Size / Color (CH)',l:'Changed Size / Color (CH)'},
    {v:'Damaged Item (D)',l:'Damaged Item (D)'},{v:'Dealer Mistake (DM)',l:'Dealer Mistake (DM)'},
    {v:'Manufacturing Issue (Man)',l:'Manufacturing Issue (Man)'},{v:'Missing Item (MI)',l:'Missing Item (MI)'},
    {v:'Payment Issue (PI)',l:'Payment Issue (PI)'},{v:'Sample Return (SA)',l:'Sample Return (SA)'},
    {v:'Not Received (NR)',l:'Not Received (NR)'},{v:'Not Delivered (ND)',l:'Not Delivered (ND)'},
    {v:'System Error (SE)',l:'System Error (SE)'},{v:'Preparator Mistake (PM)',l:'Preparator Mistake (PM)'},
  ]},
  { label:'Replacement Order / Credit Note No.', key:'replacement_order_no', type:'text' },
  { label:'Closed Date', key:'closed_date', type:'date' },
  { label:'Approver Comments', key:'approver_comments', type:'textarea' },
];

const DEALER_EDIT_FIELDS = [
  { label:'Distributor Name', key:'company_name', type:'text' },
  { label:'Username', key:'username', type:'text' },
  { label:'Email', key:'email', type:'email' },
  { label:'Contact Number', key:'contact_number', type:'tel' },
  { label:'City', key:'city', type:'text' },
  { label:'Barangay', key:'barangay', type:'text' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseAtts = a => !a ? [] : Array.isArray(a) ? a : (typeof a === 'string' ? (JSON.parse(a) || []) : []);
const getStatusTxt = s => STATUS_TEXT[s] || s;
const truncStr = (s, n) => s?.length > n ? s.slice(0, n) + '…' : (s || '');
const countBy = (arr, key) => arr.reduce((a, r) => { const k = r[key] || 'Unknown'; a[k] = (a[k]||0)+1; return a; }, {});
const parseRMA = r => ({ ...r, attachments: parseAtts(r.attachments), authorizer_attachments: parseAtts(r.authorizer_attachments), approver_attachments: parseAtts(r.approver_attachments) });
const fmtDate = d => { if (!d) return 'N/A'; const dt = new Date(d); if (isNaN(dt)) return d; return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`; };
const getFullLocation = (city, barangay) => {
  if (!city && !barangay) return 'N/A';
  if (city && barangay) return `${city}, ${barangay}`;
  return city || barangay || 'N/A';
};

// ─── PDF Export ───────────────────────────────────────────────────────────────
const downloadRMAPDF = async (rma) => {
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const lm = 14, rm = 14;
  let y = 0;

  const drawPageBorder = () => {
    doc.setDrawColor(30,58,95); doc.setLineWidth(0.6); doc.rect(8,8,pw-16,ph-16);
    doc.setLineWidth(0.2); doc.setDrawColor(200,210,220); doc.rect(9.5,9.5,pw-19,ph-19);
  };
  const addPage = () => { doc.addPage(); y = 28; drawPageBorder(); };
  const ensureSpace = (n) => { if (y+n > ph-16) addPage(); };

  drawPageBorder();

  try {
    const img = new Image(); img.src = logoSrc;
    await new Promise(res => { img.onload = res; img.onerror = res; });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 200; canvas.height = img.naturalHeight || 60;
    canvas.getContext('2d').drawImage(img, 0, 0);
    const ratio = canvas.width / canvas.height;
    const lw = Math.min(45, ratio * 18), lh = lw / ratio;
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', lm, 13, lw, lh);
  } catch (_) {}

  y = 35;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(30,58,95);
  doc.text(COMPANY.name, lm, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80,95,115);
  doc.text(COMPANY.vat, lm, y); y += 4;
  doc.text(COMPANY.sub, lm, y); y += 4;
  doc.text(COMPANY.address, lm, y); y += 4;
  doc.text(COMPANY.tel, lm, y); y += 4;
  doc.setTextColor(37,99,235); doc.text(COMPANY.web, lm, y);

  y += 6;
  doc.setDrawColor(30,58,95); doc.setLineWidth(0.8); doc.line(lm, y, pw-rm, y);
  doc.setLineWidth(0.2); doc.setDrawColor(200,210,230); doc.line(lm, y+1, pw-rm, y+1);

  y += 8;
  doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(30,58,95);
  doc.text('RETURN MERCHANDISE AUTHORIZATION', pw/2, y, { align:'center' });
  y += 5;
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(100,116,139);
  doc.text(`RMA No: ${rma.rma_number}  |  Date: ${fmtDate(rma.created_at)}  |  Status: ${getStatusTxt(rma.status)}`, pw/2, y, { align:'center' });

  y += 4;
  const sColor = STATUS_COLORS[rma.status] || '#6b7280';
  const [r2,g2,b2] = sColor.match(/\w\w/g).map(x => parseInt(x,16));
  doc.setFillColor(r2,g2,b2);
  doc.roundedRect(pw/2-19, y, 38, 5.5, 2.5, 2.5, 'F');
  doc.setTextColor(255,255,255); doc.setFontSize(7); doc.setFont('helvetica','bold');
  doc.text(getStatusTxt(rma.status).toUpperCase(), pw/2, y+3.8, { align:'center' });

  y += 10;
  const sectionTitle = title => {
    ensureSpace(12);
    doc.setFillColor(30,58,95); doc.roundedRect(lm, y, pw-lm-rm, 7, 1, 1, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    doc.text(title.toUpperCase(), lm+4, y+4.8); y += 10;
  };
  const twoCol = pairs => {
    const colW = (pw-lm-rm-6)/2;
    pairs.forEach((pair, i) => {
      if (i%2===0 && i>0) y += 10;
      if (i%2===0) ensureSpace(12);
      const x = i%2===0 ? lm : lm+colW+6;
      doc.setFillColor(241,245,249); doc.roundedRect(x, y, colW, 8.5, 1, 1, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(100,116,139);
      doc.text(pair[0].toUpperCase(), x+3, y+3.2);
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(30,41,59);
      doc.text(doc.splitTextToSize(String(pair[1]||'N/A'), colW-6)[0], x+3, y+7);
    });
    if (pairs.length%2!==0) y += 10;
    y += 11;
  };
  const fullRow = (label, value) => {
    ensureSpace(14);
    doc.setFillColor(241,245,249); doc.roundedRect(lm, y, pw-lm-rm, 11, 1, 1, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(100,116,139);
    doc.text(label.toUpperCase(), lm+3, y+3.5);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(30,41,59);
    doc.splitTextToSize(String(value||'N/A'), pw-lm-rm-6).slice(0,2).forEach((l,i) => doc.text(l, lm+3, y+7.5+i*3.5));
    y += 13;
  };

  sectionTitle('Filer Information');
  twoCol([['Filer Name', rma.filer_name], ['Distributor', rma.distributor_name || rma.company_name]]);

  sectionTitle('Product & Return Details');
  twoCol([
    ['Product', rma.product], ['Return Type', rma.return_type],
    ['Reason for Return', rma.reason_for_return], ['Warranty', rma.warranty ? 'Yes' : 'No'],
    ['Work Environment', rma.work_environment], ['PO Number', rma.po_number],
    ['Sales Invoice No.', rma.sales_invoice_number], ['Shipping Date', rma.shipping_date],
    ['Return Date', rma.return_date],
  ]);
  fullRow('Product Description', rma.product_description);

  sectionTitle('End User Details');
  twoCol([['Company', rma.end_user_company], ['Location', rma.end_user_location], ['Industry', rma.end_user_industry], ['Contact Person', rma.end_user_contact_person]]);

  sectionTitle('Problem & Comments');
  fullRow('Problem Description', rma.problem_description);
  fullRow('Dealer Comments', rma.dealer_comments || 'None');

  if (rma.authorized_by) {
    sectionTitle('Authorization Details');
    twoCol([['Authorized By', rma.authorized_by], ['Authorized Date', fmtDate(rma.authorized_date)], ['Return Received By', rma.return_received_by], ['Authorizer Comments', rma.authorizer_comments || 'None']]);
  }
  if (rma.approved_by) {
    sectionTitle('Approval Details');
    twoCol([['Approved By', rma.approved_by], ['Approved Date', fmtDate(rma.approved_date)], ['Approved With', rma.approved_with], ['Replacement / Credit Note', rma.replacement_order_no], ['Closed Date', fmtDate(rma.closed_date)], ['Approver Comments', rma.approver_comments || 'None']]);
  }

  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(30,58,95); doc.rect(8, ph-14, pw-16, 6, 'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(255,255,255);
    doc.text(`${COMPANY.name}  |  ${COMPANY.web}  |  ${COMPANY.tel}`, pw/2, ph-10, { align:'center' });
    doc.setTextColor(180,195,215);
    doc.text(`Page ${p} of ${totalPages}`, pw-rm, ph-10, { align:'right' });
    doc.text(`Printed: ${new Date().toLocaleString('en-PH')}`, lm, ph-10);
  }
  doc.save(`RMA_${rma.rma_number}.pdf`);
};

// ─── Excel / CSV Export ───────────────────────────────────────────────────────
const downloadRMAExcel = (rma) => {
  const data = [{ 
    'RMA Number': rma.rma_number, 
    'Status': getStatusTxt(rma.status), 
    'Date Created': fmtDate(rma.created_at), 
    'Last Updated': fmtDate(rma.updated_at), 
    'Filer Name': rma.filer_name || 'N/A', 
    'Distributor': rma.distributor_name || rma.company_name || 'N/A', 
    'Product': rma.product || 'N/A', 
    'Product Description': rma.product_description || 'N/A', 
    'Return Type': rma.return_type || 'N/A', 
    'Reason': rma.reason_for_return || 'N/A', 
    'Warranty': rma.warranty ? 'Yes' : 'No', 
    'Work Environment': rma.work_environment || 'N/A', 
    'PO Number': rma.po_number || 'N/A', 
    'Sales Invoice': rma.sales_invoice_number || 'N/A', 
    'Shipping Date': fmtDate(rma.shipping_date), 
    'Return Date': fmtDate(rma.return_date), 
    'End User Company': rma.end_user_company || 'N/A', 
    'Location': rma.end_user_location || 'N/A', 
    'Industry': rma.end_user_industry || 'N/A', 
    'Contact Person': rma.end_user_contact_person || 'N/A', 
    'Problem Description': rma.problem_description || 'N/A', 
    'Dealer Comments': rma.dealer_comments || 'None', 
    'Authorized By': rma.authorized_by || 'N/A', 
    'Authorized Date': fmtDate(rma.authorized_date), 
    'Return Received By': rma.return_received_by || 'N/A', 
    'Authorizer Comments': rma.authorizer_comments || 'None', 
    'Approved By': rma.approved_by || 'N/A', 
    'Approved Date': fmtDate(rma.approved_date), 
    'Approved With': rma.approved_with || 'N/A', 
    'Replacement / Credit Note': rma.replacement_order_no || 'N/A', 
    'Closed Date': fmtDate(rma.closed_date), 
    'Approver Comments': rma.approver_comments || 'None' 
  }];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'RMA Details');
  XLSX.writeFile(wb, `RMA_${rma.rma_number}.xlsx`);
};

const csvExport = (data, filename) => {
  if (!data.length) return;
  const h = Object.keys(data[0]);
  const csv = [h.join(','), ...data.map(r => h.map(k => `"${String(r[k]??'').replace(/"/g,'""')}"`).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
};

// ─── Chart Builder ────────────────────────────────────────────────────────────
const buildCharts = (rmas) => {
  const monthly = Object.entries(rmas.reduce((a, r) => { const k = r.created_at?.slice(0,7); if (k) a[k] = (a[k]||0)+1; return a; }, {})).sort().slice(-6).map(([month, count]) => ({ month, count }));
  const monthlyApproval = Object.entries(rmas.reduce((a, r) => { const k = r.created_at?.slice(0,7); if (!k) return a; if (!a[k]) a[k] = { month: k, approved: 0, rejected: 0 }; if (r.status === 'approved') a[k].approved++; if (r.status === 'rejected') a[k].rejected++; return a; }, {})).sort().slice(-6).map(([, v]) => v);
  const avgResolution = (() => {
    const m = {};
    rmas.forEach(r => { const k = r.created_at?.slice(0,7); if (!k) return; const end = r.closed_date || r.approved_date; if (!end) return; const d = (new Date(end) - new Date(r.created_at)) / 86400000; if (d < 0 || d > 365) return; if (!m[k]) m[k] = { month: k, total: 0, count: 0 }; m[k].total += d; m[k].count++; });
    return Object.values(m).sort((a, b) => a.month.localeCompare(b.month)).slice(-6).map(({ month, total, count }) => ({ month, avgDays: count ? +(total / count).toFixed(1) : 0 }));
  })();
  const toPie = key => Object.entries(countBy(rmas, key)).map(([name, value]) => ({ name, value }));
  const toBar = (key, n = 8) => Object.entries(countBy(rmas, key)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name: truncStr(name, 18), count }));
  const toBarV = (key, n = 8) => Object.entries(countBy(rmas, key)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, value]) => ({ name: truncStr(name, 20), value }));
  const splitLoc = (rmas, idx) => Object.entries(rmas.reduce((a, r) => { const p = (r.end_user_location || '').split(',').map(s => s.trim())[idx]; if (p) a[p] = (a[p]||0)+1; return a; }, {})).map(([name, count]) => ({ name: truncStr(name, 20), count })).sort((a, b) => b.count - a.count).slice(0, 10);
  return {
    monthly, monthlyApproval, avgResolution,
    returnType: toPie('return_type'), approvedWith: toPie('approved_with'), workEnv: toPie('work_environment'),
    topDealers: toBar('distributor_name'), industry: toBar('end_user_industry'), products: toBarV('product'),
    warranty: [{ name: 'Under Warranty', value: rmas.filter(r => r.warranty).length }, { name: 'Out of Warranty', value: rmas.filter(r => !r.warranty).length }],
    regionData: splitLoc(rmas, 0), cityData: splitLoc(rmas, 1), barangayData: splitLoc(rmas, 2),
  };
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatusBadge = ({ s }) => {
  let statusClass = '';
  if (s === 'approved') statusClass = 'status-approved';
  else if (s === 'pending_dealer') statusClass = 'status-pending_dealer';
  else if (s === 'pending_authorizer') statusClass = 'status-pending_authorizer';
  else if (s === 'pending_approver') statusClass = 'status-pending_approver';
  else if (s === 'authorized') statusClass = 'status-authorized';
  else if (s === 'rejected') statusClass = 'status-rejected';
  else statusClass = `status-${s}`;
  
  return <span className={`status-badge ${statusClass}`}>{getStatusTxt(s)}</span>;
};

const ChartCard = ({ title, wide, children }) => (
  <div className={`chart-card${wide ? ' chart-wide' : ''}`}>
    <div className="chart-title">{title}</div>
    {children}
  </div>
);

const MediaViewer = ({ items, startIndex, onClose }) => {
  const [idx, setIdx] = useState(startIndex);
  const mediaItems = items.filter(a => a.resource_type === 'image' || a.resource_type === 'video');
  if (!mediaItems.length) return null;
  const item = mediaItems[idx];
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, mediaItems.length - 1)); if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0)); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [mediaItems.length, onClose]);
  return (
    <div className="viewer-overlay" onClick={onClose}>
      <div className="viewer-box" onClick={e => e.stopPropagation()}>
        <div className="viewer-header">
          <span className="viewer-counter">{idx + 1} / {mediaItems.length}</span>
          <div className="viewer-actions">
            <a href={item?.url} download target="_blank" rel="noopener noreferrer" className="viewer-btn">↓ Download</a>
            <button className="viewer-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="viewer-media">
          {item?.resource_type === 'image' ? <img src={item.url} alt="" className="viewer-img" /> : <video src={item?.url} controls className="viewer-video" />}
        </div>
        {mediaItems.length > 1 && (
          <div className="viewer-nav">
            <button className="viewer-nav-btn" disabled={idx === 0} onClick={() => setIdx(i => i - 1)}>← Prev</button>
            <div className="viewer-dots">{mediaItems.map((_, i) => <span key={i} className={`viewer-dot${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)} />)}</div>
            <button className="viewer-nav-btn" disabled={idx === mediaItems.length - 1} onClick={() => setIdx(i => i + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
};

const AttachmentBlock = ({ atts, label, cls }) => {
  const [viewerIdx, setViewerIdx] = useState(null);
  if (!atts?.length) return null;
  const getIcon = (resourceType, url) => resourceType === 'image' ? '🖼️' : resourceType === 'video' ? '🎥' : url?.includes('.pdf') ? '📄' : url?.includes('.doc') ? '📝' : url?.includes('.xls') ? '📊' : '📎';
  const getFallbackName = url => { if (!url) return 'File'; let n = url.split('/').pop(); return n.replace(/^v\d+_/, '').substring(0, 25); };
  const handleDownload = (url, filename) => { const a = document.createElement('a'); a.href = url; a.download = filename || 'download'; document.body.appendChild(a); a.click(); document.body.removeChild(a); };
  return (
    <div className="section-attachments">
      <div className={`attachment-label ${cls}`}>{label}</div>
      <div className="attachment-grid">
        {atts.map((att, index) => {
          const isImage = att.resource_type === 'image', isVideo = att.resource_type === 'video';
          return (
            <div key={index} className="attachment-item">
              {isImage ? (
                <div onClick={() => setViewerIdx(index)} className="attachment-clickable">
                  <img src={att.url} alt="" className="attachment-img" />
                </div>
              ) : isVideo ? (
                <div onClick={() => setViewerIdx(index)} className="attachment-clickable">
                  <div className="attachment-video-thumb">
                    <video src={att.url} className="attachment-video-preview" muted />
                    <div className="attachment-play-icon">▶</div>
                  </div>
                </div>
              ) : (
                <div className="attachment-file-card" onClick={() => handleDownload(att.url, att.original_filename || getFallbackName(att.url))}>
                  <div className="attachment-file-icon">{getIcon(att.resource_type, att.url)}</div>
                  <div className="attachment-file-name">{att.original_filename || getFallbackName(att.url)}</div>
                  <div className="attachment-file-download">⬇ Download</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {viewerIdx !== null && (
        <MediaViewer
          items={atts.filter(a => a.resource_type === 'image' || a.resource_type === 'video')}
          startIndex={atts.filter(a => a.resource_type === 'image' || a.resource_type === 'video').findIndex((_, i) => i === viewerIdx)}
          onClose={() => setViewerIdx(null)}
        />
      )}
    </div>
  );
};

const STAT_CARDS = (rmas, stats, pd) => [
  { label: 'Total RMAs', value: rmas.length, accent: '#1e3a5f' },
  { label: 'Pending Auth', value: stats.status_counts?.pending_authorizer || 0, accent: '#f97316' },
  { label: 'Authorized', value: stats.status_counts?.authorized || 0, accent: '#10b981' },
  { label: 'Approved', value: stats.status_counts?.approved || 0, accent: '#06b6d4' },
  { label: 'Rejected', value: stats.status_counts?.rejected || 0, accent: '#ef4444' },
  { label: 'Total Distributors', value: stats.dealers?.total || 0, accent: '#2563eb' },
  { label: 'Pending Distributors', value: pd.length, accent: '#8b5cf6' },
];

const Section = ({ title, accent, children }) => (
  <div className="detail-section">
    <div className={`detail-section-title${accent ? ` section-${accent}` : ''}`}>{title}</div>
    {children}
  </div>
);
const Grid2 = ({ children }) => <div className="detail-grid-2">{children}</div>;
const Field = ({ label, value }) => <div><span>{label}</span>{value || 'N/A'}</div>;

// ─── Main Component ───────────────────────────────────────────────────────────
function AdminDashboard({ user, onLogout }) {
  const [rmas, setRmas] = useState([]);
  const [filteredRmas, setFilteredRmas] = useState([]);
  const [pendingDealers, setPendingDealers] = useState([]);
  const [allDealers, setAllDealers] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRMA, setSelectedRMA] = useState(null);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [viewMode, setViewMode] = useState('view');
  const [dealerViewMode, setDealerViewMode] = useState('view');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [editData, setEditData] = useState({});
  const [dealerEditData, setDealerEditData] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetch, setLastFetch] = useState(Date.now());
  const [updateBanner, setUpdateBanner] = useState(null);
  const [changePwData, setChangePwData] = useState({ newPassword: '', confirmPassword: '' });
  const [showChangePw, setShowChangePw] = useState(false);
  const prevRmasRef = useRef([]);

  useEffect(() => {
    if (toast.show) { const t = setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000); return () => clearTimeout(t); }
  }, [toast.show]);

  useEffect(() => { fetchAll(); const iv = setInterval(fetchAll, 30000); return () => clearInterval(iv); }, []);

  useEffect(() => {
    let f = [...rmas];
    if (searchTerm) f = f.filter(r => [r.rma_number, r.product_description, r.distributor_name, r.company_name, r.filer_name, r.end_user_location].some(v => (v || '').toLowerCase().includes(searchTerm.toLowerCase())));
    if (statusFilter !== 'all') f = f.filter(r => r.status === statusFilter);
    setFilteredRmas(f);
  }, [rmas, searchTerm, statusFilter]);

  const showToast = (message, type) => setToast({ show: true, message, type });

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [rRes, dRes, sRes, pdRes] = await Promise.all([
        api.get(`${API}/all-rma`),
        api.get(`${API}/all-dealers`),
        api.get(`${API}/stats`),
        api.get(`${API}/pending-dealers`),
      ]);
      const parsed = (rRes.data.rmas || []).map(parseRMA);
      const prev = prevRmasRef.current;
      const prevIds = prev.map(r => r.id);
      const changed = [...parsed.filter(r => !prevIds.includes(r.id)), ...prev.length > 0 ? parsed.filter(r => { const o = prev.find(x => x.id === r.id); return o && o.status !== r.status; }) : []].map(r => r.id);
      if (changed.length) { setUpdateBanner({ count: changed.length, ids: changed }); setTimeout(() => setUpdateBanner(null), 8000); }
      setRmas(parsed); prevRmasRef.current = parsed; setLastFetch(Date.now());
      setAllDealers(dRes.data.dealers || []); setStats(sRes.data); setPendingDealers(pdRes.data.dealers || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  // RMA actions
  const closeModal = () => { setSelectedRMA(null); setViewMode('view'); };
  const handleViewRMA = rma => { setSelectedRMA(parseRMA(rma)); setViewMode('view'); };
  const handleEditRMA = rma => { setSelectedRMA(rma); setViewMode('edit'); setEditData(EDIT_FIELDS.reduce((a, f) => { a[f.key] = f.type === 'checkbox' ? (rma[f.key] || false) : (rma[f.key] || ''); return a; }, {})); };
  const handleUpdateRMA = async () => {
    try { await api.put(`${API}/rma/${selectedRMA.id}`, editData); showToast('RMA updated successfully.', 'success'); setSelectedRMA(null); fetchAll(); }
    catch (e) { showToast(e.response?.data?.error || 'Failed to update', 'error'); }
  };
  const handleDeleteRMA = async id => {
    if (!window.confirm('Delete this RMA permanently? This cannot be undone.')) return;
    setDeletingId(id);
    try { await api.delete(`${API}/rma/${id}`); showToast('RMA deleted.', 'success'); fetchAll(); }
    catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
    finally { setDeletingId(null); }
  };

  // Dealer actions
  const closeDealerModal = () => { setSelectedDealer(null); setDealerViewMode('view'); setChangePwData({ newPassword: '', confirmPassword: '' }); setShowChangePw(false); };
  const handleViewDealer = d => { setSelectedDealer(d); setDealerViewMode('view'); };
  const handleEditDealer = d => { setSelectedDealer(d); setDealerViewMode('edit'); setDealerEditData(DEALER_EDIT_FIELDS.reduce((a, f) => { a[f.key] = d[f.key] || ''; return a; }, {})); };
  const handleUpdateDealer = async () => {
    try {
      await api.put(`${API}/dealer/${selectedDealer.id}`, dealerEditData);
      showToast('Distributor updated successfully.', 'success');
      setSelectedDealer(null);
      setDealerViewMode('view');
      fetchAll();
    }
    catch (e) { showToast(e.response?.data?.error || 'Failed to update distributor', 'error'); }
  };
  const handleChangePassword = async () => {
    if (changePwData.newPassword !== changePwData.confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    if (changePwData.newPassword.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    try { await api.put(`${API}/dealer/${selectedDealer.id}/change-password`, { new_password: changePwData.newPassword }); showToast('Password changed successfully.', 'success'); setShowChangePw(false); setChangePwData({ newPassword: '', confirmPassword: '' }); }
    catch (e) { showToast(e.response?.data?.error || 'Failed to change password', 'error'); }
  };
  const approveDealer = async id => {
    try { await api.put(`${API}/approve-dealer/${id}`); showToast('Distributor approved.', 'success'); fetchAll(); }
    catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };
  const rejectDealer = async id => {
    if (!window.confirm('Reject this distributor? This will delete the account.')) return;
    try { await api.delete(`${API}/reject-dealer/${id}`); showToast('Distributor rejected.', 'success'); fetchAll(); }
    catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
  };

  // Export
  const exportRMAsCSV = () => csvExport(filteredRmas.map(r => ({
    'RMA Number': r.rma_number,
    'Filer Name': r.filer_name || 'N/A',
    'Distributor': r.distributor_name || r.company_name || 'N/A',
    'Authorized By': r.authorized_by || 'N/A',
    'Approved By': r.approved_by || 'N/A',
    'Product': r.product_description,
    'Status': getStatusTxt(r.status),
    'Date Created': fmtDate(r.created_at),
    'PO Number': r.po_number || '',
    'Return Type': r.return_type || '',
    'Approved With': r.approved_with || '',
    'Location': r.end_user_location || ''
  })), 'rma_export.csv');
  
  const exportDealersCSV = () => csvExport(allDealers.map(d => ({
    'Distributor': d.company_name,
    'Username': d.username,
    'Email': d.email,
    'Contact': d.contact_number,
    'Address': getFullLocation(d.city, d.barangay),
    'Status': d.is_approved ? 'Approved' : 'Pending',
    'Registered': fmtDate(d.registered_at)
  })), 'all_dealers.csv');

  // Field renderers
  const renderEditField = f => {
    const val = editData[f.key];
    if (f.type === 'select') return <select value={val || ''} onChange={e => setEditData({ ...editData, [f.key]: e.target.value })}>{f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>;
    if (f.type === 'checkbox') return <input type="checkbox" checked={val || false} onChange={e => setEditData({ ...editData, [f.key]: e.target.checked })} />;
    if (f.type === 'textarea') return <textarea rows="3" value={val || ''} onChange={e => setEditData({ ...editData, [f.key]: e.target.value })} />;
    return <input type={f.type} value={val || ''} onChange={e => setEditData({ ...editData, [f.key]: e.target.value })} />;
  };
  const renderDealerField = f => <input type={f.type} value={dealerEditData[f.key] || ''} onChange={e => setDealerEditData({ ...dealerEditData, [f.key]: e.target.value })} />;

  // Chart data
  const charts = buildCharts(rmas);
  const statusChartData = Object.entries(stats.status_counts || {}).map(([k, v]) => ({ name: getStatusTxt(k), count: v, color: STATUS_COLORS[k] || '#6b7280' }));

  return (
    <div className="admin-root">
      <Navbar user={user} onLogout={onLogout} title="Super Admin Dashboard" />

      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? '✓' : toast.type === 'info' ? 'ℹ' : '!'}</span>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => setToast({ show: false, message: '', type: '' })}>×</button>
        </div>
      )}

      {updateBanner && (
        <div className="update-banner">
          <span className="update-banner-dot" />
          <strong>{updateBanner.count} RMA{updateBanner.count > 1 ? 's' : ''} updated</strong>
          <span className="update-banner-sub">— dashboard refreshed automatically</span>
          <button className="update-banner-close" onClick={() => setUpdateBanner(null)}>×</button>
        </div>
      )}

      <div className="admin-container">
        <div className="top-bar">
          <span className="last-updated">
            Last updated: {new Date(lastFetch).toLocaleTimeString()}
            {refreshing && <span className="refreshing-badge">Refreshing…</span>}
          </span>
          <button className="btn-refresh" onClick={fetchAll}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            Refresh
          </button>
        </div>

        <div className="stats-row">
          {STAT_CARDS(rmas, stats, pendingDealers).map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-accent" style={{ backgroundColor: s.accent }} />
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.accent }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="tab-bar">
          {[{ key: 'overview', label: `All RMAs (${rmas.length})` }, { key: 'dealers', label: `Distributors (${allDealers.length})` }, { key: 'pending', label: `Pending Distributors (${pendingDealers.length})` }, { key: 'charts', label: 'Analytics' }].map(t => (
            <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">RMA Requests</span>
              <div className="panel-actions">
                <div className="search-wrap">
                  <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input className="search-input" placeholder="Search RMA, filer, distributor, product…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button className="btn-ghost" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>Clear</button>
                <button className="btn-export" onClick={exportRMAsCSV}>Export CSV</button>
                <button className="btn-export btn-pdf" onClick={() => window.print()}>Export PDF</button>
              </div>
            </div>
            <div className="result-count">Showing {filteredRmas.length} of {rmas.length} records</div>
            {loading ? <div className="loading-state">Loading data…</div> : filteredRmas.length === 0 ? <div className="empty-state">No RMA requests found.</div> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>RMA Number</th>
                      <th>Filer Name</th>
                      <th>Distributor</th>
                      <th>Product</th>
                      <th>Authorized By</th>
                      <th>Approved By</th>
                      <th>Status</th>
                      <th>Date Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRmas.map(r => (
                      <tr key={r.id}>
                        <td className="td-rma">{r.rma_number}</td>
                        <td>{r.filer_name || 'N/A'}</td>
                        <td>{r.distributor_name || r.company_name || 'N/A'}</td>
                        <td className="td-truncate">{truncStr(r.product_description || '', 40)}</td>
                        <td>{r.authorized_by || 'N/A'}</td>
                        <td>{r.approved_by || 'N/A'}</td>
                        <td><StatusBadge s={r.status} /></td>
                        <td>{fmtDate(r.created_at)}</td>
                        <td>
                          <div className="action-btns">
                            <button className="btn-action btn-view" onClick={() => handleViewRMA(r)}>View</button>
                            <button className="btn-action btn-edit" onClick={() => handleEditRMA(r)}>Edit</button>
                            <button className="btn-action btn-delete" onClick={() => handleDeleteRMA(r.id)} disabled={deletingId === r.id}>{deletingId === r.id ? '…' : 'Delete'}</button>
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

        {/* All Distributors Tab */}
        {activeTab === 'dealers' && (
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">All Distributors</span>
              <div className="panel-actions"><button className="btn-export" onClick={exportDealersCSV}>Export CSV</button></div>
            </div>
            {allDealers.length === 0 ? <div className="empty-state">No distributors found.</div> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Distributor</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Contact</th>
                      <th>Address</th>
                      <th>Status</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDealers.map(d => (
                      <tr key={d.id}>
                        <td>{d.company_name || 'N/A'}</td>
                        <td>{d.username}</td>
                        <td>{d.email}</td>
                        <td>{d.contact_number || 'N/A'}</td>
                        <td>{getFullLocation(d.city, d.barangay)}</td>
                        <td>{d.is_approved ? <span className="status-badge status-approved">Approved</span> : <span className="status-badge status-pending_dealer">Pending</span>}</td>
                        <td>{fmtDate(d.registered_at)}</td>
                        <td>
                          <div className="action-btns">
                            <button className="btn-action btn-view" onClick={() => handleViewDealer(d)}>View</button>
                            <button className="btn-action btn-edit" onClick={() => handleEditDealer(d)}>Edit</button>
                            {!d.is_approved && <button className="btn-action btn-approve" onClick={() => approveDealer(d.id)}>Approve</button>}
                            <button className="btn-action btn-delete" onClick={() => rejectDealer(d.id)}>Delete</button>
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

        {/* Pending Distributors Tab */}
        {activeTab === 'pending' && (
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Pending Distributor Approvals</span>
              <div className="panel-actions"><button className="btn-export" onClick={exportDealersCSV}>Export CSV</button></div>
            </div>
            {pendingDealers.length === 0 ? <div className="empty-state">No pending distributor approvals.</div> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Distributor</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Address</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDealers.map(d => (
                      <tr key={d.id}>
                        <td>{d.company_name}</td>
                        <td>{d.username}</td>
                        <td>{d.email}</td>
                        <td>{getFullLocation(d.city, d.barangay)}</td>
                        <td>{fmtDate(d.registered_at)}</td>
                        <td>
                          <div className="action-btns">
                            <button className="btn-action btn-approve" onClick={() => approveDealer(d.id)}>Approve</button>
                            <button className="btn-action btn-delete" onClick={() => rejectDealer(d.id)}>Reject</button>
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

        {/* Analytics Tab */}
        {activeTab === 'charts' && (
          <div className="charts-grid">
            <ChartCard title="RMA Volume by Month" wide>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={charts.monthly}>
                  <defs><linearGradient id="aG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} /><Tooltip {...TT} />
                  <Area type="monotone" dataKey="count" stroke="#2563eb" fill="url(#aG)" strokeWidth={2} name="RMAs" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Monthly Approval vs Rejection">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={charts.monthlyApproval}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} /><Tooltip {...TT} /><Legend wrapperStyle={{ fontSize: '13px' }} />
                  <Bar dataKey="approved" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Approved" barSize={22} />
                  <Bar dataKey="rejected" fill="#ef4444" radius={[4, 4, 0, 0]} name="Rejected" barSize={22} />
                  <Line type="monotone" dataKey="approved" stroke="#0e7490" strokeWidth={2} dot={false} name="Approved trend" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Avg. Resolution Time (Days)">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={charts.avgResolution}>
                  <defs><linearGradient id="rG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} unit=" d" /><Tooltip {...TT} formatter={v => [`${v} days`, 'Avg Resolution']} />
                  <Area type="monotone" dataKey="avgDays" stroke="#10b981" fill="url(#rG)" strokeWidth={2} name="Avg Days" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="RMA by Status">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusChartData} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} /><Tooltip {...TT} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>{statusChartData.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Warranty Coverage">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={charts.warranty} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4}><Cell fill="#1e3a5f" /><Cell fill="#e2e8f0" /></Pie><Tooltip {...TT} /><Legend wrapperStyle={{ fontSize: '13px' }} /></PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Return Types">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={charts.returnType} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>{charts.returnType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip {...TT} /></PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="RMA by Region" wide>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.regionData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} /><Tooltip {...TT} />
                  <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} name="RMAs" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="RMA by City / Municipality">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.cityData} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} /><Tooltip {...TT} />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="RMAs" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="RMA by Barangay">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.barangayData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} /><Tooltip {...TT} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="RMAs" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top Distributors by RMA Count" wide>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.topDealers} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} /><Tooltip {...TT} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="RMAs">{charts.topDealers.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="RMA by Product" wide>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.products} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={150} /><Tooltip {...TT} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="RMAs">{charts.products.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Resolution Type">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.approvedWith} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} width={120} /><Tooltip {...TT} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Work Environment">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={charts.workEnv} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>{charts.workEnv.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip {...TT} /></PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Industry Breakdown (End User)" wide>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.industry} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={130} /><Tooltip {...TT} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} name="RMAs">{charts.industry.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </div>

      {/* View RMA Modal */}
      {selectedRMA && viewMode === 'view' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>RMA — {selectedRMA.rma_number}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="detail-meta">
              <StatusBadge s={selectedRMA.status} />
              <div><strong>Created:</strong> {fmtDate(selectedRMA.created_at)}</div>
              <div><strong>Updated:</strong> {fmtDate(selectedRMA.updated_at)}</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button className="btn-export" onClick={() => downloadRMAExcel(selectedRMA)} style={{ padding: '4px 12px', fontSize: '11px' }}>📎 Excel</button>
                <button className="btn-export btn-pdf" onClick={() => downloadRMAPDF(selectedRMA)} style={{ padding: '4px 12px', fontSize: '11px' }}>📄 PDF</button>
              </div>
            </div>
            <Section title="Filer Information">
              <Grid2>
                <Field label="Filer Name" value={selectedRMA.filer_name} />
                <Field label="Distributor" value={selectedRMA.distributor_name || selectedRMA.company_name} />
              </Grid2>
            </Section>
            <Section title="Return Details">
              <Grid2>
                <Field label="Product" value={selectedRMA.product} />
                <Field label="Description" value={selectedRMA.product_description} />
                <Field label="Return Type" value={selectedRMA.return_type} />
                <Field label="Reason" value={selectedRMA.reason_for_return} />
                <Field label="Warranty" value={selectedRMA.warranty ? 'Yes' : 'No'} />
                <Field label="Work Env." value={selectedRMA.work_environment} />
                <Field label="PO Number" value={selectedRMA.po_number} />
                <Field label="Sales Invoice" value={selectedRMA.sales_invoice_number} />
                <Field label="Shipping Date" value={fmtDate(selectedRMA.shipping_date)} />
                <Field label="Return Date" value={fmtDate(selectedRMA.return_date)} />
              </Grid2>
              <AttachmentBlock atts={selectedRMA.attachments} label="Dealer Attachments" cls="section-blue" />
            </Section>
            <Section title="End User">
              <Grid2>
                <Field label="Company" value={selectedRMA.end_user_company} />
                <Field label="Location" value={selectedRMA.end_user_location} />
                <Field label="Industry" value={selectedRMA.end_user_industry} />
                <Field label="Contact" value={selectedRMA.end_user_contact_person} />
              </Grid2>
            </Section>
            <Section title="Problem & Comments">
              <div className="detail-prose">
                <p><strong>Problem Description</strong><br />{selectedRMA.problem_description || 'N/A'}</p>
                <p><strong>Dealer Comments</strong><br />{selectedRMA.dealer_comments || 'None'}</p>
              </div>
            </Section>
            {selectedRMA.authorized_by && (
              <Section title="Authorization" accent="pink">
                <Grid2>
                  <Field label="Authorized By" value={selectedRMA.authorized_by} />
                  <Field label="Authorized Date" value={fmtDate(selectedRMA.authorized_date)} />
                  <Field label="Return Received By" value={selectedRMA.return_received_by} />
                  <Field label="Comments" value={selectedRMA.authorizer_comments || 'None'} />
                </Grid2>
                <AttachmentBlock atts={selectedRMA.authorizer_attachments} label="Authorizer Attachments" cls="section-pink" />
              </Section>
            )}
            {selectedRMA.approved_by && (
              <Section title="Approval" accent="green">
                <Grid2>
                  <Field label="Approved By" value={selectedRMA.approved_by} />
                  <Field label="Approved Date" value={fmtDate(selectedRMA.approved_date)} />
                  <Field label="Approved With" value={selectedRMA.approved_with} />
                  <Field label="Replacement / Credit Note" value={selectedRMA.replacement_order_no} />
                  <Field label="Closed Date" value={fmtDate(selectedRMA.closed_date)} />
                  <Field label="Comments" value={selectedRMA.approver_comments || 'None'} />
                </Grid2>
                <AttachmentBlock atts={selectedRMA.approver_attachments} label="Approver Attachments" cls="section-green" />
              </Section>
            )}
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={() => downloadRMAExcel(selectedRMA)}>Download Excel</button>
              <button className="btn-ghost-dark" onClick={() => downloadRMAPDF(selectedRMA)}>Download PDF</button>
              <button className="btn-primary-dark" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit RMA Modal */}
      {selectedRMA && viewMode === 'edit' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box modal-medium" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-head">
              <h2>Edit RMA — {selectedRMA.rma_number}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="form-body">
              {EDIT_FIELDS.map(f => <div className="form-group" key={f.key}><label>{f.label}</label>{renderEditField(f)}</div>)}
            </div>
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={closeModal}>Cancel</button>
              <button className="btn-primary-dark" onClick={handleUpdateRMA}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* View Dealer Modal */}
      {selectedDealer && dealerViewMode === 'view' && (
        <div className="modal-overlay" onClick={closeDealerModal}>
          <div className="modal-box modal-medium" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Distributor — {selectedDealer.company_name || selectedDealer.username}</h2>
              <button className="modal-close" onClick={closeDealerModal}>×</button>
            </div>
            <Section title="Account">
              <Grid2>
                <Field label="Username" value={selectedDealer.username} />
                <Field label="Email" value={selectedDealer.email} />
                <Field label="Contact" value={selectedDealer.contact_number} />
                <Field label="Status" value={selectedDealer.is_approved ? 'Approved' : 'Pending Approval'} />
                <Field label="Registered" value={fmtDate(selectedDealer.registered_at)} />
              </Grid2>
            </Section>
            <Section title="Company">
              <Grid2>
                <Field label="Distributor Name" value={selectedDealer.company_name} />
                <Field label="Address" value={getFullLocation(selectedDealer.city, selectedDealer.barangay)} />
              </Grid2>
            </Section>
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={() => handleEditDealer(selectedDealer)}>Edit</button>
              <button className="btn-ghost-dark" onClick={() => setShowChangePw(true)}>Change Password</button>
              <button className="btn-primary-dark" onClick={closeDealerModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dealer Modal */}
      {selectedDealer && dealerViewMode === 'edit' && (
        <div className="modal-overlay" onClick={closeDealerModal}>
          <div className="modal-box modal-medium" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Edit Distributor — {selectedDealer.company_name || selectedDealer.username}</h2>
              <button className="modal-close" onClick={closeDealerModal}>×</button>
            </div>
            <div className="form-body">
              {DEALER_EDIT_FIELDS.map(f => <div className="form-group" key={f.key}><label>{f.label}</label>{renderDealerField(f)}</div>)}
            </div>
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={() => setDealerViewMode('view')}>Cancel</button>
              <button className="btn-primary-dark" onClick={handleUpdateDealer}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePw && selectedDealer && (
        <div className="modal-overlay" onClick={() => setShowChangePw(false)}>
          <div className="modal-box modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Change Password — {selectedDealer.username}</h2>
              <button className="modal-close" onClick={() => setShowChangePw(false)}>×</button>
            </div>
            <div className="form-body">
              <div className="form-group"><label>New Password</label><input type="password" value={changePwData.newPassword} onChange={e => setChangePwData({ ...changePwData, newPassword: e.target.value })} placeholder="Min 6 characters" /></div>
              <div className="form-group"><label>Confirm Password</label><input type="password" value={changePwData.confirmPassword} onChange={e => setChangePwData({ ...changePwData, confirmPassword: e.target.value })} placeholder="Confirm new password" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={() => setShowChangePw(false)}>Cancel</button>
              <button className="btn-primary-dark" onClick={handleChangePassword}>Change Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;