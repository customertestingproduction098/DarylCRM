import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { createJob, updateJob } from '../../store/slices/jobSlice';
import { fetchCustomerVehicles } from '../../store/slices/customerSlice';

const emptyJob = {
  customerId: '',
  jobKind: 'vehicle',
  service: 'replacement',
  date: '',
  time: '09:00',
  year: '',
  make: '',
  model: '',
  glassCode: '',
  insuranceNumber: '',
  supplierName: '',
  supplierOrderedFrom: '',
  address: '',
  jobNotes: '',
  quoteAmount: ''
};

const vehicleOptionLabel = (v) =>
  [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle';

const jobTypeOf = (kind, service) => `${kind}_${service}`;

const pad = (n) => String(n).padStart(2, '0');

// Shared "New Job" / "Edit Job" form. When a customer is supplied the customer
// is locked to that file so a job can be raised straight from a customer page.
export default function JobFormModal({
  isOpen,
  onClose,
  job = null,
  customer = null,
  onSaved
}) {
  const dispatch = useDispatch();
  const { items: customers, customerVehicles } = useSelector((state) => state.customers);

  const [form, setForm] = useState(emptyJob);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [vehicleMode, setVehicleMode] = useState('existing');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const lockedCustomerId = customer?._id || '';
  const isEditing = Boolean(job?._id);
  const jobId = job?._id || '';

  useEffect(() => {
    if (!isOpen) return;

    setFormError('');
    setVehicleMode('existing');

    if (jobId) {
      const dt = job.appointmentDateTime ? new Date(job.appointmentDateTime) : null;
      const validDate = dt && !isNaN(dt.getTime());
      const vehicle = job.vehicleId && typeof job.vehicleId === 'object' ? job.vehicleId : null;

      setForm({
        customerId: job.customerId?._id || job.customerId || '',
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
      setSelectedVehicleId(vehicle?._id || '');
      // A vehicle job without a saved vehicle starts in "new vehicle" mode
      if (!vehicle) setVehicleMode('new');

      const jobCustomerId = job.customerId?._id || job.customerId || '';
      if (jobCustomerId) dispatch(fetchCustomerVehicles(jobCustomerId));
      return;
    }

    setForm({ ...emptyJob, customerId: lockedCustomerId });
    setSelectedVehicleId('');
    if (lockedCustomerId) dispatch(fetchCustomerVehicles(lockedCustomerId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, jobId, lockedCustomerId, dispatch]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleCustomerChange = (e) => {
    const customerId = e.target.value;
    setForm((prev) => ({ ...prev, customerId }));
    setSelectedVehicleId('');
    if (customerId) dispatch(fetchCustomerVehicles(customerId));
  };

  const handleVehicleSelect = (e) => {
    const vehicleId = e.target.value;
    setSelectedVehicleId(vehicleId);
    const vehicle = customerVehicles.find((v) => v._id === vehicleId);
    if (vehicle) {
      setForm((prev) => ({
        ...prev,
        year: vehicle.year || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        glassCode: vehicle.glassCode || '',
        insuranceNumber: vehicle.insuranceNumber || ''
      }));
    }
  };

  const validate = () => {
    if (form.jobKind === 'residential' && !form.address.trim()) {
      return 'Job location (address) is required for house jobs.';
    }
    if (form.jobKind === 'vehicle') {
      if (vehicleMode === 'existing' && !selectedVehicleId) {
        return 'Select an existing vehicle or switch to "New vehicle".';
      }
      if (vehicleMode === 'new' && (!String(form.year).trim() || !form.make.trim())) {
        return 'Vehicle year and make are required.';
      }
    }
    if (form.quoteAmount !== '' && (isNaN(Number(form.quoteAmount)) || Number(form.quoteAmount) < 0)) {
      return 'Quote amount must be a positive number.';
    }
    return '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const customerId = lockedCustomerId || form.customerId;
    if (!customerId) {
      setFormError('Choose the customer for this job.');
      return;
    }

    setFormError('');
    setIsSaving(true);

    const isVehicle = form.jobKind === 'vehicle';
    const useExistingVehicle = isVehicle && vehicleMode === 'existing';
    const basePayload = {
      jobType: jobTypeOf(form.jobKind, form.service),
      appointmentDateTime: form.date && form.time ? `${form.date}T${form.time}` : '',
      quoteAmount: form.quoteAmount === '' ? '' : Number(form.quoteAmount),
      specifications: {
        repairType: form.service === 'replacement' ? 'Replacement' : 'Repair',
        workDetails: form.jobNotes
      },
      ...(isVehicle
        ? {
            supplierName: form.supplierName,
            supplierOrderedFrom: form.supplierOrderedFrom,
            ...(useExistingVehicle
              ? { vehicleId: selectedVehicleId }
              : {
                  vehicle: {
                    year: Number(form.year),
                    make: form.make,
                    model: form.model,
                    glassCode: form.glassCode,
                    insuranceNumber: form.insuranceNumber
                  }
                })
          }
        : { location: form.address })
    };

    try {
      let saved = null;
      if (isEditing) {
        saved = await dispatch(updateJob({ id: job._id, changes: basePayload })).unwrap();
      } else {
        saved = await dispatch(createJob({ customerId, ...basePayload })).unwrap();
      }
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Could not save the job. Is the server running?');
    } finally {
      setIsSaving(false);
    }
  };

  const lockedCustomerLabel = customer
    ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Selected customer'
    : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit ${job.jobId || 'Job'}` : 'New Job'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            {isEditing ? 'Save Changes' : 'Save Job'}
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

        {!isEditing && lockedCustomerId && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Customer</p>
            <p className="text-sm font-semibold text-blue-900 mt-0.5">{lockedCustomerLabel}</p>
            <p className="text-[11px] text-blue-700 mt-0.5">This job will be filed under this customer.</p>
          </div>
        )}

        {!isEditing && !lockedCustomerId && (
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
            <p className="text-[11px] text-slate-500 mt-1">
              Not in the list? Add the customer from the Customers page first.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
              Job For
            </label>
            <select
              value={form.jobKind}
              onChange={set('jobKind')}
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
              value={form.service}
              onChange={set('service')}
              className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
            >
              <option value="replacement">Replacement</option>
              <option value="repair">Repair</option>
            </select>
          </div>
        </div>

        {form.jobKind === 'vehicle' ? (
          <div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50/40">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Vehicle Details</p>
              <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setVehicleMode('existing')}
                  className={`px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    vehicleMode === 'existing' ? 'bg-blue-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Existing
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleMode('new')}
                  className={`px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    vehicleMode === 'new' ? 'bg-blue-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  New
                </button>
              </div>
            </div>

            {vehicleMode === 'existing' ? (
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Select Vehicle <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={handleVehicleSelect}
                  disabled={!form.customerId}
                  className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {!form.customerId
                      ? 'Choose a customer first...'
                      : customerVehicles.length
                        ? 'Select a saved vehicle...'
                        : 'No saved vehicles for this customer'}
                  </option>
                  {customerVehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {vehicleOptionLabel(v)}
                      {v.insuranceNumber ? ` — ${v.insuranceNumber}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Vehicles added on the customer's Vehicles tab appear here. Need a new one? Switch to &quot;New&quot;.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <Input label="Year" value={form.year} onChange={set('year')} placeholder="2020" required />
                <Input label="Make" value={form.make} onChange={set('make')} placeholder="Toyota" required />
                <Input label="Model" value={form.model} onChange={set('model')} placeholder="RAV4" />
              </div>
            )}

            {vehicleMode === 'existing' ? (
              <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-2 space-y-1">
                {(() => {
                  const v = customerVehicles.find((x) => x._id === selectedVehicleId);
                  if (!v) return <p className="text-slate-400">No vehicle selected.</p>;
                  return (
                    <>
                      <p><span className="font-semibold text-slate-700">Glass code:</span> {v.glassCode || '—'}</p>
                      <p><span className="font-semibold text-slate-700">Insurance #:</span> {v.insuranceNumber || '—'}</p>
                    </>
                  );
                })()}
              </div>
            ) : (
              <>
                <Input
                  label="Windshield / Glass Code"
                  value={form.glassCode}
                  onChange={set('glassCode')}
                  placeholder="FW04210 GTY"
                />
                <Input
                  label="Insurance / Auto Number"
                  value={form.insuranceNumber}
                  onChange={set('insuranceNumber')}
                  placeholder="Policy or claim number"
                />
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Supplier Name"
                value={form.supplierName}
                onChange={set('supplierName')}
                placeholder="PGW Auto Glass"
              />
              <Input
                label="Ordered From"
                value={form.supplierOrderedFrom}
                onChange={set('supplierOrderedFrom')}
                placeholder="Website / phone / local"
              />
            </div>
          </div>
        ) : (
          <Input
            label="Address / Job Location"
            value={form.address}
            onChange={set('address')}
            placeholder="123 Main St, Cityville"
            required
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Appointment Date (optional)"
            type="date"
            value={form.date}
            onChange={set('date')}
          />
          <Input label="Time" type="time" value={form.time} onChange={set('time')} />
        </div>

        <Input
          label="Quote Amount ($)"
          type="number"
          min="0"
          step="0.01"
          value={form.quoteAmount}
          onChange={set('quoteAmount')}
          placeholder="0.00"
          helperText="Amount quoted to the customer (optional)"
        />

        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
            Job Notes
          </label>
          <textarea
            value={form.jobNotes}
            onChange={set('jobNotes')}
            placeholder="Any notes about this job (damage, access instructions, parts needed...)"
            rows={3}
            className="w-full text-sm rounded-lg border border-slate-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </form>
    </Modal>
  );
}
