import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Wrench, Video, FileText, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import StatusBadge from '../components/Common/StatusBadge';
import Loading from '../components/Common/Loading';
import mediaUrl from '../utils/mediaUrl';
import {
  fetchJobById,
  updateJobStatus,
  updateJobStatusLocal,
  uploadJobMedia,
  setJobMediaLocal
} from '../store/slices/jobSlice';

const fmt = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '—');

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

  const { items: allJobs, selectedJob, isLoading } = useSelector((state) => state.jobs);
  const { items: quotes } = useSelector((state) => state.quotes);
  const { items: invoices } = useSelector((state) => state.invoices);

  useEffect(() => {
    if (jobId) {
      dispatch(fetchJobById(jobId));
    }
  }, [dispatch, jobId]);

  const job = selectedJob || allJobs.find((j) => j._id === jobId || j.jobId === jobId) || null;
  const jobStatus = job?.jobStatus || job?.status || 'scheduled';

  const handleStatusChange = async (newStatus) => {
    if (!job?._id) return;
    try {
      await dispatch(updateJobStatus({ id: job._id, status: newStatus })).unwrap();
    } catch {
      dispatch(updateJobStatusLocal({ id: job._id, status: newStatus }));
    }
  };

  const handleUpload = async (slot, file) => {
    setUploadError('');
    if (!job?._id) return;
    setUploading(slot);
    try {
      await dispatch(uploadJobMedia({ id: job._id, file, slot })).unwrap();
    } catch (err) {
      if (err?.offline) {
        // Backend unreachable: keep the selected video for this session
        dispatch(setJobMediaLocal({ id: job._id, slot, url: URL.createObjectURL(file) }));
      } else {
        setUploadError(err?.message || 'Upload failed');
      }
    } finally {
      setUploading(null);
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
  const relatedQuotes = quotes.filter((q) => (q.customerId?._id || q.customerId) === customerId);
  const relatedInvoices = invoices.filter((i) => (i.customerId?._id || i.customerId) === customerId);

  const tabs = [
    { id: 'specs', label: 'Job Details', icon: Wrench },
    { id: 'media', label: 'Before / After Video', icon: Video },
    { id: 'financials', label: 'Quotes & Invoices', icon: FileText }
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

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600">Status</label>
          <select
            value={jobStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-slate-300 px-3 py-1.5 bg-slate-50 text-slate-800"
          >
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
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
                <p><span className="font-semibold text-slate-700">Date & Time:</span> {fmt(job.appointmentDateTime)}</p>
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
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              {job.specifications?.workDetails || job.notes || '—'}
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
          <h3 className="text-sm font-bold text-slate-900">Quotes</h3>
          {relatedQuotes.length === 0 ? (
            <p className="text-xs text-slate-500">No quotes for this customer yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-xs">
              {relatedQuotes.map((q) => (
                <li key={q._id} className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{q.quoteId || q._id}</span>
                  <span className="text-slate-500">{String(q.quoteDate || q.date || '').split('T')[0]}</span>
                  <span className="font-bold text-slate-900">${Number(q.totalAmount || q.amount || 0).toFixed(2)}</span>
                  <StatusBadge status={q.status} />
                </li>
              ))}
            </ul>
          )}

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Invoices</h3>
            {relatedInvoices.length === 0 ? (
              <p className="text-xs text-slate-500">No invoices for this customer yet.</p>
            ) : (
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
            )}
          </div>

          <p className="pt-2 flex items-center gap-1.5 text-xs text-green-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Digital copies are stored with each invoice.
          </p>
        </div>
      )}
    </div>
  );
}
