import { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import Navbar from './Navbar';
import logoSrc from '../assets/logo2.png';
import './ApproverDashboard.css';
import api from '../api';

// ─── Constants ────────────────────────────────────────────────────────────────
const API = '/api/approver';
const TT = { contentStyle: { borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' } };
const COMPANY = {
  name: 'DELTAPLUS PHILIPPINES, INC.', vat: 'VAT REG. TIN-009-277-410-00000',
  sub: 'Dels Apparel Corporation',
  address: '83 Felix Manalo St., Cubao, Immaculate Concepcion 1111, Quezon City NCR, Second District, Philippines',
  tel: 'Tel. Nos.: +63 (2) 8655 7002  |  Fax No. +63 (2) 8655-0772 loc. 107',
  web: 'www.deltaplus.ph',
};
const STATUS_COLORS = { pending_dealer:'#f59e0b', pending_authorizer:'#f97316', pending_approver:'#8b5cf6', authorized:'#10b981', approved:'#06b6d4', completed:'#047857', rejected:'#ef4444' };
const PIE_COLORS = ['#1e3a5f','#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];
const STATUS_TEXT = { pending_dealer:'Pending Dealer', pending_authorizer:'Pending Auth', pending_approver:'Pending Approver', authorized:'Authorized', approved:'Approved', completed:'Completed', rejected:'Rejected' };
const STATUS_OPTS = [
  { value:'all', label:'All Status' }, 
  { value:'pending_dealer', label:'Pending Dealer' },
  { value:'pending_authorizer', label:'Pending Auth' }, 
  { value:'pending_approver', label:'Pending Approver' },
  { value:'authorized', label:'Authorized' }, 
  { value:'approved', label:'Approved' }, 
  { value:'rejected', label:'Rejected' },
];
const APPROVED_WITH_OPTS = [
  { value:'Back Office Mistake - BOM1N', label:'Back Office Mistake (BOM1N)' },
  { value:'Back Office Mistake - BOM2H', label:'Back Office Mistake (BOM2H)' },
  { value:'Back Office Mistake - BOM3M', label:'Back Office Mistake (BOM3M)' },
  { value:'Cancelled Order (CO)', label:'Cancelled Order (CO)' },
  { value:'Changed Model (CM)', label:'Changed Model (CM)' },
  { value:'Changed Size / Color (CH)', label:'Changed Size / Color (CH)' },
  { value:'Damaged Item (D)', label:'Damaged Item (D)' },
  { value:'Dealer Mistake (DM)', label:'Dealer Mistake (DM)' },
  { value:'Manufacturing Issue (Man)', label:'Manufacturing Issue (Man)' },
  { value:'Missing Item (MI)', label:'Missing Item (MI)' },
  { value:'Payment Issue (PI)', label:'Payment Issue (PI)' },
  { value:'Sample Return (SA)', label:'Sample Return (SA)' },
  { value:'Not Received (NR)', label:'Not Received (NR)' },
  { value:'Not Delivered (ND)', label:'Not Delivered (ND)' },
  { value:'System Error (SE)', label:'System Error (SE)' },
  { value:'Preparator Mistake (PM)', label:'Preparator Mistake (PM)' },
];

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
    ...APPROVED_WITH_OPTS.map(o => ({v:o.value, l:o.label}))
  ]},
  { label:'Replacement Order / Credit Note No.', key:'replacement_order_no', type:'text' },
  { label:'Closed Date', key:'closed_date', type:'date' },
  { label:'Approver Comments', key:'approver_comments', type:'textarea' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseAtts = a => !a ? [] : Array.isArray(a) ? a : (typeof a === 'string' ? (() => { try { return JSON.parse(a); } catch { return []; } })() : []);
const parseRMA  = r => ({ ...r, attachments: parseAtts(r.attachments), authorizer_attachments: parseAtts(r.authorizer_attachments), approver_attachments: parseAtts(r.approver_attachments) });
const getStatusTxt = s => STATUS_TEXT[s] || s;
const fmtDate = d => { if (!d) return 'N/A'; const dt = new Date(d); if (isNaN(dt)) return d; return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`; };
const fileIcon = t => t?.startsWith('image/')?'🖼️':t?.startsWith('video/')?'🎥':t==='application/pdf'?'📄':t?.includes('word')?'📝':t?.includes('sheet')||t?.includes('excel')?'📊':t?.includes('zip')?'🗜️':'📎';
const truncStr = (s, n) => s?.length > n ? s.slice(0, n) + '…' : (s || '');
const countBy = (arr, key) => arr.reduce((a, r) => { const k = r[key] || 'Unknown'; a[k] = (a[k]||0)+1; return a; }, {});
const dlFile = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = name || 'download'; document.body.appendChild(a); a.click(); document.body.removeChild(a); };
const statusTxt = s => STATUS_TEXT[s] || s;

// ─── PDF Export ──────────────────────────────────────────────────────────────
const downloadRMAPDF = async (rma) => {
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
  const lm = 14, rm = 14;
  let y = 0;

  const drawBorder = () => {
    doc.setDrawColor(30,58,95); doc.setLineWidth(0.6); doc.rect(8,8,pw-16,ph-16);
    doc.setLineWidth(0.2); doc.setDrawColor(200,210,220); doc.rect(9.5,9.5,pw-19,ph-19);
  };
  const addPage = () => { doc.addPage(); y = 28; drawBorder(); };
  const ensureSpace = n => { if (y+n > ph-16) addPage(); };

  drawBorder();

  // Logo
  try {
    const img = new Image(); img.src = logoSrc;
    await new Promise(res => { img.onload = res; img.onerror = res; });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth||200; canvas.height = img.naturalHeight||60;
    canvas.getContext('2d').drawImage(img, 0, 0);
    const ratio = canvas.width/canvas.height, lw = Math.min(45, ratio*18), lh = lw/ratio;
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', lm, 13, lw, lh);
  } catch(_) {}

  // Company info
  y = 35;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(30,58,95);
  doc.text(COMPANY.name, lm, y); y += 5;
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(80,95,115);
  [COMPANY.vat, COMPANY.sub, COMPANY.address, COMPANY.tel].forEach(line => { doc.text(line, lm, y); y += 4; });
  doc.setTextColor(37,99,235); doc.text(COMPANY.web, lm, y);

  // Divider
  y += 6;
  doc.setDrawColor(30,58,95); doc.setLineWidth(0.8); doc.line(lm, y, pw-rm, y);
  doc.setLineWidth(0.2); doc.setDrawColor(200,210,230); doc.line(lm, y+1, pw-rm, y+1);

  // Title
  y += 8;
  doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(30,58,95);
  doc.text('RETURN MERCHANDISE AUTHORIZATION', pw/2, y, { align:'center' });
  y += 5;
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(100,116,139);
  doc.text(`RMA No: ${rma.rma_number}  |  Date: ${new Date(rma.created_at).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}  |  Status: ${getStatusTxt(rma.status)}`, pw/2, y, { align:'center' });

  // Status pill
  y += 4;
  const sc = STATUS_COLORS[rma.status]||'#6b7280';
  const [r2,g2,b2] = sc.match(/\w\w/g).map(x => parseInt(x,16));
  doc.setFillColor(r2,g2,b2); doc.roundedRect(pw/2-19,y,38,5.5,2.5,2.5,'F');
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
  twoCol([['Filer Name',rma.filer_name],['Distributor',rma.distributor_name],['Date Filled',rma.date_filled]]);

  sectionTitle('Product & Return Details');
  twoCol([['Product',rma.product],['Return Type',rma.return_type],['Reason for Return',rma.reason_for_return],['Warranty',rma.warranty?'Yes – Under Warranty':'No – Out of Warranty'],['Work Environment',rma.work_environment],['PO Number',rma.po_number],['Sales Invoice No.',rma.sales_invoice_number],['Shipping Date',rma.shipping_date],['Return Date',rma.return_date]]);
  fullRow('Product Description', rma.product_description);

  sectionTitle('End User Details');
  twoCol([['Company',rma.end_user_company],['Location',rma.end_user_location],['Industry',rma.end_user_industry],['Contact Person',rma.end_user_contact_person]]);

  sectionTitle('Problem & Comments');
  fullRow('Problem Description', rma.problem_description);
  fullRow('Dealer Comments', rma.dealer_comments||'None');

  if (rma.authorized_by) {
    sectionTitle('Authorization Details');
    twoCol([['Authorized By',rma.authorized_by],['Authorized Date',rma.authorized_date],['Return Received By',rma.return_received_by],['Authorizer Comments',rma.authorizer_comments||'None']]);
  }
  if (rma.approved_by) {
    sectionTitle('Approval Details');
    twoCol([['Approved By',rma.approved_by],['Approved Date',rma.approved_date],['Approved With',rma.approved_with],['Replacement / Credit Note',rma.replacement_order_no],['Closed Date',rma.closed_date],['Approver Comments',rma.approver_comments||'None']]);
  }

  // Footer
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

// ─── Excel Export ─────────────────────────────────────────────────────────────
const downloadRMAExcel = rma => {
  const ws = XLSX.utils.json_to_sheet([{ 'RMA Number':rma.rma_number,'Status':getStatusTxt(rma.status),'Date Created':fmtDate(rma.created_at),'Last Updated':fmtDate(rma.updated_at),'Filer Name':rma.filer_name||'N/A','Distributor Name':rma.distributor_name||'N/A','Product':rma.product||'N/A','Product Description':rma.product_description||'N/A','Return Type':rma.return_type||'N/A','Reason for Return':rma.reason_for_return||'N/A','Warranty':rma.warranty?'Yes':'No','Work Environment':rma.work_environment||'N/A','PO Number':rma.po_number||'N/A','Sales Invoice Number':rma.sales_invoice_number||'N/A','Shipping Date':fmtDate(rma.shipping_date),'Return Date':fmtDate(rma.return_date),'End User Company':rma.end_user_company||'N/A','End User Location':rma.end_user_location||'N/A','End User Industry':rma.end_user_industry||'N/A','End User Contact Person':rma.end_user_contact_person||'N/A','Problem Description':rma.problem_description||'N/A','Dealer Comments':rma.dealer_comments||'None','Authorized By':rma.authorized_by||'N/A','Authorized Date':fmtDate(rma.authorized_date),'Return Received By':rma.return_received_by||'N/A','Authorizer Comments':rma.authorizer_comments||'None','Approved By':rma.approved_by||'N/A','Approved Date':fmtDate(rma.approved_date),'Approved With':rma.approved_with||'N/A','Replacement/Credit Note':rma.replacement_order_no||'N/A','Closed Date':fmtDate(rma.closed_date),'Approver Comments':rma.approver_comments||'None' }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'RMA Details');
  XLSX.writeFile(wb, `RMA_${rma.rma_number}.xlsx`);
};

const exportTableExcel = (data, filename, sheetName) => {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data.map(r => ({ 
    'RMA Number':r.rma_number,
    'Distributor':r.distributor_name || r.company_name || 'N/A',
    'Filer Name':r.filer_name || 'N/A',
    'Authorized By':r.authorized_by || 'N/A',
    'Product':r.product_description,
    'Status':getStatusTxt(r.status),
    'Approved By':r.approver_name||r.approved_by||'N/A',
    'Date Created':fmtDate(r.created_at),
    'Date Approved':fmtDate(r.approved_date||r.updated_at),
    'Return Type':r.return_type||'N/A',
    'Reason':r.reason_for_return||'N/A',
    'End User Company':r.end_user_company||'N/A',
    'End User Location':r.end_user_location||'N/A' 
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatusBadge = ({ s }) => <span className={`status-badge status-${s}`}>{getStatusTxt(s)}</span>;

// Built-in Media Viewer
const MediaViewer = ({ items, startIndex, onClose }) => {
  const [idx, setIdx] = useState(startIndex);
  useEffect(() => {
    const h = e => { if(e.key==='Escape') onClose(); if(e.key==='ArrowRight') setIdx(i=>Math.min(i+1,items.length-1)); if(e.key==='ArrowLeft') setIdx(i=>Math.max(i-1,0)); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [items.length, onClose]);
  const item = items[idx];
  if (!item) return null;
  return (
    <div className="viewer-overlay" onClick={onClose}>
      <div className="viewer-box" onClick={e=>e.stopPropagation()}>
        <div className="viewer-header">
          <span className="viewer-counter">{idx+1} / {items.length}</span>
          <div className="viewer-actions">
            <a href={item.url} download target="_blank" rel="noopener noreferrer" className="viewer-btn">↓ Save</a>
            <button className="viewer-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="viewer-media">
          {item.resource_type==='image' ? <img src={item.url} alt="" className="viewer-img"/> : <video src={item.url} controls className="viewer-video" autoPlay/>}
        </div>
        {items.length > 1 && (
          <div className="viewer-nav">
            <button className="viewer-nav-btn" disabled={idx===0} onClick={()=>setIdx(i=>i-1)}>← Prev</button>
            <div className="viewer-dots">{items.map((_,i)=><span key={i} className={`viewer-dot${i===idx?' active':''}`} onClick={()=>setIdx(i)}/>)}</div>
            <button className="viewer-nav-btn" disabled={idx===items.length-1} onClick={()=>setIdx(i=>i+1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
};

// Attachment block with built-in viewer
const AttBlock = ({ atts, label, cls }) => {
  const [viewerIdx, setViewerIdx] = useState(null);
  if (!atts?.length) return null;
  const mediaItems = atts.filter(a=>a.resource_type==='image'||a.resource_type==='video');
  const getFallback = url => url?.split('/').pop()?.replace(/^v\d+_/,'').substring(0,25)||'File';
  return (
    <div className="section-attachments">
      <div className={`attachment-label ${cls}`}>{label}</div>
      <div className="attachment-grid">
        {atts.map((a, i) => {
          const isImg = a.resource_type==='image', isVid = a.resource_type==='video';
          const mediaIdx = mediaItems.findIndex(m=>m.url===a.url);
          if (isImg) return (
            <div key={i} className="attachment-item attachment-clickable" onClick={()=>setViewerIdx(mediaIdx)}>
              <img src={a.url} alt="" className="attachment-img"/>
            </div>
          );
          if (isVid) return (
            <div key={i} className="attachment-item attachment-clickable" onClick={()=>setViewerIdx(mediaIdx)}>
              <div className="attachment-video-thumb">
                <video src={a.url} className="attachment-video-preview" muted/>
                <div className="attachment-play-icon">▶</div>
              </div>
            </div>
          );
          return (
            <a key={i} href={a.url} download target="_blank" rel="noopener noreferrer" className="attachment-item file-preview-card">
              <span className="file-icon-large">{fileIcon(a.resource_type)}</span>
              <span className="file-name">{a.original_filename||getFallback(a.url)}</span>
              <span className="file-view">⬇ Download</span>
            </a>
          );
        })}
      </div>
      {viewerIdx !== null && <MediaViewer items={mediaItems} startIndex={viewerIdx} onClose={()=>setViewerIdx(null)}/>}
    </div>
  );
};

const PreviewStrip = ({ previews, onRemove }) => !previews.length ? null : (
  <div className="preview-strip">
    {previews.map((p, i) => (
      <div key={i} className="preview-item">
        {p.type?.startsWith('image/') ? <img src={p.url} alt="preview"/> : p.type?.startsWith('video/') ? <video src={p.url} muted style={{width:'100%',height:'80px',objectFit:'cover'}}/> : <div className="file-preview-box"><span className="file-icon-large">{fileIcon(p.type)}</span><span className="file-name-small">{p.name?.substring(0,15)}</span></div>}
        <button className="preview-remove" onClick={()=>onRemove(i)}>×</button>
      </div>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ApproverDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab]     = useState('pending');
  const [pendingRmas, setPendingRmas] = useState([]);
  const [historyRmas, setHistoryRmas] = useState([]);
  const [allRmas, setAllRmas] = useState([]);
  const [filteredRmas, setFilteredRmas] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRMA, setSelectedRMA] = useState(null);
  const [viewMode, setViewMode]       = useState('view');
  const [toast, setToast]             = useState({ show:false, message:'', type:'' });
  const [updateBanner, setUpdateBanner] = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastFetch, setLastFetch]     = useState(Date.now());
  const [approverAtts, setApproverAtts] = useState([]);
  const [attPreviews, setAttPreviews]   = useState([]);
  const [editAtts, setEditAtts]       = useState([]);
  const [editPreviews, setEditPreviews] = useState([]);
  const [editDataAdmin, setEditDataAdmin] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const prevRmasRef = useRef([]);

  const [approveData, setApproveData] = useState({
    approved_by:'Michael John Canatoy', approved_date:new Date().toISOString().split('T')[0],
    approved_with: APPROVED_WITH_OPTS[0].value, replacement_order_no:'', closed_date:'', approver_comments:''
  });
  const [editData, setEditData] = useState({ approved_by:'', approved_date:'', approved_with:'', replacement_order_no:'', closed_date:'', approver_comments:'' });

  const showToast = (msg, type) => setToast({ show:true, message:msg, type });
  const closeModal = () => { setSelectedRMA(null); setViewMode('view'); };

  useEffect(() => { document.title = 'Approver Dashboard'; }, []);
  useEffect(() => { if (toast.show) { const t = setTimeout(()=>setToast({show:false,message:'',type:''}),3000); return ()=>clearTimeout(t); } }, [toast.show]);
  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let f = [...allRmas];
    if (searchTerm) f = f.filter(r => [r.rma_number, r.product_description, r.company_name, r.distributor_name, r.filer_name, r.end_user_location].some(v => (v || '').toLowerCase().includes(searchTerm.toLowerCase())));
    if (statusFilter !== 'all') f = f.filter(r => r.status === statusFilter);
    setFilteredRmas(f);
  }, [allRmas, searchTerm, statusFilter]);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [pRes, hRes, aRes, sRes] = await Promise.all([
        api.get('/api/approver/pending'),
        api.get('/api/approver/history'),
        api.get('/api/approver/all-rma'),
        api.get('/api/approver/stats')
      ]);
      
      const pending = (pRes.data.rmas||[]).map(r=>({ ...r, attachments:parseAtts(r.attachments), authorizer_attachments:parseAtts(r.authorizer_attachments) }));
      const history = (hRes.data.rmas||[]).map(r=>({ ...r, attachments:parseAtts(r.attachments), authorizer_attachments:parseAtts(r.authorizer_attachments), approver_attachments:parseAtts(r.approver_attachments) }));
      const all = (aRes.data.rmas || []).map(parseRMA);
      
      const prev = prevRmasRef.current;
      const brandNew = pending.filter(r=>!prev.map(x=>x.id).includes(r.id));
      if (brandNew.length) {
        setUpdateBanner({ count:brandNew.length, text:`${brandNew.length} new RMA${brandNew.length>1?'s':''} ready for approval` });
        setTimeout(()=>setUpdateBanner(null), 8000);
      }
      
      setPendingRmas(pending);
      setHistoryRmas(history);
      setAllRmas(all);
      setStats(sRes.data);
      prevRmasRef.current = pending;
      setLastFetch(Date.now());
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleFileChange = (e, setAtts, setPrev) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPrev(p=>[...p,{url:reader.result,name:file.name,type:file.type}]);
      reader.readAsDataURL(file);
      setAtts(p=>[...p,file]);
    });
  };
  const removeAtt = (i, setAtts, setPrev) => { setAtts(p=>p.filter((_,j)=>j!==i)); setPrev(p=>p.filter((_,j)=>j!==i)); };

  const handleViewOnly = rma => { setSelectedRMA(parseRMA(rma)); setViewMode('view'); };
  const handleApproveMode = rma => {
    setSelectedRMA({ ...rma, attachments:parseAtts(rma.attachments), authorizer_attachments:parseAtts(rma.authorizer_attachments) });
    setViewMode('approve'); setApproverAtts([]); setAttPreviews([]);
    setApproveData({ approved_by:'Michael John Canatoy', approved_date:new Date().toISOString().split('T')[0], approved_with:APPROVED_WITH_OPTS[0].value, replacement_order_no:'', closed_date:'', approver_comments:'' });
  };
  const openEditModal = rma => {
    setSelectedRMA(parseRMA(rma)); setViewMode('edit');
    setEditData({ approved_by:rma.approved_by||'', approved_date:rma.approved_date||'', approved_with:rma.approved_with||APPROVED_WITH_OPTS[0].value, replacement_order_no:rma.replacement_order_no||'', closed_date:rma.closed_date||'', approver_comments:rma.approver_comments||'' });
    setEditAtts([]); setEditPreviews([]);
  };

  const handleApprove = async id => {
    if (!approveData.closed_date) { alert('Please enter closed date'); return; }
    setUploading(true);
    const fd = new FormData();
    Object.entries(approveData).forEach(([k,v])=>fd.append(k,v));
    const attachmentNames = approverAtts.map(f => f.name);
    fd.append('attachment_names', JSON.stringify(attachmentNames));
    approverAtts.forEach(f=>fd.append('approver_attachments',f));
    try {
      await api.put(`/api/approver/approve/${id}`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      showToast('RMA approved successfully.','success'); closeModal(); setApproverAtts([]); setAttPreviews([]);
      fetchPending(); fetchHistory();
    } catch(e) { alert(e.response?.data?.error||'Failed to approve'); } finally { setUploading(false); }
  };

  const handleReject = async id => {
    const comments = prompt('Enter rejection reason:'); if (!comments) return;
    try { await api.put(`/api/approver/reject/${id}`,{approved_by:user.id,approver_comments:comments}); showToast('RMA rejected.','info'); closeModal(); fetchPending(); fetchHistory(); }
    catch(e) { alert(e.response?.data?.error||'Failed to reject'); }
  };

  const handleRequestChange = async id => {
    const comments = prompt('Enter comments for dealer:'); if (!comments) return;
    try { await api.put(`/api/approver/request-change/${id}`,{approved_by:user.id,approver_comments:comments}); showToast('Changes requested.','info'); closeModal(); fetchPending(); fetchHistory(); }
    catch(e) { alert(e.response?.data?.error||'Failed'); }
  };

  const handleUpdateApproval = async () => {
    if (!editData.closed_date) { alert('Closed Date is required'); return; }
    setUploading(true);
    const fd = new FormData();
    Object.entries(editData).forEach(([k,v])=>fd.append(k,v));
    const attachmentNames = editAtts.map(f => f.name);
    fd.append('attachment_names', JSON.stringify(attachmentNames));
    editAtts.forEach(f=>fd.append('approver_attachments',f));
    try {
      await api.put(`/api/approver/update_approved/${selectedRMA.id}`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      showToast('Approval details updated.','success'); closeModal(); fetchAll();
    } catch(e) { alert(e.response?.data?.error||'Update failed'); } finally { setUploading(false); }
  };

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
      await api.put(`/api/approver/rma/${selectedRMA.id}`, editDataAdmin); 
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
      await api.delete(`/api/approver/rma/${id}`); 
      showToast('RMA deleted.', 'success'); 
      fetchAll(); 
    }
    catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
    finally { setDeletingId(null); }
  };

  // ─── Chart Builder ────────────────────────────────────────────────────────────
  const buildCharts = (rmas) => {
    const monthly = Object.entries(rmas.reduce((a, r) => { const k = r.created_at?.slice(0, 7); if (k) a[k] = (a[k] || 0) + 1; return a; }, {})).sort().slice(-6).map(([month, count]) => ({ month, count }));
    const monthlyApproval = Object.entries(rmas.reduce((a, r) => { const k = r.created_at?.slice(0, 7); if (!k) return a; if (!a[k]) a[k] = { month: k, approved: 0, rejected: 0 }; if (r.status === 'approved') a[k].approved++; if (r.status === 'rejected') a[k].rejected++; return a; }, {})).sort().slice(-6).map(([, v]) => v);
    const avgResolution = (() => {
      const m = {};
      rmas.forEach(r => { const k = r.created_at?.slice(0, 7); if (!k) return; const end = r.closed_date || r.approved_date; if (!end) return; const d = (new Date(end) - new Date(r.created_at)) / 86400000; if (d < 0 || d > 365) return; if (!m[k]) m[k] = { month: k, total: 0, count: 0 }; m[k].total += d; m[k].count++; });
      return Object.values(m).sort((a, b) => a.month.localeCompare(b.month)).slice(-6).map(({ month, total, count }) => ({ month, avgDays: count ? +(total / count).toFixed(1) : 0 }));
    })();
    const toPie = key => Object.entries(countBy(rmas, key)).map(([name, value]) => ({ name, value }));
    const toBar = (key, n = 8) => Object.entries(countBy(rmas, key)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name: truncStr(name, 18), count }));
    const toBarV = (key, n = 8) => Object.entries(countBy(rmas, key)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, value]) => ({ name: truncStr(name, 20), value }));
    const splitLoc = (rmas, idx) => Object.entries(rmas.reduce((a, r) => { const p = (r.end_user_location || '').split(',').map(s => s.trim())[idx]; if (p) a[p] = (a[p] || 0) + 1; return a; }, {})).map(([name, count]) => ({ name: truncStr(name, 20), count })).sort((a, b) => b.count - a.count).slice(0, 10);
    return {
      monthly, monthlyApproval, avgResolution,
      returnType: toPie('return_type'), approvedWith: toPie('approved_with'), workEnv: toPie('work_environment'),
      topDealers: toBar('company_name'), industry: toBar('end_user_industry'), products: toBarV('product'),
      warranty: [{ name: 'Under Warranty', value: rmas.filter(r => r.warranty).length }, { name: 'Out of Warranty', value: rmas.filter(r => !r.warranty).length }],
      regionData: splitLoc(rmas, 0), cityData: splitLoc(rmas, 1), barangayData: splitLoc(rmas, 2),
    };
  };

  const charts = buildCharts(allRmas);

  const ChartCard = ({ title, wide, children }) => (
    <div className={`chart-card${wide ? ' chart-wide' : ''}`}>
      <div className="chart-title">{title}</div>
      {children}
    </div>
  );

  const ApproveWithSelect = ({ value, onChange }) => (
    <select value={value} onChange={e=>onChange(e.target.value)}>
      {APPROVED_WITH_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="dash-root">
      <Navbar user={user} onLogout={onLogout} title="Approver Dashboard"/>

      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{toast.type==='success'?'✓':toast.type==='info'?'ℹ':'!'}</span>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={()=>setToast({show:false,message:'',type:''})}>×</button>
        </div>
      )}

      {updateBanner && (
        <div className="update-banner">
          <span className="update-banner-dot"/>
          <strong>{updateBanner.text}</strong>
          <span className="update-banner-sub">— dashboard refreshed automatically</span>
          <button className="update-banner-close" onClick={()=>setUpdateBanner(null)}>×</button>
        </div>
      )}

      <div className="dash-container">
        <div className="top-bar">
          <span className="last-updated">
            <span className="live-dot"/>
            Last updated: {new Date(lastFetch).toLocaleTimeString()}
          </span>
          <button className="btn-refresh" onClick={()=>{ fetchPending(); fetchHistory(); }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>

        <div className="stats-row stats-row--2">
          <div className="stat-card"><div className="stat-accent" style={{backgroundColor:'#8b5cf6'}}/><div className="stat-label">Pending Approval</div><div className="stat-value" style={{color:'#8b5cf6'}}>{pendingRmas.length}</div></div>
          <div className="stat-card"><div className="stat-accent" style={{backgroundColor:'#1e3a5f'}}/><div className="stat-label">Total Processed</div><div className="stat-value" style={{color:'#1e3a5f'}}>{historyRmas.length}</div></div>
        </div>

        <div className="tab-bar" style={{justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
          <div style={{display:'flex',gap:'4px'}}>
            <button className={`tab-btn${activeTab==='pending'?' active':''}`} onClick={()=>setActiveTab('pending')}>Pending Approval ({pendingRmas.length})</button>
            <button className={`tab-btn${activeTab==='history'?' active':''}`} onClick={()=>setActiveTab('history')}>Approval History ({historyRmas.length})</button>
            <button className={`tab-btn${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>All RMAs ({allRmas.length})</button>
            <button className={`tab-btn${activeTab === 'charts' ? ' active' : ''}`} onClick={() => setActiveTab('charts')}>Analytics</button>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn-export" onClick={() => exportTableExcel(activeTab === 'pending' ? pendingRmas : activeTab === 'all' ? allRmas : historyRmas, activeTab === 'pending' ? 'Pending_Approvals' : activeTab === 'all' ? 'All_RMAs' : 'Approval_History', activeTab === 'pending' ? 'Pending Approvals' : activeTab === 'all' ? 'All RMAs' : 'Approval History')}>📎 Export Excel</button>
          </div>
        </div>

        {/* PENDING TABLE - Updated with Filer, Distributor, Authorized By */}
        {activeTab==='pending' && (
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Authorized RMAs — Ready for Approval</span></div>
            {pendingRmas.length===0 ? <div className="empty-state">No pending approvals.</div> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>RMA Number</th>
                      <th>Distributor</th>
                      <th>Filer Name</th>
                      <th>Product</th>
                      <th>Authorized By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRmas.map(r=>(
                      <tr key={r.id}>
                        <td className="td-rma">{r.rma_number}</td>
                        <td>{r.distributor_name || r.company_name || 'N/A'}</td>
                        <td>{r.filer_name || 'N/A'}</td>
                        <td className="td-truncate">{(r.product_description||'').substring(0,40)}{r.product_description?.length>40?'…':''}</td>
                        <td>{r.authorized_by || 'N/A'}</td>
                        <td><div className="action-btns">
                          <button className="btn-action btn-view" onClick={()=>handleViewOnly(r)}>Review</button>
                          <button className="btn-action btn-approve" onClick={()=>handleApproveMode(r)}>Approve</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TABLE - Updated with Filer, Distributor, Authorized By */}
        {activeTab==='history' && (
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Approval History</span></div>
            {loading ? <div className="loading-state">Loading…</div> : historyRmas.length===0 ? <div className="empty-state">No approval history yet.</div> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>RMA Number</th>
                      <th>Distributor</th>
                      <th>Filer Name</th>
                      <th>Authorized By</th>
                      <th>Status</th>
                      <th>Approved By</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRmas.map(r=>(
                      <tr key={r.id}>
                        <td className="td-rma">{r.rma_number}</td>
                        <td>{r.distributor_name || r.company_name || 'N/A'}</td>
                        <td>{r.filer_name || 'N/A'}</td>
                        <td>{r.authorized_by || 'N/A'}</td>
                        <td><StatusBadge s={r.status}/></td>
                        <td>{r.approver_name||r.approved_by||'N/A'}</td>
                        <td>{fmtDate(r.approved_date||r.updated_at)}</td>
                        <td>
                          <div className="action-btns">
                            <button className="btn-action btn-view" onClick={()=>handleViewOnly(r)}>Review</button>
                            <button className="btn-action btn-edit" onClick={()=>openEditModal(r)}>Edit</button>
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

        {activeTab === 'all' && (
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">All RMA Requests</span>
              <div className="panel-actions">
                <div className="search-wrap" style={{ display:'flex', gap:8 }}>
                  <input className="search-input" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', fontSize: 13 }} placeholder="Search RMA, filer, product…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  <select className="filter-select" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 13 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {loading ? <div className="loading-state">Loading data…</div> : filteredRmas.length === 0 ? <div className="empty-state">No RMA requests found.</div> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>RMA Number</th>
                      <th>Filer Name</th>
                      <th>Distributor</th>
                      <th>Product</th>
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
                        <td>{r.company_name || r.distributor_name || 'N/A'}</td>
                        <td className="td-truncate">{truncStr(r.product_description || '', 40)}</td>
                        <td><StatusBadge s={r.status} /></td>
                        <td>{fmtDate(r.created_at)}</td>
                        <td>
                          <div className="action-btns">
                            <button className="btn-action btn-view" onClick={() => { setSelectedRMA(r); setViewMode('view'); }}>View</button>
                            <button className="btn-action btn-edit" onClick={() => handleEditRMAAdmin(r)}>Edit</button>
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

        {activeTab === 'charts' && (
          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginTop: 20 }}>
            <ChartCard title="RMA Volume by Month" wide>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={charts.monthly}>
                  <defs><linearGradient id="aG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} /><Tooltip {...TT} />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="url(#aG)" strokeWidth={2} name="RMAs" />
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
            <ChartCard title="Top Distributors">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.topDealers} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" /><XAxis type="number" hide /><YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} /><Tooltip {...TT} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </div>

      {/* ── View Modal (no changes needed, already shows all fields) ── */}
      {selectedRMA && viewMode==='view' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box modal-large" onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h2>RMA Details — {selectedRMA.rma_number}</h2><button className="modal-close" onClick={closeModal}>×</button></div>
            <div className="detail-meta">
              <StatusBadge s={selectedRMA.status}/>
              <div><strong>Created:</strong> {fmtDate(selectedRMA.created_at)}</div>
              <div><strong>Updated:</strong> {fmtDate(selectedRMA.updated_at)}</div>
              <div style={{marginLeft:'auto',display:'flex',gap:'8px'}}>
                <button className="btn-export" onClick={()=>downloadRMAExcel(selectedRMA)} style={{padding:'4px 12px',fontSize:'11px'}}>📎 Excel</button>
                <button className="btn-export btn-pdf" onClick={()=>downloadRMAPDF(selectedRMA)} style={{padding:'4px 12px',fontSize:'11px'}}>📄 PDF</button>
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">Filer Information</div>
              <div className="detail-grid-3">
                <div><span>Filer Name</span>{selectedRMA.filer_name||'N/A'}</div>
                <div><span>Distributor</span>{selectedRMA.distributor_name||'N/A'}</div>
                <div><span>Date Filled</span>{fmtDate(selectedRMA.date_filled)}</div>
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">Return Details</div>
              <div className="detail-grid-2">
                <div><span>Product</span>{selectedRMA.product||'N/A'}</div>
                <div><span>Description</span>{selectedRMA.product_description||'N/A'}</div>
                <div><span>Return Type</span>{selectedRMA.return_type||'N/A'}</div>
                <div><span>Reason</span>{selectedRMA.reason_for_return||'N/A'}</div>
                <div><span>Warranty</span>{selectedRMA.warranty?'Yes':'No'}</div>
                <div><span>Work Environment</span>{selectedRMA.work_environment||'N/A'}</div>
                <div><span>PO Number</span>{selectedRMA.po_number||'N/A'}</div>
                <div><span>Sales Invoice</span>{selectedRMA.sales_invoice_number||'N/A'}</div>
                <div><span>Shipping Date</span>{fmtDate(selectedRMA.shipping_date)}</div>
                <div><span>Return Date</span>{fmtDate(selectedRMA.return_date)}</div>
              </div>
              <AttBlock atts={selectedRMA.attachments} label="Dealer Attachments" cls="section-blue"/>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">End User Details</div>
              <div className="detail-grid-2">
                <div><span>Company</span>{selectedRMA.end_user_company||'N/A'}</div>
                <div><span>Location</span>{selectedRMA.end_user_location||'N/A'}</div>
                <div><span>Industry</span>{selectedRMA.end_user_industry||'N/A'}</div>
                <div><span>Contact</span>{selectedRMA.end_user_contact_person||'N/A'}</div>
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">Problem & Comments</div>
              <div className="detail-prose">
                <p><strong>Problem Description</strong><br/>{selectedRMA.problem_description||'N/A'}</p>
                <p><strong>Dealer Comments</strong><br/>{selectedRMA.dealer_comments||'None'}</p>
              </div>
            </div>
            {selectedRMA.authorized_by && (
              <div className="detail-section">
                <div className="detail-section-title section-pink">Authorization Details</div>
                <div className="detail-grid-2">
                  <div><span>Authorized By</span>{selectedRMA.authorized_by}</div>
                  <div><span>Authorized Date</span>{fmtDate(selectedRMA.authorized_date)}</div>
                  <div><span>Return Received By</span>{selectedRMA.return_received_by||'N/A'}</div>
                  <div><span>Comments</span>{selectedRMA.authorizer_comments||'None'}</div>
                </div>
                <AttBlock atts={selectedRMA.authorizer_attachments} label="Authorizer Attachments" cls="section-pink"/>
              </div>
            )}
            {selectedRMA.approved_by && (
              <div className="detail-section">
                <div className="detail-section-title section-green">Approval Details</div>
                <div className="detail-grid-2">
                  <div><span>Approved By</span>{selectedRMA.approved_by}</div>
                  <div><span>Approved Date</span>{fmtDate(selectedRMA.approved_date)}</div>
                  <div><span>Approved With</span>{selectedRMA.approved_with||'N/A'}</div>
                  <div><span>Replacement / Credit Note</span>{selectedRMA.replacement_order_no||'N/A'}</div>
                  <div><span>Closed Date</span>{fmtDate(selectedRMA.closed_date)}</div>
                  <div><span>Comments</span>{selectedRMA.approver_comments||'None'}</div>
                </div>
                <AttBlock atts={selectedRMA.approver_attachments} label="Approver Attachments" cls="section-green"/>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={()=>downloadRMAExcel(selectedRMA)}>Download Excel</button>
              <button className="btn-ghost-dark" onClick={()=>downloadRMAPDF(selectedRMA)}>Download PDF</button>
              <button className="btn-primary-dark" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve Modal ── */}
      {selectedRMA && viewMode==='approve' && (
        <div className="modal-overlay" onClick={()=>setSelectedRMA(null)}>
          <div className="modal-box modal-large" onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h2>Approve RMA — {selectedRMA.rma_number}</h2><button className="modal-close" onClick={()=>setSelectedRMA(null)}>×</button></div>
            <div className="detail-section">
              <div className="detail-section-title section-blue">RMA Summary</div>
              <div className="detail-grid-2">
                <div><span>Product</span>{selectedRMA.product_description||'N/A'}</div>
                <div><span>Reason</span>{selectedRMA.reason_for_return||'N/A'}</div>
                <div><span>Distributor</span>{selectedRMA.distributor_name||selectedRMA.company_name||'N/A'}</div>
                <div><span>End User</span>{selectedRMA.end_user_company||'N/A'}</div>
              </div>
              <AttBlock atts={selectedRMA.attachments} label="Dealer Attachments" cls="section-blue"/>
              <AttBlock atts={selectedRMA.authorizer_attachments} label="Authorizer Attachments" cls="section-pink"/>
            </div>
            <div className="detail-section">
              <div className="detail-section-title section-green">Approval Details</div>
              <div className="form-group"><label>Approved By</label><input type="text" value={approveData.approved_by} onChange={e=>setApproveData({...approveData,approved_by:e.target.value})}/></div>
              <div className="form-group"><label>Approved Date</label><input type="date" value={approveData.approved_date} disabled/><small>Auto-generated current date</small></div>
              <div className="form-group"><label>Approved With</label><ApproveWithSelect value={approveData.approved_with} onChange={v=>setApproveData({...approveData,approved_with:v})}/></div>
              <div className="form-group"><label>Replacement Order / Credit Note No.</label><input type="text" value={approveData.replacement_order_no} onChange={e=>setApproveData({...approveData,replacement_order_no:e.target.value})} placeholder="e.g., CN-2024-00123"/></div>
              <div className="form-group"><label>Closed Date <span className="required">*</span></label><input type="date" value={approveData.closed_date} onChange={e=>setApproveData({...approveData,closed_date:e.target.value})}/></div>
              <div className="form-group"><label>Comments</label><textarea rows="3" value={approveData.approver_comments} onChange={e=>setApproveData({...approveData,approver_comments:e.target.value})} placeholder="Additional notes…"/></div>
              <div className="form-group">
                <label>Upload Supporting Files</label>
                <input type="file" multiple accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" onChange={e=>handleFileChange(e,setApproverAtts,setAttPreviews)}/>
                <small>Images, Videos, PDF, Word, Excel, ZIP accepted</small>
              </div>
              <PreviewStrip previews={attPreviews} onRemove={i=>removeAtt(i,setApproverAtts,setAttPreviews)}/>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={()=>handleReject(selectedRMA.id)}>Reject</button>
              <button className="btn-ghost-dark" onClick={()=>handleRequestChange(selectedRMA.id)}>Request Change</button>
              <button className="btn-primary-dark" onClick={()=>handleApprove(selectedRMA.id)} disabled={uploading}>{uploading?'Approving…':'Confirm Approval'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {selectedRMA && viewMode==='edit' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box modal-medium" onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h2>Edit Approval — {selectedRMA.rma_number}</h2><button className="modal-close" onClick={closeModal}>×</button></div>
            <div className="form-group"><label>Approved By</label><input type="text" value={editData.approved_by} onChange={e=>setEditData({...editData,approved_by:e.target.value})}/></div>
            <div className="form-group"><label>Approved Date</label><input type="date" value={editData.approved_date} onChange={e=>setEditData({...editData,approved_date:e.target.value})}/></div>
            <div className="form-group"><label>Approved With</label><ApproveWithSelect value={editData.approved_with} onChange={v=>setEditData({...editData,approved_with:v})}/></div>
            <div className="form-group"><label>Replacement Order / Credit Note No.</label><input type="text" value={editData.replacement_order_no} onChange={e=>setEditData({...editData,replacement_order_no:e.target.value})}/></div>
            <div className="form-group"><label>Closed Date <span className="required">*</span></label><input type="date" value={editData.closed_date} onChange={e=>setEditData({...editData,closed_date:e.target.value})}/></div>
            <div className="form-group"><label>Comments</label><textarea rows="3" value={editData.approver_comments} onChange={e=>setEditData({...editData,approver_comments:e.target.value})}/></div>
            <div className="form-group">
              <label>Add / Replace Files</label>
              <input type="file" multiple accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" onChange={e=>handleFileChange(e,setEditAtts,setEditPreviews)}/>
              <small>Upload new files to replace existing ones</small>
            </div>
            <PreviewStrip previews={editPreviews} onRemove={i=>removeAtt(i,setEditAtts,setEditPreviews)}/>
            {selectedRMA.approver_attachments?.length>0 && editPreviews.length===0 && (
              <div className="form-group">
                <label>Current Files</label>
                <AttBlock atts={selectedRMA.approver_attachments} label="" cls="section-green"/>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={closeModal}>Cancel</button>
              <button className="btn-primary-dark" onClick={handleUpdateApproval} disabled={uploading}>{uploading?'Saving…':'Save Changes'}</button>
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