import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, FileText, Upload, X } from 'lucide-react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { createInvoice, updateInvoice, uploadInvoiceCopy } from '../../store/slices/invoiceSlice';

const OPEN_JOB_STATUSES = ['quote', 'scheduled', 'in_progress'];

const jobStatusOf = (job) => job?.jobStatus || job?.status || 'scheduled';

const isCompletedJob = (job) => jobStatusOf(job) === 'completed';

const statusLabel = (status) =>
  String(status || '').replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const jobOptionLabel = (job) => {
  const when = String(job.appointmentDateTime || '').split('T')[0];
  const vehicle = job.vehicleId && typeof job.vehicleId === 'object' ? job.vehicleId : null;
  const detail = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
    : (job.location || '');
  const svc = (job.jobType || '').includes('replacement') ? 'Replacement' : 'Repair';
  const open = !isCompletedJob(job);
  return `${open ? '! ' : ''}${job.jobId || job._id} · ${svc}${detail ? ` · ${detail}` : ''}${when ? ` · ${when}` : ''}${open ? ' (not completed)' : ''}`;
};

// Shared "Create Invoice" / "Edit Invoice" form.
// A job is always required. Completed jobs are listed first, open jobs stay
// selectable but raise a warning so nobody invoices unfinished work by accident.
export default function InvoiceFormModal({
  isOpen,
  onClose,
  invoice = null,
  customer = null,
  job = null,
  onSaved
}) {
  const dispatch = useDispatch();
  const { items: customers } = useSelector((state) => state.customers);
  const { items: jobs } = useSelector((state) => state.jobs);

  const [form, setForm] = useState({ customerId: '', jobId: '', description: '', amount: '' });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');

  const isEditing = Boolean(invoice?._id);
  const lockedCustomer = customer?._id ? customer : null;
  const lockedJob = job?._id ? job : null;
  const fileRequired = !isEditing || !invoice?.fileLocation;
  const invoiceId = invoice?._id || '';
  const lockedCustomerId = lockedCustomer?._id || '';
  const lockedJobId = lockedJob?._id || '';

  useEffect(() => {
    if (!isOpen) return;

    setFormError('');
    setFileError('');
    setFile(null);

    if (invoiceId) {
      setForm({
        customerId: invoice.customerId?._id || invoice.customerId || '',
        jobId: invoice.jobId?._id || invoice.jobId || '',
        description: invoice.lineItems?.[0]?.description || '',
        amount: invoice.lineItems?.[0]?.unitPrice == null ? '' : String(invoice.lineItems[0].unitPrice)
      });
      return;
    }

    setForm({
      customerId: lockedCustomerId,
      jobId: lockedJobId,
      description: lockedJob ? `${lockedJob.jobType?.includes('replacement') ? 'Replacement' : 'Repair'} - ${lockedJob.jobId || ''}`.trim() : '',
      amount: lockedJob?.quoteAmount == null ? '' : String(lockedJob.quoteAmount)
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, invoiceId, lockedCustomerId, lockedJobId]);

  // Jobs offered for this customer: completed first, open jobs flagged with "!"
  const invoiceJob = invoice?.jobId && typeof invoice.jobId === 'object' ? invoice.jobId : null;

  const jobOptions = useMemo(() => {
    const customerId = form.customerId;
    const list = jobs.filter((jobItem) => {
      const jobCustomerId = jobItem.customerId?._id || jobItem.customerId;
      if (customerId && String(jobCustomerId) !== String(customerId)) return false;
      const status = jobStatusOf(jobItem);
      return status === 'completed' || OPEN_JOB_STATUSES.includes(status);
    });

    const sorted = [...list].sort((a, b) => (isCompletedJob(a) ? 0 : 1) - (isCompletedJob(b) ? 0 : 1));

    // Keep the job this invoice already points to selectable, even if it is not
    // in the loaded list (cancelled job, other customer, pagination...).
    if (form.jobId && !sorted.some((j) => j._id === form.jobId) && invoiceJob) {
      sorted.push(invoiceJob);
    }

    return sorted;
  }, [jobs, form.customerId, form.jobId, invoiceJob]);

  const selectedJob = useMemo(
    () => jobOptions.find((j) => j._id === form.jobId)
      || (lockedJob?._id === form.jobId ? lockedJob : null),
    [jobOptions, form.jobId, lockedJob]
  );

  const openJobSelected = Boolean(selectedJob) && !isCompletedJob(selectedJob);

  const handleCustomerChange = (e) => {
    const customerId = e.target.value;
    setForm((prev) => ({ ...prev, customerId, jobId: '' }));
    setFormError('');
  };

  const handleJobChange = (e) => {
    const jobId = e.target.value;
    const picked = jobOptions.find((j) => j._id === jobId);
    setForm((prev) => ({
      ...prev,
      jobId,
      description: prev.description || (picked ? 'Glass work' : prev.description),
      amount: picked && picked.quoteAmount != null && prev.amount === ''
        ? String(picked.quoteAmount)
        : prev.amount
    }));
    setFormError('');
  };

  const handleFileSelected = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(picked.type) && !/\.(pdf|jpe?g|png|webp)$/i.test(picked.name || '')) {
      setFileError('Only PDF, JPG, PNG or WEBP files can be attached.');
      return;
    }
    setFileError('');
    setFile(picked);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    const customerId = lockedCustomer?._id || form.customerId;
    if (!customerId) {
      setFormError('Choose the customer this invoice is for.');
      return;
    }
    if (!form.jobId) {
      setFormError('Select the job this invoice is for.');
      return;
    }

    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setFormError('Enter the invoice amount.');
      return;
    }

    if (fileRequired && !file) {
      setFormError('Attach the invoice file before saving.');
      return;
    }
    setIsSaving(true);
    let uploadWarning = '';

    try {
      const lineItems = [{
        description: form.description || 'Glass work',
        quantity: 1,
        unitPrice: amount
      }];

      let saved;
      if (isEditing) {
        saved = await dispatch(updateInvoice({
          id: invoice._id,
          changes: { jobId: form.jobId, lineItems }
        })).unwrap();
      } else {
        const customerRecord = customers.find((c) => c._id === customerId);
        saved = await dispatch(createInvoice({
          customerId,
          jobId: form.jobId,
          customerName: customerRecord
            ? `${customerRecord.firstName} ${customerRecord.lastName}`
            : '',
          invoiceDate: new Date().toISOString().split('T')[0],
          lineItems,
          totalAmount: amount,
          amountPaid: 0,
          paymentStatus: 'pending',
          physicalCopyFiled: false
        })).unwrap();
      }

      if (file && saved?._id) {
        try {
          await dispatch(uploadInvoiceCopy({ id: saved._id, file })).unwrap();
        } catch {
          uploadWarning = 'The invoice was saved but the file could not be attached. Attach it from the invoices list.';
        }
      }

      onSaved?.(saved, uploadWarning);
      onClose?.();
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Could not save the invoice. Is the server running?');
    } finally {
      setIsSaving(false);
    }
  };

  const invoiceCustomer = invoice?.customerId && typeof invoice.customerId === 'object'
    ? invoice.customerId
    : null;

  const customerLabel = lockedCustomer
    ? `${lockedCustomer.firstName || ''} ${lockedCustomer.lastName || ''}`.trim()
    : (invoiceCustomer
        ? `${invoiceCustomer.firstName || ''} ${invoiceCustomer.lastName || ''}`.trim()
        : (invoice?.customerName || ''));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit ${invoice.invoiceId || 'Invoice'}` : 'Create Invoice'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            {isEditing ? 'Save Changes' : 'Create Invoice'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {formError}
          </div>
        )}

        {isEditing && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{customerLabel || '—'}</p>
          </div>
        )}

        {!isEditing && lockedCustomer && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Customer</p>
            <p className="text-sm font-semibold text-blue-900 mt-0.5">{customerLabel}</p>
          </div>
        )}

        {!isEditing && !lockedCustomer && (
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={form.customerId}
              onChange={handleCustomerChange}
              className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
              required
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.firstName} {c.lastName} — {c.phoneNumber}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
            Job <span className="text-red-500">*</span>
          </label>
          {lockedJob ? (
            <div className="w-full text-sm rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 font-semibold">
              {lockedJob.jobId || lockedJob._id}
            </div>
          ) : (
            <select
              value={form.jobId}
              onChange={handleJobChange}
              disabled={!form.customerId}
              className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-400"
              required
            >
              <option value="">
                {!form.customerId
                  ? 'Choose a customer first...'
                  : jobOptions.length
                    ? 'Select the job...'
                    : 'No billable jobs for this customer'}
              </option>
              {jobOptions.map((j) => (
                <option key={j._id} value={j._id}>
                  {jobOptionLabel(j)}
                </option>
              ))}
            </select>
          )}
          {!lockedJob && (
            <p className="text-[11px] text-slate-500 mt-1">
              Completed jobs are listed first. Jobs that are still open are marked with &quot;!&quot;.
            </p>
          )}
        </div>

        {openJobSelected && (
          <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>!</strong> Job {selectedJob.jobId || selectedJob._id} is still {statusLabel(jobStatusOf(selectedJob))}.
              Make sure the work is finished before invoicing.
            </span>
          </div>
        )}

        <Input
          label="What is being invoiced?"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Windshield replacement & materials"
        />

        <Input
          label="Total Amount ($)"
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          placeholder="680.00"
          required
        />

        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
            Upload Invoice{' '}
            {fileRequired
              ? <span className="text-red-500">*</span>
              : <span className="text-slate-400 normal-case tracking-normal">(optional - a copy is already stored)</span>}
          </label>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              {file ? 'Replace file' : 'Choose file'}
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileSelected} />
            </label>
            {file ? (
              <span className="flex items-center gap-1 text-xs text-slate-700 truncate">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                {file.name}
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Remove the file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">PDF, JPG, PNG or WEBP (max 25 MB)</span>
            )}
          </div>
          {fileError && (
            <p className="text-xs text-red-600 mt-1">{fileError}</p>
          )}
          <p className="text-[11px] text-slate-500 mt-1">
            Attach the invoice so a digital copy is stored with the record.
          </p>
        </div>
      </form>
    </Modal>
  );
}
