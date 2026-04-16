import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import Navbar from './Navbar';
import './AuthorizerDashboard.css';
import autoTable from 'jspdf-autotable';
import logoSrc from '../assets/logo2.png';
import api from '../api';

// ─── Constants ────────────────────────────────────────────────────────────────
const AUTH_BY_OPTS = ['Belle Tolentino','Chie Rogacion','Arvin Diocena','Mario Vargas','Kiko Magallanes'];
const COMPANY = {
  name:'DELTAPLUS PHILIPPINES, INC.', vat:'VAT REG. TIN-009-277-410-00000',
  sub:'Dels Apparel Corporation',
  address:'83 Felix Manalo St., Cubao, Immaculate Concepcion 1111, Quezon City NCR, Second District, Philippines',
  tel:'Tel. Nos.: +63 (2) 8655 7002  |  Fax No. +63 (2) 8655-0772 loc. 107', web:'www.deltaplus.ph',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseAtts = a => !a?[]:Array.isArray(a)?a:(typeof a==='string'?(()=>{try{return JSON.parse(a);}catch{return[];}})():[]);
const fmtDate = s => { if(!s) return 'N/A'; const d=new Date(s); if(isNaN(d)) return s; return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; };
const statusTxt = s => ({pending_dealer:'Pending Dealer',pending_authorizer:'Pending Auth',authorized:'Authorized',approved:'Approved',rejected:'Rejected'}[s]||s);
const getIcon = (rt,url) => rt==='image'?'🖼️':rt==='video'?'🎥':url?.includes('.pdf')?'📄':url?.includes('.doc')?'📝':url?.includes('.xls')?'📊':'📎';
const fallbackName = url => { if(!url) return 'File'; return url.split('/').pop().replace(/^v\d+_/,'').substring(0,30); };
const dlFile = (url,name) => { const a=document.createElement('a'); a.href=url; a.download=name||'download'; document.body.appendChild(a); a.click(); document.body.removeChild(a); };

// ─── PDF Export (styled like AdminDashboard) ──────────────────────────────────
const downloadRMAPDF = async (rma) => {
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const pw=doc.internal.pageSize.getWidth(), ph=doc.internal.pageSize.getHeight(), lm=14, rm=14;
  let y=0;

  const drawBorder = () => { doc.setDrawColor(30,58,95); doc.setLineWidth(0.6); doc.rect(8,8,pw-16,ph-16); doc.setLineWidth(0.2); doc.setDrawColor(200,210,220); doc.rect(9.5,9.5,pw-19,ph-19); };
  const addPage = () => { doc.addPage(); y=28; drawBorder(); };
  const ensureSpace = n => { if(y+n>ph-16) addPage(); };
  drawBorder();

  // Logo
  try {
    const img=new Image(); img.src=logoSrc;
    await new Promise(res=>{img.onload=res;img.onerror=res;});
    const c=document.createElement('canvas'); c.width=img.naturalWidth||200; c.height=img.naturalHeight||60;
    c.getContext('2d').drawImage(img,0,0);
    const ratio=c.width/c.height, lw=Math.min(45,ratio*18), lh=lw/ratio;
    doc.addImage(c.toDataURL('image/png'),'PNG',lm,13,lw,lh);
  } catch(_){}

  // Company info
  y=35;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(30,58,95); doc.text(COMPANY.name,lm,y); y+=5;
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(80,95,115);
  [COMPANY.vat,COMPANY.sub,COMPANY.address,COMPANY.tel].forEach(t=>{doc.text(t,lm,y);y+=4;});
  doc.setTextColor(37,99,235); doc.text(COMPANY.web,lm,y);
  y+=6; doc.setDrawColor(30,58,95); doc.setLineWidth(0.8); doc.line(lm,y,pw-rm,y); doc.setLineWidth(0.2); doc.setDrawColor(200,210,230); doc.line(lm,y+1,pw-rm,y+1);

  // Title
  y+=8; doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(30,58,95);
  doc.text('RETURN MERCHANDISE AUTHORIZATION',pw/2,y,{align:'center'}); y+=5;
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(100,116,139);
  doc.text(`RMA No: ${rma.rma_number}  |  Date: ${fmtDate(rma.created_at)}  |  Status: ${statusTxt(rma.status)}`,pw/2,y,{align:'center'});

  // Helpers
  const sectionTitle = title => {
    ensureSpace(12);
    doc.setFillColor(30,58,95); doc.roundedRect(lm,y,pw-lm-rm,7,1,1,'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    doc.text(title.toUpperCase(),lm+4,y+4.8); y+=10;
  };
  const twoCol = pairs => {
    const colW=(pw-lm-rm-6)/2;
    pairs.forEach((pair,i)=>{
      if(i%2===0&&i>0) y+=10;
      if(i%2===0) ensureSpace(12);
      const x=i%2===0?lm:lm+colW+6;
      doc.setFillColor(241,245,249); doc.roundedRect(x,y,colW,8.5,1,1,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(100,116,139); doc.text(pair[0].toUpperCase(),x+3,y+3.2);
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(30,41,59);
      doc.text(doc.splitTextToSize(String(pair[1]||'N/A'),colW-6)[0],x+3,y+7);
    });
    if(pairs.length%2!==0) y+=10; y+=11;
  };
  const fullRow = (label,value) => {
    ensureSpace(14);
    doc.setFillColor(241,245,249); doc.roundedRect(lm,y,pw-lm-rm,11,1,1,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(100,116,139); doc.text(label.toUpperCase(),lm+3,y+3.5);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(30,41,59);
    doc.splitTextToSize(String(value||'N/A'),pw-lm-rm-6).slice(0,2).forEach((l,i)=>doc.text(l,lm+3,y+7.5+i*3.5)); y+=13;
  };

  y+=4;
  sectionTitle('Filer Information');
  twoCol([['Filer Name',rma.filer_name],['Distributor',rma.distributor_name]]);
  sectionTitle('Product & Return Details');
  twoCol([['Product',rma.product],['Return Type',rma.return_type],['Reason',rma.reason_for_return],['Warranty',rma.warranty?'Yes':'No'],['PO Number',rma.po_number],['Sales Invoice',rma.sales_invoice_number],['Shipping Date',fmtDate(rma.shipping_date)],['Return Date',fmtDate(rma.return_date)]]);
  fullRow('Product Description',rma.product_description);
  sectionTitle('End User Details');
  twoCol([['Company',rma.end_user_company],['Location',rma.end_user_location],['Industry',rma.end_user_industry],['Contact',rma.end_user_contact_person]]);
  sectionTitle('Problem & Comments');
  fullRow('Problem Description',rma.problem_description);
  fullRow('Dealer Comments',rma.dealer_comments||'None');
  if(rma.authorized_by) {
    sectionTitle('Authorization Details');
    twoCol([['Authorized By',rma.authorized_by],['Authorized Date',fmtDate(rma.authorized_date)],['Return Received By',rma.return_received_by],['Comments',rma.authorizer_comments||'None']]);
  }

  // Footer
  const total=doc.internal.getNumberOfPages();
  for(let p=1;p<=total;p++){
    doc.setPage(p);
    doc.setFillColor(30,58,95); doc.rect(8,ph-14,pw-16,6,'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(255,255,255);
    doc.text(`${COMPANY.name}  |  ${COMPANY.web}  |  ${COMPANY.tel}`,pw/2,ph-10,{align:'center'});
    doc.setTextColor(180,195,215);
    doc.text(`Page ${p} of ${total}`,pw-rm,ph-10,{align:'right'});
    doc.text(`Printed: ${new Date().toLocaleString('en-PH')}`,lm,ph-10);
  }
  doc.save(`RMA_${rma.rma_number}.pdf`);
};

const downloadRMAExcel = (rma) => {
  const ws=XLSX.utils.json_to_sheet([{'RMA Number':rma.rma_number,'Status':statusTxt(rma.status),'Filer Name':rma.filer_name||'','Distributor':rma.distributor_name||'','Product':rma.product||'','Description':rma.product_description||'','Return Type':rma.return_type||'','Reason':rma.reason_for_return||'','Warranty':rma.warranty?'Yes':'No','PO Number':rma.po_number||'','Sales Invoice':rma.sales_invoice_number||'','Shipping Date':fmtDate(rma.shipping_date),'Return Date':fmtDate(rma.return_date),'End User Company':rma.end_user_company||'','Location':rma.end_user_location||'','Industry':rma.end_user_industry||'','Contact':rma.end_user_contact_person||'','Problem':rma.problem_description||'','Dealer Comments':rma.dealer_comments||'','Authorized By':rma.authorized_by||'','Auth Date':fmtDate(rma.authorized_date),'Received By':rma.return_received_by||'','Auth Comments':rma.authorizer_comments||'','Date Created':fmtDate(rma.created_at)}]);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'RMA'); XLSX.writeFile(wb,`RMA_${rma.rma_number}.xlsx`);
};

const exportTableXLSX = (data,filename) => {
  if(!data.length) return;
  const ws=XLSX.utils.json_to_sheet(data.map(r=>({'RMA Number':r.rma_number,'Dealer':r.company_name||r.dealer_name,'Product':r.product_description,'Status':statusTxt(r.status),'Authorized By':r.authorized_by||'','Return Date':fmtDate(r.return_date),'Date Created':fmtDate(r.created_at)})));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Export'); XLSX.writeFile(wb,`${filename}.xlsx`);
};

const exportTablePDF = (data,title) => {
  if(!data.length) return;
  const doc=new jsPDF();
  doc.setFontSize(16); doc.setTextColor(30,58,95); doc.text(title,doc.internal.pageSize.getWidth()/2,15,{align:'center'});
  autoTable(doc,{startY:25,head:[['RMA Number','Dealer','Product','Status','Date']],body:data.map(r=>[r.rma_number,r.company_name||r.dealer_name,(r.product_description||'').substring(0,40),statusTxt(r.status),fmtDate(r.created_at)]),theme:'striped',headStyles:{fillColor:[30,58,95],textColor:255},alternateRowStyles:{fillColor:[248,250,252]}});
  doc.save(`${title.replace(/\s/g,'_')}.pdf`);
};

// ─── Media Viewer (in-app lightbox) ──────────────────────────────────────────
const MediaViewer = ({ items, startIndex, onClose }) => {
  const [idx,setIdx] = useState(startIndex);
  useEffect(()=>{ const fn=e=>{ if(e.key==='Escape') onClose(); if(e.key==='ArrowRight') setIdx(i=>Math.min(i+1,items.length-1)); if(e.key==='ArrowLeft') setIdx(i=>Math.max(i-1,0)); }; window.addEventListener('keydown',fn); return()=>window.removeEventListener('keydown',fn); },[items.length,onClose]);
  if(!items.length) return null;
  const item=items[idx];
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',zIndex:9000,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{width:'100%',maxWidth:900,padding:'0 16px'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',color:'#e2e8f0'}}>
          <span style={{fontSize:13,opacity:.7}}>{idx+1} / {items.length}</span>
          <div style={{display:'flex',gap:10}}>
            <a href={item?.url} download target="_blank" rel="noopener noreferrer" style={{background:'#1e3a5f',color:'white',padding:'6px 14px',borderRadius:6,fontSize:12,textDecoration:'none'}}>↓ Download</a>
            <button onClick={onClose} style={{background:'rgba(255,255,255,.1)',border:'none',color:'white',width:32,height:32,borderRadius:6,cursor:'pointer',fontSize:18}}>✕</button>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:400,background:'rgba(255,255,255,.04)',borderRadius:12,overflow:'hidden'}}>
          {item?.resource_type==='image'
            ? <img src={item.url} alt="" style={{maxWidth:'100%',maxHeight:'70vh',objectFit:'contain',borderRadius:8}}/>
            : <video src={item?.url} controls style={{maxWidth:'100%',maxHeight:'70vh',borderRadius:8}}/>}
        </div>
        {items.length>1 && (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0'}}>
            <button onClick={()=>setIdx(i=>i-1)} disabled={idx===0} style={{background:'rgba(255,255,255,.1)',border:'none',color:'white',padding:'8px 18px',borderRadius:6,cursor:'pointer',opacity:idx===0?0.5:1}}>← Prev</button>
            <div style={{display:'flex',gap:6}}>
              {items.map((_,i)=><span key={i} onClick={()=>setIdx(i)} style={{width:8,height:8,borderRadius:'50%',background:i===idx?'#2563eb':'rgba(255,255,255,.3)',cursor:'pointer',display:'inline-block'}}/>)}
            </div>
            <button onClick={()=>setIdx(i=>i+1)} disabled={idx===items.length-1} style={{background:'rgba(255,255,255,.1)',border:'none',color:'white',padding:'8px 18px',borderRadius:6,cursor:'pointer',opacity:idx===items.length-1?0.5:1}}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Attachment Block ─────────────────────────────────────────────────────────
const AttBlock = ({ atts, label, cls }) => {
  const [viewerIdx,setViewerIdx] = useState(null);
  if(!atts?.length) return null;
  const mediaItems = atts.filter(a=>a.resource_type==='image'||a.resource_type==='video');
  return (
    <div className="section-attachments">
      <div className={`attachment-label ${cls}`}>{label}</div>
      <div className="attachment-grid">
        {atts.map((att,i)=>{
          const name = att.original_filename||att.filename||fallbackName(att.url);
          if(att.resource_type==='image') return <div key={i} onClick={()=>setViewerIdx(mediaItems.findIndex(m=>m.url===att.url))} style={{cursor:'pointer'}}><img src={att.url} alt="" className="attachment-img"/></div>;
          if(att.resource_type==='video') return <div key={i} onClick={()=>setViewerIdx(mediaItems.findIndex(m=>m.url===att.url))} style={{cursor:'pointer',position:'relative'}}><video src={att.url} className="attachment-video" style={{pointerEvents:'none'}}/><div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.3)',borderRadius:8}}><span style={{fontSize:32,color:'white'}}>▶</span></div></div>;
          return <div key={i} className="attachment-file-card" onClick={()=>dlFile(att.url,name)}><div className="attachment-file-icon">{getIcon(att.resource_type,att.url)}</div><div className="attachment-file-name">{name}</div><div className="attachment-file-download">⬇ Download</div></div>;
        })}
      </div>
      {viewerIdx!==null && <MediaViewer items={mediaItems} startIndex={viewerIdx} onClose={()=>setViewerIdx(null)}/>}
    </div>
  );
};

const PreviewStrip = ({ previews, onRemove }) => !previews.length?null:(
  <div className="preview-strip">
    {previews.map((p,i)=>(
      <div key={i} className="preview-item">
        {p.type?.startsWith('image/')?<img src={p.url} alt="preview"/>:p.type?.startsWith('video/')?<video src={p.url} controls style={{width:'100%',height:80,objectFit:'cover'}}/>:<div style={{padding:'10px 6px',textAlign:'center',fontSize:11,color:'#64748b'}}><div style={{fontSize:24}}>{getIcon('raw',p.url)}</div><div>{p.name?.substring(0,12)}</div></div>}
        <button className="preview-remove" onClick={()=>onRemove(i)}>×</button>
      </div>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AuthorizerDashboard({ user, onLogout }) {
  const [activeTab,setActiveTab]       = useState('pending');
  const [pendingRmas,setPendingRmas]   = useState([]);
  const [historyRmas,setHistoryRmas]   = useState([]);
  const [loading,setLoading]           = useState(true);
  const [selectedRMA,setSelectedRMA]   = useState(null);
  const [viewMode,setViewMode]         = useState('view');
  const [editMode,setEditMode]         = useState(false);
  const [showConfirm,setShowConfirm]   = useState(false);
  const [pendingId,setPendingId]       = useState(null);
  const [toast,setToast]               = useState({show:false,message:'',type:''});
  const [updateBanner,setUpdateBanner] = useState(null);
  const [uploading,setUploading]       = useState(false);
  const [lastFetch,setLastFetch]       = useState(Date.now());
  const [authAtts,setAuthAtts]         = useState([]);
  const [authPrev,setAuthPrev]         = useState([]);
  const [editAtts,setEditAtts]         = useState([]);
  const [editPrev,setEditPrev]         = useState([]);
  const prevPendingRef                 = useRef([]);

  const [authData,setAuthData] = useState({ authorized_by:'', authorized_date:new Date().toISOString().split('T')[0], return_date:'', return_received_by:'', authorizer_comments:'' });
  const [editData,setEditData] = useState({ authorized_by:'', return_date:'', return_received_by:'', authorizer_comments:'' });

  useEffect(()=>{ document.title='Authorizer Dashboard'; },[]);
  useEffect(()=>{ fetchPending(); fetchHistory(); const iv=setInterval(()=>{fetchPending();fetchHistory();},5000); return()=>clearInterval(iv); },[]);
  useEffect(()=>{ if(toast.show){ const t=setTimeout(()=>setToast({show:false,message:'',type:''}),3000); return()=>clearTimeout(t); } },[toast.show]);

  const showToast = (message,type) => setToast({show:true,message,type});

  const fetchPending = async () => {
    try {
      const res = await api.get('/api/authorizer/pending');
      const parsed = (res.data.rmas||[]).map(r=>({...r,attachments:parseAtts(r.attachments)}));
      const prev = prevPendingRef.current;
      const prevIds = prev.map(r=>r.id);
      const newIds = parsed.map(r=>r.id).filter(id=>!prevIds.includes(id));
      const changed = prev.length>0 ? parsed.filter(r=>{ const o=prev.find(x=>x.id===r.id); return o&&o.status!==r.status; }) : [];
      const updateCount = newIds.length + changed.length;
      if(updateCount>0){ setUpdateBanner({count:updateCount,isNew:newIds.length>0}); setTimeout(()=>setUpdateBanner(null),5000); }
      prevPendingRef.current = parsed;
      setPendingRmas(parsed); setLastFetch(Date.now());
    } catch(e){ console.error(e); }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/authorizer/history');
      setHistoryRmas((res.data.rmas||[]).map(r=>({...r,attachments:parseAtts(r.attachments),authorizer_attachments:parseAtts(r.authorizer_attachments)})));
    } catch(e){ console.error(e); } finally { setLoading(false); }
  };

  const closeModal = () => { setSelectedRMA(null); setViewMode('view'); setAuthAtts([]); setAuthPrev([]); setAuthData({authorized_by:'',authorized_date:new Date().toISOString().split('T')[0],return_date:'',return_received_by:'',authorizer_comments:''}); };

  const handleFileChange = (e,setAtts,setPrev) => {
    Array.from(e.target.files).forEach(file=>{ const r=new FileReader(); r.onloadend=()=>setPrev(p=>[...p,{url:r.result,name:file.name,type:file.type}]); r.readAsDataURL(file); });
    setAtts(p=>[...p,...Array.from(e.target.files)]);
  };
  const removeAtt = (i,setA,setP) => { setA(p=>p.filter((_,j)=>j!==i)); setP(p=>p.filter((_,j)=>j!==i)); };

  const handleShowConfirm = id => {
    if(!authData.authorized_by){ alert('Please select Authorized By'); return; }
    if(!authData.return_date){ alert('Please select Return Date'); return; }
    if(!authData.return_received_by){ alert('Please enter Return Received By'); return; }
    setPendingId(id); setShowConfirm(true);
  };

  const handleAuthorize = async () => {
    setUploading(true);
    const fd=new FormData();
    Object.entries(authData).forEach(([k,v])=>fd.append(k,v));
    fd.append('attachment_names',JSON.stringify(authAtts.map(f=>f.name)));
    authAtts.forEach(f=>fd.append('authorizer_attachments',f));
    try { await api.put(`/api/authorizer/authorize/${pendingId}`,fd,{headers:{'Content-Type':'multipart/form-data'}}); showToast('RMA authorized successfully.','success'); setShowConfirm(false); closeModal(); fetchPending(); fetchHistory(); }
    catch(e){ alert(e.response?.data?.error||'Failed'); } finally { setUploading(false); }
  };

  const handleReject = async id => { const c=prompt('Enter rejection reason:'); if(!c) return; try { await api.put(`/api/authorizer/reject/${id}`,{authorized_by:user.id,authorizer_comments:c}); showToast('RMA rejected.','info'); closeModal(); fetchPending(); } catch(e){ alert(e.response?.data?.error||'Failed'); } };
  const handleBackToDealer = async id => { const c=prompt('Enter comments for dealer:'); if(!c) return; try { await api.put(`/api/authorizer/back-to-dealer/${id}`,{authorized_by:user.id,authorizer_comments:c}); showToast('RMA returned to dealer.','info'); closeModal(); fetchPending(); } catch(e){ alert(e.response?.data?.error||'Failed'); } };

  const handleUpdateAuthorized = async () => {
    if(!editData.authorized_by||!editData.return_date||!editData.return_received_by){ alert('All required fields must be filled'); return; }
    setUploading(true);
    const fd=new FormData();
    Object.entries(editData).forEach(([k,v])=>fd.append(k,v));
    fd.append('attachment_names',JSON.stringify(editAtts.map(f=>f.name)));
    editAtts.forEach(f=>fd.append('authorizer_attachments',f));
    try { await api.put(`/api/authorizer/update_authorized/${selectedRMA.id}`,fd,{headers:{'Content-Type':'multipart/form-data'}}); showToast('Authorization updated.','success'); setSelectedRMA(null); setEditMode(false); fetchHistory(); }
    catch(e){ alert(e.response?.data?.error||'Update failed'); } finally { setUploading(false); }
  };

  // ─── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="dash-root">
      <Navbar user={user} onLogout={onLogout} title="Authorizer Dashboard"/>

      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{toast.type==='success'?'✓':toast.type==='info'?'i':'!'}</span>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={()=>setToast({show:false,message:'',type:''})}>×</button>
        </div>
      )}

      {updateBanner && (
        <div className="update-banner">
          <span className="update-banner-dot"/>
          <strong>{updateBanner.count} RMA{updateBanner.count>1?'s':''} {updateBanner.isNew?'received':'updated'}</strong>
          <span className="update-banner-sub"> — dashboard refreshed automatically</span>
          <button className="update-banner-close" onClick={()=>setUpdateBanner(null)}>×</button>
        </div>
      )}

      <div className="dash-container">
        <div className="top-bar">
          <span className="last-updated">Last updated: {new Date(lastFetch).toLocaleTimeString()}<span className="live-dot"/></span>
          <button className="btn-refresh" onClick={()=>{fetchPending();fetchHistory();}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>

        <div className="stats-row stats-row--2">
          <div className="stat-card"><div className="stat-accent" style={{backgroundColor:'#f97316'}}/><div className="stat-label">Pending Authorization</div><div className="stat-value" style={{color:'#f97316'}}>{pendingRmas.length}</div></div>
          <div className="stat-card"><div className="stat-accent" style={{backgroundColor:'#10b981'}}/><div className="stat-label">Total Authorized</div><div className="stat-value" style={{color:'#10b981'}}>{historyRmas.length}</div></div>
        </div>

        <div className="tab-bar" style={{justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',gap:4}}>
            <button className={`tab-btn${activeTab==='pending'?' active':''}`} onClick={()=>setActiveTab('pending')}>Pending ({pendingRmas.length})</button>
            <button className={`tab-btn${activeTab==='history'?' active':''}`} onClick={()=>setActiveTab('history')}>History ({historyRmas.length})</button>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn-export" onClick={()=>exportTableXLSX(activeTab==='pending'?pendingRmas:historyRmas,activeTab==='pending'?'Pending_Authorization':'Authorization_History')}>📎 Excel</button>
            <button className="btn-export btn-pdf" onClick={()=>exportTablePDF(activeTab==='pending'?pendingRmas:historyRmas,activeTab==='pending'?'Pending Authorization':'Authorization History')}>📄 PDF</button>
          </div>
        </div>

        {activeTab==='pending' && (
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Pending RMA Requests</span></div>
            {loading?<div className="loading-state">Loading…</div>:pendingRmas.length===0?<div className="empty-state">No pending RMA requests.</div>:(
              <div className="table-wrap"><table className="data-table">
                <thead><tr><th>RMA Number</th><th>Dealer</th><th>Product</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>{pendingRmas.map(r=>(
                  <tr key={r.id}>
                    <td className="td-rma">{r.rma_number}</td>
                    <td>{r.company_name}</td>
                    <td className="td-truncate">{(r.product_description||'').substring(0,40)}{r.product_description?.length>40?'…':''}</td>
                    <td>{fmtDate(r.created_at)}</td>
                    <td><div className="action-btns">
                      <button className="btn-action btn-view" onClick={()=>{setSelectedRMA({...r,attachments:parseAtts(r.attachments),authorizer_attachments:parseAtts(r.authorizer_attachments)});setViewMode('view');}}>Review</button>
                      <button className="btn-action btn-approve" onClick={()=>{setSelectedRMA({...r,attachments:parseAtts(r.attachments)});setViewMode('approve');setAuthAtts([]);setAuthPrev([]);setAuthData({authorized_by:'',authorized_date:new Date().toISOString().split('T')[0],return_date:'',return_received_by:'',authorizer_comments:''});}}>Authorize</button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
        )}

        {activeTab==='history' && (
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Authorization History</span></div>
            {loading?<div className="loading-state">Loading…</div>:historyRmas.length===0?<div className="empty-state">No authorized RMAs yet.</div>:(
              <div className="table-wrap"><table className="data-table">
                <thead><tr><th>RMA Number</th><th>Dealer</th><th>Authorized By</th><th>Return Date</th><th>Actions</th></tr></thead>
                <tbody>{historyRmas.map(r=>(
                  <tr key={r.id}>
                    <td className="td-rma">{r.rma_number}</td>
                    <td>{r.company_name}</td>
                    <td>{r.authorized_by||'N/A'}</td>
                    <td>{fmtDate(r.return_date)}</td>
                    <td><div className="action-btns">
                      <button className="btn-action btn-view" onClick={()=>{setSelectedRMA({...r,attachments:parseAtts(r.attachments),authorizer_attachments:parseAtts(r.authorizer_attachments)});setViewMode('view');setEditMode(false);}}>Review</button>
                      <button className="btn-action btn-edit" onClick={()=>{setSelectedRMA({...r,attachments:parseAtts(r.attachments),authorizer_attachments:parseAtts(r.authorizer_attachments)});setEditData({authorized_by:r.authorized_by||'',return_date:r.return_date||'',return_received_by:r.return_received_by||'',authorizer_comments:r.authorizer_comments||''});setEditAtts([]);setEditPrev([]);setEditMode(true);}}>Edit</button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* VIEW MODAL */}
      {selectedRMA && viewMode==='view' && !editMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box modal-large" onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h2>RMA Details — {selectedRMA.rma_number}</h2><button className="modal-close" onClick={closeModal}>×</button></div>
            <div className="detail-meta">
              <span className={`status-badge status-${selectedRMA.status}`}>{statusTxt(selectedRMA.status)}</span>
              <div><strong>Created:</strong> {fmtDate(selectedRMA.created_at)}</div>
              <div><strong>Updated:</strong> {fmtDate(selectedRMA.updated_at)}</div>
              <div style={{marginLeft:'auto',display:'flex',gap:8}}>
                <button className="btn-export" onClick={()=>downloadRMAExcel(selectedRMA)} style={{padding:'4px 12px',fontSize:11}}>📎 Excel</button>
                <button className="btn-export btn-pdf" onClick={()=>downloadRMAPDF(selectedRMA)} style={{padding:'4px 12px',fontSize:11}}>📄 PDF</button>
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">RMA Details</div>
              <div className="detail-grid-2">
                <div><span>Filer Name</span>{selectedRMA.filer_name||'N/A'}</div>
                <div><span>Distributor</span>{selectedRMA.distributor_name||'N/A'}</div>
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
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={()=>downloadRMAExcel(selectedRMA)}>Download Excel</button>
              <button className="btn-ghost-dark" onClick={()=>downloadRMAPDF(selectedRMA)}>Download PDF</button>
              <button className="btn-primary-dark" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* AUTHORIZE MODAL */}
      {selectedRMA && viewMode==='approve' && !editMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box modal-large" onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h2>Authorize RMA — {selectedRMA.rma_number}</h2><button className="modal-close" onClick={closeModal}>×</button></div>
            <div className="detail-section">
              <div className="detail-section-title section-blue">RMA Summary</div>
              <div className="detail-grid-2">
                <div><span>Filer</span>{selectedRMA.filer_name||'N/A'}</div>
                <div><span>Distributor</span>{selectedRMA.distributor_name||'N/A'}</div>
                <div><span>Product</span>{selectedRMA.product||'N/A'}</div>
                <div><span>Description</span>{selectedRMA.product_description||'N/A'}</div>
                <div><span>Reason</span>{selectedRMA.reason_for_return||'N/A'}</div>
                <div><span>End User</span>{selectedRMA.end_user_company||'N/A'}</div>
              </div>
              <AttBlock atts={selectedRMA.attachments} label="Dealer Attachments" cls="section-blue"/>
            </div>
            <div className="detail-section">
              <div className="detail-section-title section-pink">Authorization Details</div>
              <div className="form-group"><label>Authorized By <span className="required">*</span></label><select value={authData.authorized_by} onChange={e=>setAuthData({...authData,authorized_by:e.target.value})}><option value="">Select Authorizer</option>{AUTH_BY_OPTS.map(n=><option key={n} value={n}>{n}</option>)}</select></div>
              <div className="form-group"><label>Authorized Date</label><input type="date" value={authData.authorized_date} disabled/><small>Auto-generated today's date</small></div>
              <div className="form-group"><label>Return Date <span className="required">*</span></label><input type="date" value={authData.return_date} onChange={e=>setAuthData({...authData,return_date:e.target.value})}/></div>
              <div className="form-group"><label>Return Received By <span className="required">*</span></label><input type="text" value={authData.return_received_by} onChange={e=>setAuthData({...authData,return_received_by:e.target.value})} placeholder="Name of person who received the returned item"/></div>
              <div className="form-group"><label>Comments</label><textarea rows="3" value={authData.authorizer_comments} onChange={e=>setAuthData({...authData,authorizer_comments:e.target.value})} placeholder="Additional notes…"/></div>
              <div className="form-group"><label>Upload Supporting Files</label><input type="file" multiple accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" onChange={e=>handleFileChange(e,setAuthAtts,setAuthPrev)}/><small>Images, Videos, PDF, Word, Excel, ZIP accepted</small></div>
              <PreviewStrip previews={authPrev} onRemove={i=>removeAtt(i,setAuthAtts,setAuthPrev)}/>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={()=>handleReject(selectedRMA.id)}>Reject</button>
              <button className="btn-ghost-dark" onClick={()=>handleBackToDealer(selectedRMA.id)}>Back to Dealer</button>
              <button className="btn-primary-dark" onClick={()=>handleShowConfirm(selectedRMA.id)} disabled={uploading}>{uploading?'Processing…':'Submit Authorization'}</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="modal-overlay" onClick={()=>setShowConfirm(false)}>
          <div className="modal-box modal-confirm" onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h2>Confirm Authorization</h2><button className="modal-close" onClick={()=>setShowConfirm(false)}>×</button></div>
            <div className="confirm-body">
              <div className="confirm-icon">?</div>
              <p>Are you sure you want to authorize this RMA request?</p>
              <p className="confirm-sub">Please review the details before confirming.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={()=>setShowConfirm(false)}>Cancel</button>
              <button className="btn-primary-dark" onClick={handleAuthorize} disabled={uploading}>{uploading?'Processing…':'Confirm Authorization'}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {selectedRMA && editMode && (
        <div className="modal-overlay" onClick={()=>{setSelectedRMA(null);setEditMode(false);}}>
          <div className="modal-box modal-medium" onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h2>Edit Authorization — {selectedRMA.rma_number}</h2><button className="modal-close" onClick={()=>{setSelectedRMA(null);setEditMode(false);}}>×</button></div>
            <div className="form-group"><label>Authorized By <span className="required">*</span></label><select value={editData.authorized_by} onChange={e=>setEditData({...editData,authorized_by:e.target.value})}><option value="">Select Authorizer</option>{AUTH_BY_OPTS.map(n=><option key={n} value={n}>{n}</option>)}</select></div>
            <div className="form-group"><label>Return Date <span className="required">*</span></label><input type="date" value={editData.return_date} onChange={e=>setEditData({...editData,return_date:e.target.value})}/></div>
            <div className="form-group"><label>Return Received By <span className="required">*</span></label><input type="text" value={editData.return_received_by} onChange={e=>setEditData({...editData,return_received_by:e.target.value})}/></div>
            <div className="form-group"><label>Comments</label><textarea rows="4" value={editData.authorizer_comments} onChange={e=>setEditData({...editData,authorizer_comments:e.target.value})}/></div>
            <div className="form-group"><label>Add / Replace Files</label><input type="file" multiple accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" onChange={e=>handleFileChange(e,setEditAtts,setEditPrev)}/><small>Upload new files to replace existing ones</small></div>
            <PreviewStrip previews={editPrev} onRemove={i=>removeAtt(i,setEditAtts,setEditPrev)}/>
            {selectedRMA.authorizer_attachments?.length>0 && editPrev.length===0 && (
              <div className="form-group">
                <label>Current Files</label>
                <AttBlock atts={selectedRMA.authorizer_attachments} label="Existing Attachments" cls="section-pink"/>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn-ghost-dark" onClick={()=>{setSelectedRMA(null);setEditMode(false);}}>Cancel</button>
              <button className="btn-primary-dark" onClick={handleUpdateAuthorized} disabled={uploading}>{uploading?'Saving…':'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}