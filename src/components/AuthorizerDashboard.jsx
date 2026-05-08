import { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import Navbar from './Navbar';
import './AuthorizerDashboard.css';
import autoTable from 'jspdf-autotable';
import logoSrc from '../assets/logo2.png';
import api from '../api';



// ─── Constants ────────────────────────────────────────────────────────────────
const AUTH_BY_OPTS = ['Belle Tolentino', 'Chie Rogacion', 'Arvin Diocena', 'Mario Vargas', 'Kiko Magallanes'];
const API = '/api/authorizer';
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
  name: 'DELTAPLUS PHILIPPINES, INC.', vat: 'VAT REG. TIN-009-277-410-00000',
  sub: 'Dels Apparel Corporation',
  address: '83 Felix Manalo St., Cubao, Immaculate Concepcion 1111, Quezon City NCR, Second District, Philippines',
  tel: 'Tel. Nos.: +63 (2) 8655 7002  |  Fax No. +63 (2) 8655-0772 loc. 107', web: 'www.deltaplus.ph',
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseAtts = a => !a ? [] : Array.isArray(a) ? a : (typeof a === 'string' ? (() => { try { return JSON.parse(a); } catch { return []; } })() : []);
const fmtDate = s => { if (!s) return 'N/A'; const d = new Date(s); if (isNaN(d)) return s; return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
const statusTxt = s => STATUS_TEXT[s] || s;
const getIcon = (rt, url) => rt === 'image' ? '🖼️' : rt === 'video' ? '🎥' : url?.includes('.pdf') ? '📄' : url?.includes('.doc') ? '📝' : url?.includes('.xls') ? '📊' : '📎';
const fallbackName = url => { if (!url) return 'File'; return url.split('/').pop().replace(/^v\d+_/, '').substring(0, 30); };
const dlFile = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = name || 'download'; document.body.appendChild(a); a.click(); document.body.removeChild(a); };
const truncStr = (s, n) => s?.length > n ? s.slice(0, n) + '…' : (s || '');
const countBy = (arr, key) => arr.reduce((a, r) => { const k = r[key] || 'Unknown'; a[k] = (a[k]||0)+1; return a; }, {});
const parseRMA = r => ({ ...r, attachments: parseAtts(r.attachments), authorizer_attachments: parseAtts(r.authorizer_attachments), approver_attachments: parseAtts(r.approver_attachments) });
const getStatusTxt = s => STATUS_TEXT[s] || s;

// ─── PDF Export (styled like AdminDashboard) ──────────────────────────────────
const downloadRMAPDF = async (rma) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight(), lm = 14, rm = 14;
  let y = 0;

  const drawBorder = () => { doc.setDrawColor(30, 58, 95); doc.setLineWidth(0.6); doc.rect(8, 8, pw - 16, ph - 16); doc.setLineWidth(0.2); doc.setDrawColor(200, 210, 220); doc.rect(9.5, 9.5, pw - 19, ph - 19); };
  const addPage = () => { doc.addPage(); y = 28; drawBorder(); };
  const ensureSpace = n => { if (y + n > ph - 16) addPage(); };
  drawBorder();

  // Logo
  try {
    const img = new Image(); img.src = logoSrc;
    await new Promise(res => { img.onload = res; img.onerror = res; });
    const c = document.createElement('canvas'); c.width = img.naturalWidth || 200; c.height = img.naturalHeight || 60;
    c.getContext('2d').drawImage(img, 0, 0);
    const ratio = c.width / c.height, lw = Math.min(45, ratio * 18), lh = lw / ratio;
    doc.addImage(c.toDataURL('image/png'), 'PNG', lm, 13, lw, lh);
  } catch (_) { }

  // Company info
  y = 35;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(30, 58, 95); doc.text(COMPANY.name, lm, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 95, 115);
  [COMPANY.vat, COMPANY.sub, COMPANY.address, COMPANY.tel].forEach(t => { doc.text(t, lm, y); y += 4; });
  doc.setTextColor(37, 99, 235); doc.text(COMPANY.web, lm, y);
  y += 6; doc.setDrawColor(30, 58, 95); doc.setLineWidth(0.8); doc.line(lm, y, pw - rm, y); doc.setLineWidth(0.2); doc.setDrawColor(200, 210, 230); doc.line(lm, y + 1, pw - rm, y + 1);

  // Title
  y += 8; doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(30, 58, 95);
  doc.text('RETURN MERCHANDISE AUTHORIZATION', pw / 2, y, { align: 'center' }); y += 5;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text(`RMA No: ${rma.rma_number}  |  Date: ${fmtDate(rma.created_at)}  |  Status: ${statusTxt(rma.status)}`, pw / 2, y, { align: 'center' });

  // Helpers
  const sectionTitle = title => {
    ensureSpace(12);
    doc.setFillColor(30, 58, 95); doc.roundedRect(lm, y, pw - lm - rm, 7, 1, 1, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(title.toUpperCase(), lm + 4, y + 4.8); y += 10;
  };
  const twoCol = pairs => {
    const colW = (pw - lm - rm - 6) / 2;
    pairs.forEach((pair, i) => {
      if (i % 2 === 0 && i > 0) y += 10;
      if (i % 2 === 0) ensureSpace(12);
      const x = i % 2 === 0 ? lm : lm + colW + 6;
      doc.setFillColor(241, 245, 249); doc.roundedRect(x, y, colW, 8.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139); doc.text(pair[0].toUpperCase(), x + 3, y + 3.2);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 41, 59);
      doc.text(doc.splitTextToSize(String(pair[1] || 'N/A'), colW - 6)[0], x + 3, y + 7);
    });
    if (pairs.length % 2 !== 0) y += 10; y += 11;
  };
  const fullRow = (label, value) => {
    ensureSpace(14);
    doc.setFillColor(241, 245, 249); doc.roundedRect(lm, y, pw - lm - rm, 11, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139); doc.text(label.toUpperCase(), lm + 3, y + 3.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 41, 59);
    doc.splitTextToSize(String(value || 'N/A'), pw - lm - rm - 6).slice(0, 2).forEach((l, i) => doc.text(l, lm + 3, y + 7.5 + i * 3.5)); y += 13;
  };

  y += 4;
  sectionTitle('Filer Information');
  twoCol([['Filer Name', rma.filer_name], ['Distributor', rma.distributor_name]]);
  sectionTitle('Product & Return Details');
  twoCol([['Product', rma.product], ['Return Type', rma.return_type], ['Reason', rma.reason_for_return], ['Warranty', rma.warranty ? 'Yes' : 'No'], ['PO Number', rma.po_number], ['Sales Invoice', rma.sales_invoice_number], ['Shipping Date', fmtDate(rma.shipping_date)], ['Return Date', fmtDate(rma.return_date)]]);
  fullRow('Product Description', rma.product_description);
  sectionTitle('End User Details');
  twoCol([['Company', rma.end_user_company], ['Location', rma.end_user_location], ['Industry', rma.end_user_industry], ['Contact', rma.end_user_contact_person]]);
  sectionTitle('Problem & Comments');
  fullRow('Problem Description', rma.problem_description);
  fullRow('Dealer Comments', rma.dealer_comments || 'None');
  if (rma.authorized_by) {
    sectionTitle('Authorization Details');
    twoCol([['Authorized By', rma.authorized_by], ['Authorized Date', fmtDate(rma.authorized_date)], ['Return Received By', rma.return_received_by], ['Comments', rma.authorizer_comments || 'None']]);
  }

  // Footer
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFillColor(30, 58, 95); doc.rect(8, ph - 14, pw - 16, 6, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
    doc.text(`${COMPANY.name}  |  ${COMPANY.web}  |  ${COMPANY.tel}`, pw / 2, ph - 10, { align: 'center' });
    doc.setTextColor(180, 195, 215);
    doc.text(`Page ${p} of ${total}`, pw - rm, ph - 10, { align: 'right' });
    doc.text(`Printed: ${new Date().toLocaleString('en-PH')}`, lm, ph - 10);
  }
  doc.save(`RMA_${rma.rma_number}.pdf`);
};

const downloadRMAExcel = (rma) => {
  const ws = XLSX.utils.json_to_sheet([{ 'RMA Number': rma.rma_number, 'Status': statusTxt(rma.status), 'Filer Name': rma.filer_name || '', 'Distributor': rma.distributor_name || '', 'Product': rma.product || '', 'Description': rma.product_description || '', 'Return Type': rma.return_type || '', 'Reason': rma.reason_for_return || '', 'Warranty': rma.warranty ? 'Yes' : 'No', 'PO Number': rma.po_number || '', 'Sales Invoice': rma.sales_invoice_number || '', 'Shipping Date': fmtDate(rma.shipping_date), 'Return Date': fmtDate(rma.return_date), 'End User Company': rma.end_user_company || '', 'Location': rma.end_user_location || '', 'Industry': rma.end_user_industry || '', 'Contact': rma.end_user_contact_person || '', 'Problem': rma.problem_description || '', 'Dealer Comments': rma.dealer_comments || '', 'Authorized By': rma.authorized_by || '', 'Auth Date': fmtDate(rma.authorized_date), 'Received By': rma.return_received_by || '', 'Auth Comments': rma.authorizer_comments || '', 'Date Created': fmtDate(rma.created_at) }]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'RMA'); XLSX.writeFile(wb, `RMA_${rma.rma_number}.xlsx`);
};

const exportTableXLSX = (data, filename) => {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data.map(r => ({ 'RMA Number': r.rma_number, 'Dealer': r.company_name || r.dealer_name, 'Product': r.product_description, 'Status': statusTxt(r.status), 'Authorized By': r.authorized_by || '', 'Return Date': fmtDate(r.return_date), 'Date Created': fmtDate(r.created_at) })));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Export'); XLSX.writeFile(wb, `${filename}.xlsx`);
};

const exportTablePDF = (data, title) => {
  if (!data.length) return;
  const doc = new jsPDF();
  doc.setFontSize(16); doc.setTextColor(30, 58, 95); doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
  autoTable(doc, { startY: 25, head: [['RMA Number', 'Dealer', 'Product', 'Status', 'Date']], body: data.map(r => [r.rma_number, r.company_name || r.dealer_name, (r.product_description || '').substring(0, 40), statusTxt(r.status), fmtDate(r.created_at)]), theme: 'striped', headStyles: { fillColor: [30, 58, 95], textColor: 255 }, alternateRowStyles: { fillColor: [248, 250, 252] } });
  doc.save(`${title.replace(/\s/g, '_')}.pdf`);
};

// ─── Media Viewer (in-app lightbox) ──────────────────────────────────────────
const MediaViewer = ({ items, startIndex, onClose }) => {
  const [idx, setIdx] = useState(startIndex);
  useEffect(() => { const fn = e => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, items.length - 1)); if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0)); }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, [items.length, onClose]);
  if (!items.length) return null;
  const item = items[idx];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 900, padding: '0 16px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', color: '#e2e8f0' }}>
          <span style={{ fontSize: 13, opacity: .7 }}>{idx + 1} / {items.length}</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={item?.url} download target="_blank" rel="noopener noreferrer" style={{ background: '#1e3a5f', color: 'white', padding: '6px 14px', borderRadius: 6, fontSize: 12, textDecoration: 'none' }}>↓ Download</a>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: 6, cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, background: 'rgba(255,255,255,.04)', borderRadius: 12, overflow: 'hidden' }}>
          {item?.resource_type === 'image'
            ? <img src={item.url} alt="" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }} />
            : <video src={item?.url} controls style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }} />}
        </div>
        {items.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <button onClick={() => setIdx(i => i - 1)} disabled={idx === 0} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', opacity: idx === 0 ? 0.5 : 1 }}>← Prev</button>
            <div style={{ display: 'flex', gap: 6 }}>
              {items.map((_, i) => <span key={i} onClick={() => setIdx(i)} style={{ width: 8, height: 8, borderRadius: '50%', background: i === idx ? '#2563eb' : 'rgba(255,255,255,.3)', cursor: 'pointer', display: 'inline-block' }} />)}
            </div>
            <button onClick={() => setIdx(i => i + 1)} disabled={idx === items.length - 1} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', opacity: idx === items.length - 1 ? 0.5 : 1 }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Attachment Block ─────────────────────────────────────────────────────────
const AttBlock = ({ atts, label, cls }) => {
  const [viewerIdx, setViewerIdx] = useState(null);
  if (!atts?.length) return null;
  const mediaItems = atts.filter(a => a.resource_type === 'image' || a.resource_type === 'video');
  return (
    <div className="section-attachments">
      <div className={`attachment-label ${cls}`}>{label}</div>
      <div className="attachment-grid">
        {atts.map((att, i) => {
          const name = att.original_filename || att.filename || fallbackName(att.url);
          if (att.resource_type === 'image') return <div key={i} onClick={() => setViewerIdx(mediaItems.findIndex(m => m.url === att.url))} style={{ cursor: 'pointer' }}><img src={att.url} alt="" className="attachment-img" /></div>;
          if (att.resource_type === 'video') return <div key={i} onClick={() => setViewerIdx(mediaItems.findIndex(m => m.url === att.url))} style={{ cursor: 'pointer', position: 'relative' }}><video src={att.url} className="attachment-video" style={{ pointerEvents: 'none' }} /><div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.3)', borderRadius: 8 }}><span style={{ fontSize: 32, color: 'white' }}>▶</span></div></div>;
          return <div key={i} className="attachment-file-card" onClick={() => dlFile(att.url, name)}><div className="attachment-file-icon">{getIcon(att.resource_type, att.url)}</div><div className="attachment-file-name">{name}</div><div className="attachment-file-download">⬇ Download</div></div>;
        })}
      </div>
      {viewerIdx !== null && <MediaViewer items={mediaItems} startIndex={viewerIdx} onClose={() => setViewerIdx(null)} />}
    </div>
  );
};

const PreviewStrip = ({ previews, onRemove }) => !previews.length ? null : (
  <div className="preview-strip">
    {previews.map((p, i) => (
      <div key={i} className="preview-item">
        {p.type?.startsWith('image/') ? <img src={p.url} alt="preview" /> : p.type?.startsWith('video/') ? <video src={p.url} controls style={{ width: '100%', height: 80, objectFit: 'cover' }} /> : <div style={{ padding: '10px 6px', textAlign: 'center', fontSize: 11, color: '#64748b' }}><div style={{ fontSize: 24 }}>{getIcon('raw', p.url)}</div><div>{p.name?.substring(0, 12)}</div></div>}
        <button className="preview-remove" onClick={() => onRemove(i)}>×</button>
      </div>
    ))}
  </div>
);

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatusBadge = ({ s }) => <span className={`status-badge status-${s}`}>{getStatusTxt(s)}</span>;

const GroupedRMAList = ({ rmas, activeGroup, setActiveGroup, renderActions, checkOverdue, groupBy }) => {
  if (!rmas || rmas.length === 0) return <div className="empty-state">No matching records.</div>;
  
  const getGroupKey = (r) => {
    if (groupBy === 'date') {
      if (!r.created_at) return 'Unknown Date';
      const d = new Date(r.created_at);
      return isNaN(d) ? r.created_at : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    if (groupBy === 'filer') return r.filer_name || 'Unknown Filer';
    if (groupBy === 'status') return getStatusTxt(r.status);
    if (groupBy === 'product') return r.product || 'Unknown Product';
    return r.company_name || r.distributor_name || 'Others';
  };

  const groups = rmas.reduce((acc, r) => {
    const key = getGroupKey(r);
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="grouped-container">
      {Object.entries(groups).map(([name, items]) => {
        const isExpanded = activeGroup === name;
        const hasOverdue = checkOverdue && items.some(checkOverdue);

        return (
          <div key={name} className={`distributor-group ${isExpanded ? 'expanded' : ''}`}>
            <div className="distributor-header" onClick={() => setActiveGroup(isExpanded ? null : name)}>
              <div className="distributor-info">
                <span className="distributor-name">{name}</span>
                <span className="distributor-count">{items.length} items</span>
                {hasOverdue && <span className="aging-warning">⚠️ Needs Attention</span>}
              </div>
              <span className="chevron">▼</span>
            </div>
            {isExpanded && (
              <div className="rma-grid">
                {items.map(r => {
                  const isOverdue = checkOverdue && checkOverdue(r);
                  return (
                    <div key={r.id} className="rma-card">
                      <div className="rma-card-head">
                        <span className="rma-card-num">{r.rma_number}</span>
                        <StatusBadge s={r.status} />
                      </div>
                      <div className="rma-card-body">
                        <div className="rma-card-line">
                          <span className="rma-card-label">Product</span>
                          <span style={{ fontWeight: 500 }}>{truncStr(r.product || 'N/A', 25)}</span>
                        </div>
                        <div className="rma-card-line">
                          <span className="rma-card-label">Filer</span>
                          <span>{r.filer_name || 'N/A'}</span>
                        </div>
                        <div className="rma-card-line">
                          <span className="rma-card-label">Filed On</span>
                          <span>{fmtDate(r.created_at)}</span>
                        </div>
                        {isOverdue && (
                          <div style={{ marginTop: 8, fontSize: 10, color: '#ef4444', fontWeight: 700 }}>
                            🕒 STAGNANT FOR {Math.floor((Date.now() - new Date(r.updated_at).getTime()) / (24 * 60 * 60 * 1000))} DAYS
                          </div>
                        )}
                      </div>
                      <div className="rma-card-footer">
                        {renderActions(r)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AuthorizerDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupBy, setGroupBy] = useState('distributor');
  const [pendingRmas, setPendingRmas] = useState([]);
  const [historyRmas, setHistoryRmas] = useState([]);
  const [allRmas, setAllRmas] = useState([]);
  const [filteredRmas, setFilteredRmas] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);



  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRMA, setSelectedRMA] = useState(null);
  const [viewMode, setViewMode] = useState('view');
  const [editMode, setEditMode] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [updateBanner, setUpdateBanner] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetch, setLastFetch] = useState(Date.now());
  const [authAtts, setAuthAtts] = useState([]);
  const [authPrev, setAuthPrev] = useState([]);
  const [editAtts, setEditAtts] = useState([]);
  const [editPrev, setEditPrev] = useState([]);
  const [editDataAdmin, setEditDataAdmin] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const prevPendingRef = useRef([]);

  const [authData, setAuthData] = useState({ authorized_by: '', authorized_date: new Date().toISOString().split('T')[0], return_date: '', return_received_by: '', authorizer_comments: '' });
    const [editData, setEditData] = useState({ authorized_by: '', return_date: '', return_received_by: '', authorizer_comments: '' });

  useEffect(() => { document.title = 'Authorizer Dashboard'; }, []);
  
  useEffect(() => {
    let f = [...allRmas];
    if (searchTerm) f = f.filter(r => [r.rma_number, r.product_description, r.company_name, r.distributor_name, r.filer_name, r.end_user_location].some(v => (v || '').toLowerCase().includes(searchTerm.toLowerCase())));
    if (statusFilter !== 'all') f = f.filter(r => r.status === statusFilter);
    setFilteredRmas(f);
  }, [allRmas, searchTerm, statusFilter]);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, []);



  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [pRes, hRes] = await Promise.all([
        api.get('/api/authorizer/pending'),
        api.get('/api/authorizer/history')
      ]);
      
      const pending = (pRes.data.rmas || []).map(r => ({ ...r, attachments: parseAtts(r.attachments) }));
      const history = (hRes.data.rmas || []).map(r => ({ ...r, attachments: parseAtts(r.attachments), authorizer_attachments: parseAtts(r.authorizer_attachments) }));
      
      // Update banner logic for pending
      const prev = prevPendingRef.current;
      const prevIds = prev.map(r => r.id);
      const newIds = pending.map(r => r.id).filter(id => !prevIds.includes(id));
      if (newIds.length > 0) {
        setUpdateBanner({ count: newIds.length, isNew: true });
        setTimeout(() => setUpdateBanner(null), 5000);
      }
      
      prevPendingRef.current = pending;
      setPendingRmas(pending);
      setHistoryRmas(history);

      // Build allRmas by merging pending + history (deduplicated by id)
      const merged = [...pending, ...history];
      const seen = new Set();
      const deduped = merged.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      const all = deduped.map(parseRMA);
      setAllRmas(all);

      // Derive stats client-side
      const statusCounts = all.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
      setStats({ status_counts: statusCounts });

      setLastFetch(Date.now());

    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Admin-style RMA actions
  const handleEditRMAAdmin = rma => { 
    setSelectedRMA(rma); 
    setViewMode('edit_admin'); 
    setEditDataAdmin(EDIT_FIELDS.reduce((a, f) => { 
      a[f.key] = f.type === 'checkbox' ? (rma[f.key] || false) : (rma[f.key] || ''); 
      return a; 
    }, {})); 
  };

  const handleUpdateRMAAdmin = async () => {
    try { 
      await api.put(`/api/authorizer/rma/${selectedRMA.id}`, editDataAdmin); 
      showToast('RMA updated successfully.', 'success'); 
      setSelectedRMA(null); 
      setViewMode('view');
      fetchAll(); 
    }
    catch (e) { showToast(e.response?.data?.error || 'Failed to update', 'error'); }
  };

  const handleDeleteRMA = async id => {
    if (!window.confirm('Delete this RMA permanently? This cannot be undone.')) return;
    setDeletingId(id);
    try { 
      await api.delete(`/api/authorizer/rma/${id}`); 
      showToast('RMA deleted.', 'success'); 
      fetchAll(); 
    }
    catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
    finally { setDeletingId(null); }
  };

  const showToast = (message, type) => setToast({ show: true, message, type });

  const closeModal = () => { setSelectedRMA(null); setViewMode('view'); setAuthAtts([]); setAuthPrev([]); setAuthData({ authorized_by: '', authorized_date: new Date().toISOString().split('T')[0], return_date: '', return_received_by: '', authorizer_comments: '' }); };

  const handleFileChange = (e, setAtts, setPrev) => {
    Array.from(e.target.files).forEach(file => { const r = new FileReader(); r.onloadend = () => setPrev(p => [...p, { url: r.result, name: file.name, type: file.type }]); r.readAsDataURL(file); });
    setAtts(p => [...p, ...Array.from(e.target.files)]);
  };
  const removeAtt = (i, setA, setP) => { setA(p => p.filter((_, j) => j !== i)); setP(p => p.filter((_, j) => j !== i)); };

  const handleShowConfirm = id => {
    if (!authData.authorized_by) { alert('Please select Authorized By'); return; }
    if (!authData.return_date) { alert('Please select Return Date'); return; }
    if (!authData.return_received_by) { alert('Please enter Return Received By'); return; }
    setPendingId(id); setShowConfirm(true);
  };

  const handleAuthorize = async () => {
    setUploading(true);
    const fd = new FormData();
    Object.entries(authData).forEach(([k, v]) => fd.append(k, v));
    fd.append('attachment_names', JSON.stringify(authAtts.map(f => f.name)));
    authAtts.forEach(f => fd.append('authorizer_attachments', f));
    try { await api.put(`/api/authorizer/authorize/${pendingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); showToast('RMA authorized successfully.', 'success'); setShowConfirm(false); closeModal(); fetchAll(); }
    catch (e) { alert(e.response?.data?.error || 'Failed'); } finally { setUploading(false); }
  };

  const handleReject = async id => { const c = prompt('Enter rejection reason:'); if (!c) return; try { await api.put(`/api/authorizer/reject/${id}`, { authorized_by: user.id, authorizer_comments: c }); showToast('RMA rejected.', 'info'); closeModal(); fetchAll(); } catch (e) { alert(e.response?.data?.error || 'Failed'); } };
  const handleBackToDealer = async id => { const c = prompt('Enter comments for dealer:'); if (!c) return; try { await api.put(`/api/authorizer/back-to-dealer/${id}`, { authorized_by: user.id, authorizer_comments: c }); showToast('RMA returned to dealer.', 'info'); closeModal(); fetchAll(); } catch (e) { alert(e.response?.data?.error || 'Failed'); } };

  const handleUpdateAuthorized = async () => {
    if (!editData.authorized_by || !editData.return_date || !editData.return_received_by) { alert('All required fields must be filled'); return; }
    setUploading(true);
    const fd = new FormData();
    Object.entries(editData).forEach(([k, v]) => fd.append(k, v));
    fd.append('attachment_names', JSON.stringify(editAtts.map(f => f.name)));
    editAtts.forEach(f => fd.append('authorizer_attachments', f));
    try { await api.put(`/api/authorizer/update_authorized/${selectedRMA.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); showToast('Authorization updated.', 'success'); setSelectedRMA(null); setEditMode(false); fetchAll(); }
    catch (e) { alert(e.response?.data?.error || 'Update failed'); } finally { setUploading(false); }
  };



  // ─── Chart Builder ────────────────────────────────────────────────────────────
  const buildCharts = (rmas) => {
    const monthly = Object.entries(rmas.reduce((a, r) => { const k = r.created_at?.slice(0, 7); if (k) a[k] = (a[k] || 0) + 1; return a; }, {})).sort().slice(-6).map(([month, count]) => ({ month, count }));
    const toPie = key => Object.entries(countBy(rmas, key)).map(([name, value]) => ({ name, value }));
    const toBar = (key, n = 8) => Object.entries(countBy(rmas, key)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name: truncStr(name, 18), count }));
    return {
      monthly,
      returnType: toPie('return_type'),
      topDealers: toBar('company_name'),
    };
  };

  const charts = buildCharts(allRmas);

  const ChartCard = ({ title, wide, children }) => (
    <div className={`chart-card${wide ? ' chart-wide' : ''}`}>
      <div className="chart-title">{title}</div>
      {children}
    </div>
  );
// PIE_COLORS already defined at top of file



  // ─── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="dash-root">
      <Navbar user={user} onLogout={onLogout} title="Authorizer Dashboard" />

      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? '✓' : toast.type === 'info' ? 'i' : '!'}</span>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => setToast({ show: false, message: '', type: '' })}>×</button>
        </div>
      )}

      {updateBanner && (
        <div className="update-banner">
          <span className="update-banner-dot" />
          <strong>{updateBanner.count} RMA{updateBanner.count > 1 ? 's' : ''} {updateBanner.isNew ? 'received' : 'updated'}</strong>
          <span className="update-banner-sub"> — dashboard refreshed automatically</span>
          <button className="update-banner-close" onClick={() => setUpdateBanner(null)}>×</button>
        </div>
      )}

      <div className="dash-container">
        <div className="top-bar">
          <span className="last-updated">Last updated: {new Date(lastFetch).toLocaleTimeString()}<span className="live-dot" /></span>
          <button className="btn-refresh" onClick={() => fetchAll()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            Refresh
          </button>
        </div>

        <div className="stats-row stats-row--2">
          <div className="stat-card"><div className="stat-accent" style={{ backgroundColor: '#f97316' }} /><div className="stat-label">Pending Authorization</div><div className="stat-value" style={{ color: '#f97316' }}>{pendingRmas.length}</div></div>
          <div className="stat-card"><div className="stat-accent" style={{ backgroundColor: '#10b981' }} /><div className="stat-label">Total Authorized</div><div className="stat-value" style={{ color: '#10b981' }}>{historyRmas.length}</div></div>
        </div>

        <div className="tab-bar" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`tab-btn${activeTab === 'pending' ? ' active' : ''}`} onClick={() => setActiveTab('pending')}>Pending ({pendingRmas.length})</button>
            <button className={`tab-btn${activeTab === 'history' ? ' active' : ''}`} onClick={() => setActiveTab('history')}>History ({historyRmas.length})</button>
            <button className={`tab-btn${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>All RMAs ({allRmas.length})</button>
            <button className={`tab-btn${activeTab === 'charts' ? ' active' : ''}`} onClick={() => setActiveTab('charts')}>Analytics</button>
          </div>
        <style>{`
          .grouped-container { display: flex; flex-direction: column; gap: 12px; margin-top: 10px; }
          .distributor-group { background: white; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; box-shadow: var(--shadow); }
          .distributor-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: #f8fafc; cursor: pointer; transition: background 0.2s; user-select: none; }
          .distributor-header:hover { background: #f1f5f9; }
          .distributor-info { display: flex; align-items: center; gap: 12px; }
          .distributor-name { font-weight: 600; font-size: 14px; color: var(--accent); }
          .distributor-count { font-size: 11px; background: #e2e8f0; padding: 2px 8px; border-radius: 10px; color: var(--text-muted); font-weight: 600; }
          .aging-warning { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: #ef4444; font-weight: 700; text-transform: uppercase; margin-left: 8px; }
          .rma-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; padding: 20px; background: #fff; border-top: 1px solid var(--border); }
          .rma-card { border: 1px solid #f1f5f9; border-radius: 8px; padding: 16px; background: #fafafa; transition: transform 0.2s, box-shadow 0.2s; position: relative; }
          .rma-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-color: var(--accent-light); }
          .rma-card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
          .rma-card-num { font-family: 'DM Mono', monospace; font-weight: 600; font-size: 13px; color: var(--accent-light); }
          .rma-card-body { font-size: 13px; color: var(--text); }
          .rma-card-line { margin-bottom: 6px; display: flex; justify-content: space-between; }
          .rma-card-label { font-size: 11px; color: var(--text-muted); font-weight: 500; text-transform: uppercase; }
          .rma-card-footer { margin-top: 14px; padding-top: 12px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 8px; }
          .chevron { transition: transform 0.3s; font-size: 12px; color: var(--text-muted); }
          .expanded .chevron { transform: rotate(180deg); }
        `}</style>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Group by:</span>
              <select 
                className="filter-select" 
                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}
                value={groupBy}
                onChange={e => { setActiveGroup(null); setGroupBy(e.target.value); }}
              >
                <option value="distributor">Distributor</option>
                <option value="date">Date Filed</option>
                <option value="filer">Filer Name</option>
                <option value="status">Status</option>
                <option value="product">Product</option>
              </select>
            </div>
            <button className="btn-export" onClick={() => exportTableXLSX(activeTab === 'pending' ? pendingRmas : historyRmas, activeTab === 'pending' ? 'Pending_Authorization' : 'Authorization_History')}>📎 Excel</button>

            <button className="btn-export btn-pdf" onClick={() => exportTablePDF(activeTab === 'pending' ? pendingRmas : historyRmas, activeTab === 'pending' ? 'Pending Authorization' : 'Authorization History')}>📄 PDF</button>

          </div>
        </div>

        {/* PENDING TABLE */}
        {activeTab === 'pending' && (
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Pending RMA Requests</span></div>
            {loading ? <div className="loading-state">Loading…</div> : (
              <GroupedRMAList
                rmas={pendingRmas}
                activeGroup={activeGroup}
                setActiveGroup={setActiveGroup}
                groupBy={groupBy}
                checkOverdue={r => r.status === 'pending_authorizer' && (Date.now() - new Date(r.updated_at).getTime() > 3 * 24 * 60 * 60 * 1000)}
                renderActions={r => (
                  <>
                    <button className="btn-action btn-view" onClick={() => { setSelectedRMA({ ...r, attachments: parseAtts(r.attachments), authorizer_attachments: parseAtts(r.authorizer_attachments) }); setViewMode('view'); }}>Review</button>
                    <button className="btn-action btn-approve" onClick={() => { setSelectedRMA({ ...r, attachments: parseAtts(r.attachments) }); setViewMode('approve'); setAuthAtts([]); setAuthPrev([]); setAuthData({ authorized_by: '', authorized_date: new Date().toISOString().split('T')[0], return_date: '', return_received_by: '', authorizer_comments: '' }); }}>Authorize</button>
                  </>
                )}
              />
            )}
          </div>
        )}

        {/* HISTORY TABLE */}
        {activeTab === 'history' && (
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Authorization History</span></div>
            {loading ? <div className="loading-state">Loading…</div> : (
              <GroupedRMAList
                rmas={historyRmas}
                activeGroup={activeGroup}
                setActiveGroup={setActiveGroup}
                groupBy={groupBy}
                renderActions={r => (
                  <>
                    <button className="btn-action btn-view" onClick={() => { setSelectedRMA({ ...r, attachments: parseAtts(r.attachments), authorizer_attachments: parseAtts(r.authorizer_attachments) }); setViewMode('view'); setEditMode(false); }}>Review</button>
                    <button className="btn-action btn-edit" onClick={() => { setSelectedRMA({ ...r, attachments: parseAtts(r.attachments), authorizer_attachments: parseAtts(r.authorizer_attachments) }); setEditData({ authorized_by: r.authorized_by || '', return_date: r.return_date || '', return_received_by: r.return_received_by || '', authorizer_comments: r.authorizer_comments || '' }); setEditAtts([]); setEditPrev([]); setEditMode(true); }}>Edit</button>
                  </>
                )}
              />
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="panel" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <div className="panel-header" style={{ background: 'white', borderRadius: '10px', marginBottom: '16px', border: '1px solid var(--border)' }}>
              <span className="panel-title">System-wide RMAs (Grouped by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)})</span>
              <div className="panel-actions">
                <input className="search-input" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', fontSize: 13 }} placeholder="Search everything…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <select className="filter-select" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 13 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {loading ? <div className="loading-state">Syncing data…</div> : (
              <GroupedRMAList
                rmas={filteredRmas}
                activeGroup={activeGroup}
                setActiveGroup={setActiveGroup}
                groupBy={groupBy}
                checkOverdue={r => r.status === 'pending_authorizer' && (Date.now() - new Date(r.updated_at).getTime() > 3 * 24 * 60 * 60 * 1000)}
                renderActions={r => (
                  <>
                    <button className="btn-action btn-view" onClick={() => { setSelectedRMA(r); setViewMode('view'); }}>View</button>
                    <button className="btn-action btn-edit" onClick={() => { setSelectedRMA(r); setEditDataAdmin(r); setViewMode('edit_admin'); }}>Edit</button>
                  </>
                )}
              />
            )}
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginTop: 20 }}>
            <ChartCard title="RMA Volume by Month" wide>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={charts.monthly}>
                  <defs><linearGradient id="aG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} /><Tooltip {...TT} />
                  <Area type="monotone" dataKey="count" stroke="#2563eb" fill="url(#aG)" strokeWidth={2} name="RMAs" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Return Type Distribution">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={charts.returnType} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {charts.returnType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...TT} /><Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Status Distribution">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={Object.entries(stats.status_counts || {}).map(([k, v]) => ({ name: getStatusTxt(k), count: v }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip {...TT} />
                  <Bar dataKey="count">
                    {Object.entries(stats.status_counts || {}).map(([k], i) => <Cell key={i} fill={STATUS_COLORS[k] || '#cbd5e1'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </div>

      {/* VIEW MODAL */}
      {selectedRMA && viewMode === 'view' && !editMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h2>RMA Details — {selectedRMA.rma_number}</h2><button className="modal-close" onClick={closeModal}>×</button></div>
            <div className="detail-meta">
              <span className={`status-badge status-${selectedRMA.status}`}>{statusTxt(selectedRMA.status)}</span>
              <div><strong>Created:</strong> {fmtDate(selectedRMA.created_at)}</div>
              <div><strong>Updated:</strong> {fmtDate(selectedRMA.updated_at)}</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button className="btn-export" onClick={() => downloadRMAExcel(selectedRMA)} style={{ padding: '4px 12px', fontSize: 11 }}>📎 Excel</button>
                <button className="btn-export btn-pdf" onClick={() => downloadRMAPDF(selectedRMA)} style={{ padding: '4px 12px', fontSize: 11 }}>📄 PDF</button>
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">RMA Details</div>
              <div className="detail-grid-2">
                <div><span>Filer Name</span>{selectedRMA.filer_name || 'N/A'}</div>
                <div><span>Distributor</span>{selectedRMA.distributor_name || 'N/A'}</div>
                <div><span>Product</span>{selectedRMA.product || 'N/A'}</div>
                <div><span>Description</span>{selectedRMA.product_description || 'N/A'}</div>
                <div><span>Return Type</span>{selectedRMA.return_type || 'N/A'}</div>
                <div><span>Reason</span>{selectedRMA.reason_for_return || 'N/A'}</div>
                <div><span>Warranty</span>{selectedRMA.warranty ? 'Yes' : 'No'}</div>
                <div><span>Work Environment</span>{selectedRMA.work_environment || 'N/A'}</div>
                <div><span>PO Number</span>{selectedRMA.po_number || 'N/A'}</div>
                <div><span>Sales Invoice</span>{selectedRMA.sales_invoice_number || 'N/A'}</div>
                <div><span>Shipping Date</span>{fmtDate(selectedRMA.shipping_date)}</div>
                <div><span>Return Date</span>{fmtDate(selectedRMA.return_date)}</div>
              </div>
              <AttBlock atts={selectedRMA.attachments} label="Dealer Attachments" cls="section-blue" />
            </div>
            <div className="detail-section">
              <div className="detail-section-title">End User Details</div>
              <div className="detail-grid-2">
                <div><span>Company</span>{selectedRMA.end_user_company || 'N/A'}</div>
                <div><span>Location</span>{selectedRMA.end_user_location || 'N/A'}</div>
                <div><span>Industry</span>{selectedRMA.end_user_industry || 'N/A'}</div>
                <div><span>Contact</span>{selectedRMA.end_user_contact_person || 'N/A'}</div>
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">Problem & Comments</div>
              <div className="detail-prose">
                <p><strong>Problem Description</strong><br />{selectedRMA.problem_description || 'N/A'}</p>
                <p><strong>Dealer Comments</strong><br />{selectedRMA.dealer_comments || 'None'}</p>
              </div>
            </div>
            {selectedRMA.authorized_by && (
              <div className="detail-section">
                <div className="detail-section-title section-pink">Authorization Details</div>
                <div className="detail-grid-2">
                  <div><span>Authorized By</span>{selectedRMA.authorized_by}</div>
                  <div><span>Authorized Date</span>{fmtDate(selectedRMA.authorized_date)}</div>
                  <div><span>Return Received By</span>{selectedRMA.return_received_by || 'N/A'}</div>
                  <div><span>Comments</span>{selectedRMA.authorizer_comments || 'None'}</div>
                </div>
                <AttBlock atts={selectedRMA.authorizer_attachments} label="Authorizer Attachments" cls="section-pink" />
              </div>
            )}
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={() => downloadRMAExcel(selectedRMA)}>Download Excel</button>
              <button className="btn-ghost-dark" onClick={() => downloadRMAPDF(selectedRMA)}>Download PDF</button>
              <button className="btn-primary-dark" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* AUTHORIZE MODAL */}
      {selectedRMA && viewMode === 'approve' && !editMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h2>Authorize RMA — {selectedRMA.rma_number}</h2><button className="modal-close" onClick={closeModal}>×</button></div>
            <div className="detail-section">
              <div className="detail-section-title section-blue">RMA Summary</div>
              <div className="detail-grid-2">
                <div><span>Filer</span>{selectedRMA.filer_name || 'N/A'}</div>
                <div><span>Distributor</span>{selectedRMA.distributor_name || 'N/A'}</div>
                <div><span>Product</span>{selectedRMA.product || 'N/A'}</div>
                <div><span>Description</span>{selectedRMA.product_description || 'N/A'}</div>
                <div><span>Reason</span>{selectedRMA.reason_for_return || 'N/A'}</div>
                <div><span>End User</span>{selectedRMA.end_user_company || 'N/A'}</div>
              </div>
              <AttBlock atts={selectedRMA.attachments} label="Dealer Attachments" cls="section-blue" />
            </div>
            <div className="detail-section">
              <div className="detail-section-title section-pink">Authorization Details</div>
              <div className="form-group"><label>Authorized By <span className="required">*</span></label><select value={authData.authorized_by} onChange={e => setAuthData({ ...authData, authorized_by: e.target.value })}><option value="">Select Authorizer</option>{AUTH_BY_OPTS.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
              <div className="form-group"><label>Authorized Date</label><input type="date" value={authData.authorized_date} disabled /><small>Auto-generated today's date</small></div>
              <div className="form-group"><label>Return Date <span className="required">*</span></label><input type="date" value={authData.return_date} onChange={e => setAuthData({ ...authData, return_date: e.target.value })} /></div>
              <div className="form-group"><label>Return Received By <span className="required">*</span></label><input type="text" value={authData.return_received_by} onChange={e => setAuthData({ ...authData, return_received_by: e.target.value })} placeholder="Name of person who received the returned item" /></div>
              <div className="form-group"><label>Comments</label><textarea rows="3" value={authData.authorizer_comments} onChange={e => setAuthData({ ...authData, authorizer_comments: e.target.value })} placeholder="Additional notes…" /></div>
              <div className="form-group"><label>Upload Supporting Files</label><input type="file" multiple accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" onChange={e => handleFileChange(e, setAuthAtts, setAuthPrev)} /><small>Images, Videos, PDF, Word, Excel, ZIP accepted</small></div>
              <PreviewStrip previews={authPrev} onRemove={i => removeAtt(i, setAuthAtts, setAuthPrev)} />
            </div>
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={() => handleReject(selectedRMA.id)}>Reject</button>
              <button className="btn-ghost-dark" onClick={() => handleBackToDealer(selectedRMA.id)}>Back to Dealer</button>
              <button className="btn-primary-dark" onClick={() => handleShowConfirm(selectedRMA.id)} disabled={uploading}>{uploading ? 'Processing…' : 'Submit Authorization'}</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-box modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h2>Confirm Authorization</h2><button className="modal-close" onClick={() => setShowConfirm(false)}>×</button></div>
            <div className="confirm-body">
              <div className="confirm-icon">?</div>
              <p>Are you sure you want to authorize this RMA request?</p>
              <p className="confirm-sub">Please review the details before confirming.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn-primary-dark" onClick={handleAuthorize} disabled={uploading}>{uploading ? 'Processing…' : 'Confirm Authorization'}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {selectedRMA && editMode && (
        <div className="modal-overlay" onClick={() => { setSelectedRMA(null); setEditMode(false); }}>
          <div className="modal-box modal-medium" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h2>Edit Authorization — {selectedRMA.rma_number}</h2><button className="modal-close" onClick={() => { setSelectedRMA(null); setEditMode(false); }}>×</button></div>
            <div className="form-group"><label>Authorized By <span className="required">*</span></label><select value={editData.authorized_by} onChange={e => setEditData({ ...editData, authorized_by: e.target.value })}><option value="">Select Authorizer</option>{AUTH_BY_OPTS.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
            <div className="form-group"><label>Return Date <span className="required">*</span></label><input type="date" value={editData.return_date} onChange={e => setEditData({ ...editData, return_date: e.target.value })} /></div>
            <div className="form-group"><label>Return Received By <span className="required">*</span></label><input type="text" value={editData.return_received_by} onChange={e => setEditData({ ...editData, return_received_by: e.target.value })} /></div>
            <div className="form-group"><label>Comments</label><textarea rows="4" value={editData.authorizer_comments} onChange={e => setEditData({ ...editData, authorizer_comments: e.target.value })} /></div>
            <div className="form-group"><label>Add / Replace Files</label><input type="file" multiple accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" onChange={e => handleFileChange(e, setEditAtts, setEditPrev)} /><small>Upload new files to replace existing ones</small></div>
            <PreviewStrip previews={editPrev} onRemove={i => removeAtt(i, setEditAtts, setEditPrev)} />
            {selectedRMA.authorizer_attachments?.length > 0 && editPrev.length === 0 && (
              <div className="form-group">
                <label>Current Files</label>
                <AttBlock atts={selectedRMA.authorizer_attachments} label="Existing Attachments" cls="section-pink" />
              </div>
            )}
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={() => { setSelectedRMA(null); setEditMode(false); }}>Cancel</button>
              <button className="btn-primary-dark" onClick={handleUpdateAuthorized} disabled={uploading}>{uploading ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
      
      {/* FULL EDIT MODAL (Admin Style) */}
      {selectedRMA && viewMode === 'edit_admin' && (
        <div className="modal-overlay" onClick={() => { setSelectedRMA(null); setViewMode('view'); }}>
          <div className="modal-box modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h2>Edit RMA Details — {selectedRMA.rma_number}</h2><button className="modal-close" onClick={() => { setSelectedRMA(null); setViewMode('view'); }}>×</button></div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {EDIT_FIELDS.map(f => (
                  <div key={f.key} className="form-group">
                    <label>{f.label}</label>
                    {f.type === 'select' ? (
                      <select value={editDataAdmin[f.key] || ''} onChange={e => setEditDataAdmin({ ...editDataAdmin, [f.key]: e.target.value })}>
                        {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    ) : f.type === 'checkbox' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <input type="checkbox" checked={editDataAdmin[f.key] || false} onChange={e => setEditDataAdmin({ ...editDataAdmin, [f.key]: e.target.checked })} />
                        <span>Under Warranty</span>
                      </div>
                    ) : f.type === 'textarea' ? (
                      <textarea rows="3" value={editDataAdmin[f.key] || ''} onChange={e => setEditDataAdmin({ ...editDataAdmin, [f.key]: e.target.value })} />
                    ) : (
                      <input type={f.type} value={editDataAdmin[f.key] || ''} onChange={e => setEditDataAdmin({ ...editDataAdmin, [f.key]: e.target.value })} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={() => { setSelectedRMA(null); setViewMode('view'); }}>Cancel</button>
              <button className="btn-primary-dark" onClick={handleUpdateRMAAdmin}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}