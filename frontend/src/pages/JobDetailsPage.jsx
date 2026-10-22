import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Wrench, Video, FileText, Upload, CheckCircle2, AlertCircle, Pencil } from 'lucide-react';
import StatusBadge from '../components/Common/StatusBadge';
import Loading from '../components/Common/Loading';
import Button from '../components/Common/Button';
import Modal from '../components/Common/Modal';
import Input from '../components/Common/Input';
import InvoiceFormModal from '../components/Common/InvoiceFormModal';
import mediaUrl from '../utils/mediaUrl';
import {
  fetchJobById,
  updateJob,
  updateJobStatus,
  uploadJobMedia
} from '../store/slices/jobSlice';
import { fetchInvoices } from '../store/slices/invoiceSlice';

const fmt = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '—');
const pad = (n) => String(n).padStart(2, '0');

function VideoSlot({ label, accent, video, onFile, uploading, error }) {
  const inputRef = useRef(null);
  const src = mediaUrl(video?.url);

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${accent}`}>
        {label}
      </span>

      {src ? (
        <div className="space-y-2">
          <video key={src} controls preload="metadata" className="w-full rounded-lg bg-black" src={src}>
            Your browser does not support video playback.
          </video>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Uploaded {video?.uploadedAt ? String(video.uploadedAt).replace('T', ' ').slice(0, 16) : ''}
            </span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-semibold text-blue-800 hover:underline cursor-pointer"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Replace video'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-48 bg-slate-50 rounded-lg flex flex-col items-center justify-center border border-dashed border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-blue-300 transition-colors cursor-pointer"
        >
          <Upload className="w-6 h-6 mb-2 text-slate-400" />
          <span className="text-xs font-semibold">
            {uploading ? 'Uploading video...' : 'Click to upload video'}
          </span>
          <span className="text-[11px] text-slate-400 mt-1">MP4 / MOV / WebM (max 200 MB)</span>
        </button>
      )}

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function JobDetailsPage() {
  const { jobId } = useParams();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('specs');
  const [uploading, setUploading] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [showCompletePrompt, setShowCompletePrompt] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceWarning, setInvoiceWarning] = useState('');

  const { items: allJobs, selectedJob, isLoading } = useSelector((state) => state.jobs);
  const { items: invoices } = useSelector((state) => state.invoices);

  useEffect(() => {
    if (jobId) {
      dispatch(fetchJobById(jobId));
    }
    dispatch(fetchInvoices({ limit: 100 }));
  }, [dispatch, jobId]);

  const job = selectedJob || allJobs.find((j) => j._id === jobId || j.jobId === jobId) || null;
  const jobStatus = job?.jobStatus || job?.status || 'scheduled';

  const handleStatusChange = async (newStatus) => {
    if (!job?._id) return;
    setStatusError('');
    setStatusSaving(true);
    try {
      await dispatch(updateJobStatus({ id: job._id, status: newStatus })).unwrap();
      // A finished job usually needs an invoice - offer to create one now.
      if (newStatus === 'completed') {
        setShowCompletePrompt(true);
      }
    } catch (err) {
      setStatusError(typeof err === 'string' ? err : 'Could not update the status. Is the server running?');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleUpload = async (slot, file) => {
    setUploadError('');
    if (!job?._id) return;
    setUploading(slot);
    try {
      await dispatch(uploadJobMedia({ id: job._id, file, slot })).unwrap();
    } catch (err) {
      setUploadError(typeof err === 'string' ? err : 'Upload failed. Is the server running?');
    } finally {
      setUploading(null);
    }
  };

  const openEditJob = () => {
    if (!job) return;
    const dt = job.appointmentDateTime ? new Date(job.appointmentDateTime) : null;
    const validDate = dt && !isNaN(dt.getTime());
    const vehicle = job.vehicleId && typeof job.vehicleId === 'object' ? job.vehicleId : null;

    setEditForm({
      jobKind: (job.jobType || '').startsWith('residential') ? 'residential' : 'vehicle',
      service: (job.jobType || '').includes('replacement') ? 'replacement' : 'repair',
      date: validDate ? `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` : '',
      time: validDate ? `${pad(dt.getHours())}:${pad(dt.getMinutes())}` : '09:00',
      year: vehicle?.year || '',
      make: vehicle?.make || '',
      model: vehicle?.model || '',
      glassCode: vehicle?.glassCode || '',
      insuranceNumber: vehicle?.insuranceNumber || '',
      supplierName: job.supplierName || '',
      supplierOrderedFrom: job.supplierOrderedFrom || '',
      address: job.location || '',
      jobNotes: job.specifications?.workDetails || '',
      quoteAmount: job.quoteAmount == null ? '' : String(job.quoteAmount)
    });
    setEditError('');
    setIsEditOpen(true);
  };

  const setEdit = (field) => (e) => setEditForm({ ...editForm, [field]: e.target.value });

  const handleEditSave = async () => {
    if (!job?._id || !editForm) return;

    const isVehicle = editForm.jobKind === 'vehicle';
    if (!isVehicle && !editForm.address.trim()) {
      setEditError('Job location (address) is required for house jobs.');
      return;
    }
    if (isVehicle && (!String(editForm.year).trim() || !editForm.make.trim())) {
      setEditError('Vehicle year and make are required.');
      return;
    }

    setEditError('');
    setIsSavingEdit(true);

    const payload = {
      jobType: `${editForm.jobKind}_${editForm.service}`,
      appointmentDateTime: editForm.date && editForm.time ? `${editForm.date}T${editForm.time}` : '',
      quoteAmount: editForm.quoteAmount === '' ? '' : Number(editForm.quoteAmount),
      specifications: {
        repairType: editForm.service === 'replacement' ? 'Replacement' : 'Repair',
        workDetails: editForm.jobNotes
      },
      ...(isVehicle
        ? {
            supplierName: editForm.supplierName,
            supplierOrderedFrom: editForm.supplierOrderedFrom,
            vehicle: {
              year: Number(editForm.year),
              make: editForm.make,
              model: editForm.model,
              glassCode: editForm.glassCode,
              insuranceNumber: editForm.insuranceNumber
            }
          }
        : { location: editForm.address })
    };

    try {
      await dispatch(updateJob({ id: job._id, changes: payload })).unwrap();
      setIsEditOpen(false);
      dispatch(fetchJobById(job._id));
    } catch (err) {
      setEditError(typeof err === 'string' ? err : 'Could not save the changes. Is the server running?');
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isLoading && !job) {
    return <Loading text="Loading job..." />;
  }

  if (!job) {
    return (
      <p className="text-sm text-slate-500">
        Job not found. <Link className="text-blue-800 font-semibold" to="/jobs">Back to jobs</Link>
      </p>
    );
  }

  const customerDisplayName = job.customerId?.firstName
    ? `${job.customerId.firstName} ${job.customerId.lastName}`
    : (job.customerName || '—');

  const customerPhone = job.customerId?.phoneNumber || job.customerPhone || '—';

  const isVehicle = (job.jobType || '').startsWith('vehicle');
  const service = (job.jobType || '').includes('replacement') ? 'Replacement'
    : (job.jobType || '').includes('repair') ? 'Repair' : '—';

  const vehicle = job.vehicleId && typeof job.vehicleId === 'object' ? job.vehicleId : null;
  const glassCode = job.glassCode || vehicle?.glassCode || '—';
  const insuranceNumber = vehicle?.insuranceNumber || job.insuranceNumber || '—';

  const customerId = job.customerId?._id || job.customerId;
  const jobInvoices = invoices.filter((i) => (i.jobId?._id || i.jobId) === job._id);
  const relatedInvoices = jobInvoices.length
    ? jobInvoices
    : invoices.filter((i) => (i.customerId?._id || i.customerId) === customerId);

  const tabs = [
    { id: 'specs', label: 'Job Details', icon: Wrench },
    { id: 'media', label: 'Before / After Video', icon: Video },
    { id: 'financials', label: 'Financials', icon: FileText }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900">
              {job.jobId || 'New Job'} — {isVehicle ? 'Vehicle' : 'House'} {service}
            </h2>
            <StatusBadge status={jobStatus} />
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Customer: <span className="font-semibold text-slate-900">{customerDisplayName}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="font-semibold text-slate-900">{customerPhone}</span>
            <span className="mx-2 text-slate-300">|</span>
            Appointment: <span className="font-semibold text-slate-900">{fmt(job.appointmentDateTime)}</span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <Button variant="outline" size="sm" icon={Pencil} onClick={openEditJob}>
            Edit Job
          </Button>
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select
              value={jobStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusSaving}
              className="text-xs font-semibold rounded-lg border border-slate-300 px-3 py-1.5 bg-slate-50 text-slate-800 cursor-pointer disabled:opacity-60"
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {jobStatus === 'completed' && (
            <Button variant="primary" size="sm" icon={FileText} onClick={() => setIsInvoiceOpen(true)}>
              Create Invoice
            </Button>
          )}
          {statusError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
              {statusError}
            </p>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200 flex gap-2 flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'border-blue-800 text-blue-900 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'specs' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</h3>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <p><span className="font-semibold text-slate-700">Name:</span> {customerDisplayName}</p>
                <p><span className="font-semibold text-slate-700">Phone:</span> {customerPhone}</p>
                <p><span className="font-semibold text-slate-700">Job Location:</span> {job.location || job.customerId?.address || '—'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Booking</h3>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <p><span className="font-semibold text-slate-700">Date &amp; Time:</span> {fmt(job.appointmentDateTime)}</p>
                <p><span className="font-semibold text-slate-700">Job Created:</span> {fmt(job.createdAt)}</p>
                <p><span className="font-semibold text-slate-700">PO Number:</span> {job.poNumber || '—'}</p>
                <p><span className="font-semibold text-slate-700">Work Needed:</span> {service}</p>
              </div>
            </div>

            {isVehicle && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle</h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <p>
                    <span className="font-semibold text-slate-700">Year / Make / Model:</span>{' '}
                    {[vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || '—'}
                  </p>
                  <p><span className="font-semibold text-slate-700">Glass Code:</span> <span className="font-mono font-bold text-blue-900">{glassCode}</span></p>
                  <p><span className="font-semibold text-slate-700">Insurance / Auto Number:</span> {insuranceNumber}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier</h3>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <p><span className="font-semibold text-slate-700">Supplier Name:</span> {job.supplierName || '—'}</p>
                <p><span className="font-semibold text-slate-700">Ordered From:</span> {job.supplierOrderedFrom || '—'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Notes</h3>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2">
              <p>{job.specifications?.workDetails || '—'}</p>
              {(job.notes || []).length > 0 && (
                <ul className="divide-y divide-slate-200 pt-2 space-y-2">
                  {job.notes.map((n, i) => (
                    <li key={n._id || i} className="pt-2">
                      <p>{n.content}</p>
                      <span className="text-[10px] text-slate-400">
                        {n.createdAt ? String(n.createdAt).split('T')[0] : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'media' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Before & After Video</h3>
            <p className="text-xs text-slate-500">
              Record the damage before the job and the finished result afterwards. Stored in this customer's file.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VideoSlot
              label="Before the job"
              accent="text-red-700 bg-red-50"
              video={job.media?.beforeVideo}
              uploading={uploading === 'before'}
              error={uploading === 'after' ? '' : uploadError}
              onFile={(file) => handleUpload('before', file)}
            />
            <VideoSlot
              label="After the job"
              accent="text-green-700 bg-green-50"
              video={job.media?.afterVideo}
              uploading={uploading === 'after'}
              error={uploading === 'before' ? '' : uploadError}
              onFile={(file) => handleUpload('after', file)}
            />
          </div>
        </div>
      )}

      {activeTab === 'financials' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Quote Amount</h3>
              <Button variant="outline" size="sm" icon={FileText} onClick={() => setIsInvoiceOpen(true)}>
                Create Invoice
              </Button>
            </div>
            {job.quoteAmount == null ? (
              <p className="text-xs text-slate-500">
                No quote amount set. Click “Edit Job” to add one.
              </p>
            ) : (
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                ${Number(job.quoteAmount).toFixed(2)}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Invoices</h3>
            {relatedInvoices.length === 0 ? (
              <p className="text-xs text-slate-500">No invoices for this job yet.</p>
            ) : (
              <>
                {!jobInvoices.length && (
                  <p className="text-[11px] text-slate-500 mb-1">
                    Showing the customer's other invoices - this job has none yet.
                  </p>
                )}
                <ul className="divide-y divide-slate-100 text-xs">
                  {relatedInvoices.map((i) => (
                    <li key={i._id} className="py-2.5 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{i.invoiceId || i._id}</span>
                      <span className="text-slate-500">{String(i.invoiceDate || i.date || '').split('T')[0]}</span>
                      <span className="font-bold text-slate-900">${Number(i.totalAmount || i.amount || 0).toFixed(2)}</span>
                      <StatusBadge status={i.paymentStatus || i.status} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <p className="pt-2 flex items-center gap-1.5 text-xs text-green-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Digital copies are stored with each invoice.
          </p>
        </div>
      )}

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit ${job.jobId || 'Job'}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSave} isLoading={isSavingEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        {editForm && (
          <div className="space-y-4">
            {editError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Job For
                </label>
                <select
                  value={editForm.jobKind}
                  onChange={setEdit('jobKind')}
                  className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                >
                  <option value="vehicle">Vehicle (windshield / auto glass)</option>
                  <option value="residential">House / Residential glass</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Work Needed
                </label>
                <select
                  value={editForm.service}
                  onChange={setEdit('service')}
                  className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                >
                  <option value="replacement">Replacement</option>
                  <option value="repair">Repair</option>
                </select>
              </div>
            </div>

            {editForm.jobKind === 'vehicle' ? (
              <div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50/40">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Vehicle Details</p>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Year" value={editForm.year} onChange={setEdit('year')} placeholder="2020" required />
                  <Input label="Make" value={editForm.make} onChange={setEdit('make')} placeholder="Toyota" required />
                  <Input label="Model" value={editForm.model} onChange={setEdit('model')} placeholder="RAV4" />
                </div>
                <Input
                  label="Windshield / Glass Code"
                  value={editForm.glassCode}
                  onChange={setEdit('glassCode')}
                  placeholder="FW04210 GTY"
                />
                <Input
                  label="Insurance / Auto Number"
                  value={editForm.insuranceNumber}
                  onChange={setEdit('insuranceNumber')}
                  placeholder="Policy or claim number"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Supplier Name"
                    value={editForm.supplierName}
                    onChange={setEdit('supplierName')}
                    placeholder="PGW Auto Glass"
                  />
                  <Input
                    label="Ordered From"
                    value={editForm.supplierOrderedFrom}
                    onChange={setEdit('supplierOrderedFrom')}
                    placeholder="Website / phone / local"
                  />
                </div>
              </div>
            ) : (
              <Input
                label="Address / Job Location"
                value={editForm.address}
                onChange={setEdit('address')}
                placeholder="123 Main St, Cityville"
                required
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Appointment Date (optional)"
                type="date"
                value={editForm.date}
                onChange={setEdit('date')}
              />
              <Input label="Time" type="time" value={editForm.time} onChange={setEdit('time')} />
            </div>

            <Input
              label="Quote Amount ($)"
              type="number"
              min="0"
              step="0.01"
              value={editForm.quoteAmount}
              onChange={setEdit('quoteAmount')}
              placeholder="0.00"
              helperText="Amount quoted to the customer (optional)"
            />

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                Job Notes
              </label>
              <textarea
                value={editForm.jobNotes}
                onChange={setEdit('jobNotes')}
                placeholder="Any notes about this job..."
                rows={3}
                className="w-full text-sm rounded-lg border border-slate-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showCompletePrompt}
        onClose={() => setShowCompletePrompt(false)}
        title="Job completed"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCompletePrompt(false)}>
              Do it later
            </Button>
            <Button
              variant="primary"
              icon={FileText}
              onClick={() => {
                setShowCompletePrompt(false);
                setIsInvoiceOpen(true);
              }}
            >
              Create Invoice
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 shrink-0 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <p className="text-sm text-slate-700 leading-relaxed">
              Job {job.jobId || ''} is now marked as completed. Create the invoice for this job now
              or come back to it later from the Invoices page.
            </p>
          </div>
          {invoiceWarning && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
              {invoiceWarning}
            </div>
          )}
        </div>
      </Modal>

      <InvoiceFormModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        customer={job.customerId && typeof job.customerId === 'object' ? job.customerId : null}
        job={job}
        onSaved={(saved, warning) => {
          if (warning) setInvoiceWarning(warning);
          if (job?._id) dispatch(fetchJobById(job._id));
          dispatch(fetchInvoices({ limit: 100 }));
          return saved;
        }}
      />
    </div>
  );
}
