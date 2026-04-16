import { useState, useEffect, useRef } from 'react';
import './DealerMyRMAs.css';
import api from '../api';

const API = '/api/dealer/rma';
const STATUS_TEXT = { pending_dealer:'Pending (Need Edit)', pending_authorizer:'Pending Auth', pending_approver:'Pending Approval', authorized:'Authorized', approved:'Approved', rejected:'Rejected' };
const STATUS_OPTS = [
  {v:'all',l:'All Status'},{v:'pending_dealer',l:'Pending (Need Edit)'},{v:'pending_authorizer',l:'Pending Auth'},
  {v:'pending_approver',l:'Pending Approval'},{v:'authorized',l:'Authorized'},{v:'approved',l:'Approved'},{v:'rejected',l:'Rejected'}
];

// ✅ GET FILE ICON based on resource type
const getFileIcon = (resourceType, url) => {
  if (resourceType === 'image') return '🖼️';
  if (resourceType === 'video') return '🎥';
  if (resourceType === 'raw') {
    if (url?.includes('.pdf')) return '📄';
    if (url?.includes('.doc') || url?.includes('.docx')) return '📝';
    if (url?.includes('.xls')) return '📊';
    return '📎';
  }
  return '📎';
};

// ✅ Helper para makuha ang filename mula sa URL
const getFileNameFromUrl = (url) => {
  if (!url) return 'File';
  const parts = url.split('/');
  let fileName = parts[parts.length - 1];
  fileName = fileName.replace(/^v\d+_/, '');
  return fileName.substring(0, 25);
};

// ✅ DOWNLOAD function na may original filename
const handleDownload = (url, originalFilename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = originalFilename || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const parseAtts    = a => !a?[]:Array.isArray(a)?a:(typeof a==='string'?(JSON.parse(a)||[]):[]);
const getStatusTxt = s => STATUS_TEXT[s]||s;
const StatusBadge  = ({s}) => <span className={`dmr-badge dmr-badge-${s}`}>{getStatusTxt(s)}</span>;

// ✅ Attachment Block with proper file handling
const AttachmentBlock = ({atts,label,cls}) => {
  if (!atts?.length) return null;
  return (
    <div className="dmr-attach-block">
      <div className={`dmr-attach-label ${cls}`}>{label}</div>
      <div className="dmr-attach-grid">
        {atts.map((att, idx) => {
          const isImage = att.resource_type === 'image';
          const isVideo = att.resource_type === 'video';
          const fileName = att.original_filename || att.filename || getFileNameFromUrl(att.url);
          
          if (isImage) {
            return (
              <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer">
                <img src={att.url} alt="" className="dmr-att-img" />
              </a>
            );
          } else if (isVideo) {
            return (
              <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer">
                <video src={att.url} controls className="dmr-att-video" />
              </a>
            );
          } else {
            return (
              <div key={idx} className="attachment-file-card" onClick={() => handleDownload(att.url, fileName)}>
                <div className="attachment-file-icon">{getFileIcon(att.resource_type, att.url)}</div>
                <div className="attachment-file-name">{fileName}</div>
                <div className="attachment-file-download">⬇ Download</div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

function DealerMyRMAs({ dealerId, updatedIds=[], onMarkRead }) {
  const [rmas,         setRmas]         = useState([]);
  const [filtered,     setFiltered]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState(null);
  const [toast,        setToast]        = useState({show:false,message:'',type:''});

  useEffect(()=>{ fetchRMAs(); },[]);
  useEffect(()=>{ filterRMAs(); },[rmas,search,statusFilter]);
  useEffect(()=>{ if(toast.show){const t=setTimeout(()=>setToast({show:false,message:'',type:''}),3000);return()=>clearTimeout(t);} },[toast.show]);

  const showToast = (message,type) => setToast({show:true,message,type});

  const fetchRMAs = async () => {
    try {
      const res = await api.get(`${API}/my-requests/${dealerId}`);
      setRmas((res.data.rmas||[]).map(r=>({...r, attachments:parseAtts(r.attachments), authorizer_attachments:parseAtts(r.authorizer_attachments), approver_attachments:parseAtts(r.approver_attachments)})));
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  };

  const filterRMAs = () => {
    let f = [...rmas];
    if (search) f = f.filter(r=>[r.rma_number,r.product_description,r.reason_for_return].some(v=>(v||'').toLowerCase().includes(search.toLowerCase())));
    if (statusFilter==='pending') f = f.filter(r=>['pending_dealer','pending_authorizer','pending_approver'].includes(r.status));
    else if (statusFilter!=='all') f = f.filter(r=>r.status===statusFilter);
    setFiltered(f);
  };

  const handleView = rma => { onMarkRead?.(rma.id); setSelected({...rma,attachments:parseAtts(rma.attachments),authorizer_attachments:parseAtts(rma.authorizer_attachments),approver_attachments:parseAtts(rma.approver_attachments)}); };
  const closeModal = () => setSelected(null);

  const handleCancel = async id => {
    if (!window.confirm('Cancel this RMA request? This cannot be undone.')) return;
    setCancellingId(id);
    try {
      await api.delete(`${API}/delete/${id}/${dealerId}`);
      showToast('RMA cancelled successfully.','success');
      fetchRMAs();
    } catch(e){ showToast(e.response?.data?.error||'Failed to cancel','error'); }
    finally{ setCancellingId(null); }
  };

  const isUpdated = id => updatedIds.includes(id);

  return (
    <div className="dmr-root">
      {toast.show && (
        <div className={`dmr-toast dmr-toast-${toast.type}`}>
          <span>{toast.type==='success'?'✓':'!'}</span>
          <span>{toast.message}</span>
          <button onClick={()=>setToast({show:false,message:'',type:''})}>×</button>
        </div>
      )}

      <div className="dmr-panel">
        <div className="dmr-panel-head">
          <span className="dmr-panel-title">My RMA Requests</span>
          <div className="dmr-panel-actions">
            <div className="dmr-search-wrap">
              <svg className="dmr-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="dmr-search" placeholder="Search RMA, product, reason…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select className="dmr-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              {STATUS_OPTS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <button className="dmr-btn-ghost" onClick={()=>{setSearch('');setStatusFilter('all');}}>Clear</button>
          </div>
        </div>

        <div className="dmr-result-count">Showing {filtered.length} of {rmas.length} requests</div>

        {loading ? <div className="dmr-empty">Loading…</div>
        : filtered.length===0 ? <div className="dmr-empty">No RMA requests found.</div>
        : (
          <div className="dmr-table-wrap">
            <table className="dmr-table">
              <thead><tr><th>RMA Number</th><th>Date</th><th>Product</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(r=>(
                  <tr key={r.id} className={isUpdated(r.id)?'dmr-row-updated':''}>
                    <td className="dmr-td-rma">
                      {r.rma_number}
                      {isUpdated(r.id)&&<span className="dmr-new-badge">UPDATED</span>}
                    </td>
                    <td>{r.created_at?.split('T')[0]}</td>
                    <td className="dmr-td-trunc">{(r.product_description||'').substring(0,40)}{r.product_description?.length>40?'…':''}</td>
                    <td><StatusBadge s={r.status}/></td>
                    <td>
                      <div className="dmr-action-btns">
                        <button className="dmr-btn-action dmr-btn-view" onClick={()=>handleView(r)}>View</button>
                        {['pending_dealer','pending_authorizer'].includes(r.status) && (
                          <button className="dmr-btn-action dmr-btn-cancel" onClick={()=>handleCancel(r.id)} disabled={cancellingId===r.id}>
                            {cancellingId===r.id?'…':'Cancel'}
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

      {/* View Modal */}
      {selected && (
        <div className="dmr-overlay" onClick={closeModal}>
          <div className="dmr-modal" onClick={e=>e.stopPropagation()}>
            <div className="dmr-modal-head">
              <h2>RMA Details — {selected.rma_number}</h2>
              <button className="dmr-modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="dmr-meta">
              <div><StatusBadge s={selected.status}/></div>
              <div><strong>Created:</strong> {new Date(selected.created_at).toLocaleString()}</div>
              <div><strong>Updated:</strong> {new Date(selected.updated_at).toLocaleString()}</div>
            </div>

            {/* Filer Info */}
            <div className="dmr-section">
              <div className="dmr-section-title">Filer Information</div>
              <div className="dmr-grid-3">
                <div><span>Filer Name</span>{selected.filer_name||'N/A'}</div>
                <div><span>Distributor</span>{selected.distributor_name||'N/A'}</div>
                <div><span>Date Filled</span>{selected.date_filled||'N/A'}</div>
              </div>
            </div>

            {/* RMA Details */}
            <div className="dmr-section">
              <div className="dmr-section-title">Return Merchandise Authorization</div>
              <div className="dmr-grid-2">
                <div><span>Product</span>{selected.product||'N/A'}</div>
                <div><span>Description</span>{selected.product_description||'N/A'}</div>
                <div><span>Return Type</span>{selected.return_type||'N/A'}</div>
                <div><span>Reason</span>{selected.reason_for_return||'N/A'}</div>
                <div><span>Warranty</span>{selected.warranty?'Yes':'No'}</div>
                <div><span>Work Environment</span>{selected.work_environment||'N/A'}</div>
                <div><span>PO Number</span>{selected.po_number||'N/A'}</div>
                <div><span>Sales Invoice</span>{selected.sales_invoice_number||'N/A'}</div>
                <div><span>Shipping Date</span>{selected.shipping_date||'N/A'}</div>
                <div><span>Return Date</span>{selected.return_date||'N/A'}</div>
              </div>
              <AttachmentBlock atts={selected.attachments} label="Dealer Attachments" cls="dmr-cls-blue"/>
            </div>

            {/* End User */}
            <div className="dmr-section">
              <div className="dmr-section-title">End User Details</div>
              <div className="dmr-grid-2">
                <div><span>Company</span>{selected.end_user_company||'N/A'}</div>
                <div><span>Location</span>{selected.end_user_location||'N/A'}</div>
                <div><span>Industry</span>{selected.end_user_industry||'N/A'}</div>
                <div><span>Contact</span>{selected.end_user_contact_person||'N/A'}</div>
              </div>
            </div>

            {/* Problem */}
            <div className="dmr-section">
              <div className="dmr-section-title">Problem & Comments</div>
              <div className="dmr-prose">
                <p><strong>Problem Description</strong><br/>{selected.problem_description||'N/A'}</p>
                <p><strong>Dealer Comments</strong><br/>{selected.dealer_comments||'None'}</p>
              </div>
            </div>

            {/* Authorization */}
            {selected.authorized_by && (
              <div className="dmr-section">
                <div className="dmr-section-title dmr-cls-pink">Authorization Details</div>
                <div className="dmr-grid-2">
                  <div><span>Authorized By</span>{selected.authorized_by}</div>
                  <div><span>Authorized Date</span>{selected.authorized_date||'N/A'}</div>
                  <div><span>Return Received By</span>{selected.return_received_by||'N/A'}</div>
                  <div><span>Comments</span>{selected.authorizer_comments||'None'}</div>
                </div>
                <AttachmentBlock atts={selected.authorizer_attachments} label="Authorizer Attachments" cls="dmr-cls-pink"/>
              </div>
            )}

            {/* Approval */}
            {selected.approved_by && (
              <div className="dmr-section">
                <div className="dmr-section-title dmr-cls-green">Approval Details</div>
                <div className="dmr-grid-2">
                  <div><span>Approved By</span>{selected.approved_by}</div>
                  <div><span>Approved Date</span>{selected.approved_date||'N/A'}</div>
                  <div><span>Approved With</span>{selected.approved_with||'N/A'}</div>
                  <div><span>Replacement / Credit Note</span>{selected.replacement_order_no||'N/A'}</div>
                  <div><span>Closed Date</span>{selected.closed_date||'N/A'}</div>
                  <div><span>Comments</span>{selected.approver_comments||'None'}</div>
                </div>
                <AttachmentBlock atts={selected.approver_attachments} label="Approver Attachments" cls="dmr-cls-green"/>
              </div>
            )}

            <div className="dmr-modal-foot">
              {['pending_dealer','pending_authorizer'].includes(selected.status) && (
                <button className="dmr-btn-cancel-cta" onClick={()=>{ handleCancel(selected.id); closeModal(); }}>Cancel Request</button>
              )}
              <button className="dmr-btn-primary" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DealerMyRMAs;