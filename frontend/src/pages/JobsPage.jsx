import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Eye, Filter } from 'lucide-react';
import StatusBadge from '../components/Common/StatusBadge';
import Table from '../components/Common/Table';
import Button from '../components/Common/Button';
import Modal from '../components/Common/Modal';
import Input from '../components/Common/Input';
import Loading from '../components/Common/Loading';
import RowActions from '../components/Common/RowActions';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import { fetchJobs, createJob, updateJob, deleteJob } from '../store/slices/jobSlice';
import { fetchCustomers, fetchCustomerVehicles } from '../store/slices/customerSlice';

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

const jobTypeOf = (kind, service) =>
  `${kind}_${service}`;

const pad = (n) => String(n).padStart(2, '0');

export default function JobsPage() {
  const dispatch = useDispatch();
  const { items: jobs, isLoading } = useSelector((state) => state.jobs);
  const { items: customers, customerVehicles } = useSelector((state) => state.customers);

  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [form, setForm] = useState(emptyJob);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [vehicleMode, setVehicleMode] = useState('existing');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchJobs({ limit: 100 }));
    dispatch(fetchCustomers({ limit: 100 }));
  }, [dispatch]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const openAddModal = () => {
    setEditingJob(null);
    setForm(emptyJob);
    setFormError('');
    setVehicleMode('existing');
    setIsModalOpen(true);
  };

  const openEditModal = (job) => {
    const dt = job.appointmentDateTime ? new Date(job.appointmentDateTime) : null;
    const validDate = dt && !isNaN(dt.getTime());
    const vehicle = job.vehicleId && typeof job.vehicleId === 'object' ? job.vehicleId : null;

    setEditingJob(job);
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
    const customerId = job.customerId?._id || job.customerId || '';
    if (customerId) dispatch(fetchCustomerVehicles(customerId));
    setSelectedVehicleId(vehicle?._id || '');
    setVehicleMode('existing');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCustomerChange = (e) => {
    const customerId = e.target.value;
    setForm((prev) => ({ ...prev, customerId }));
    setSelectedVehicleId('');
    if (customerId) {
      dispatch(fetchCustomerVehicles(customerId));
    }
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

    if (!editingJob && !form.customerId) {
      setFormError('Choose the customer for this job.');
      return;
    }

    setFormError('');
    setIsSaving(true);

    const isVehicle = form.jobKind === 'vehicle';
    const useExistingVehicle = isVehicle && vehicleMode === 'existing';
    const basePayload = {
      jobType: jobTypeOf(form.jobKind, form.service),
      // Empty string = no appointment (optional); backend clears or ignores it
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
            // Existing vehicle: reference it by id. New vehicle: send details
            // for the backend to create/reuse a vehicle record.
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
      if (editingJob) {
        await dispatch(updateJob({ id: editingJob._id, changes: basePayload })).unwrap();
      } else {
        await dispatch(createJob({ customerId: form.customerId, ...basePayload })).unwrap();
      }
      setIsModalOpen(false);
      setEditingJob(null);
      setForm(emptyJob);
      setSelectedVehicleId('');
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Could not save the job. Is the server running?');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setIsDeleting(true);

    try {
      await dispatch(deleteJob(deleteTarget._id)).unwrap();
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(typeof err === 'string' ? err : 'Could not delete. Is the server running?');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Jobs</h2>
          <p className="text-xs text-slate-500">Windshield, auto glass and house glass work orders</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openAddModal}>
          New Job
        </Button>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-700">Status:</span>
        {['All', 'scheduled', 'in_progress', 'completed', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
              statusFilter === st ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loading text="Loading jobs..." />
      ) : (
        <Table
          columns={['Job ID', 'Customer', 'Job Type', 'Appointment', 'Quote', 'Status', '', '']}
          data={jobs.filter((j) => statusFilter === 'All' || (j.jobStatus || j.status) === statusFilter)}
          renderRow={(j) => {
            const customerDisplayName = j.customerId?.firstName
              ? `${j.customerId.firstName} ${j.customerId.lastName}`
              : (j.customerName || 'Customer');
            const isVehicle = (j.jobType || '').startsWith('vehicle');
            const service = (j.jobType || '').includes('replacement') ? 'Replacement' : 'Repair';

            return (
              <tr key={j._id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-blue-900">
                  <Link to={`/jobs/${j._id}`}>{j.jobId}</Link>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{customerDisplayName}</td>
                <td className="px-4 py-3 text-slate-700">
                  {isVehicle ? 'Vehicle' : 'House'} · {service}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {String(j.date || j.appointmentDateTime || '').replace('T', ' ').slice(0, 16) || '—'}
                </td>
                <td className="px-4 py-3 text-slate-700 font-medium">
                  {j.quoteAmount == null ? '—' : `$${Number(j.quoteAmount).toFixed(2)}`}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={j.jobStatus || j.status} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/jobs/${j._id}`}
                    className="p-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 rounded-md"
                  >
                    <Eye className="w-3.5 h-3.5" /> Details
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => openEditModal(j)}
                    onDelete={() => { setDeleteTarget(j); setDeleteError(''); }}
                  />
                </td>
              </tr>
            );
          }}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingJob ? `Edit ${editingJob.jobId || 'Job'}` : 'New Job'}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
              {editingJob ? 'Save Changes' : 'Save Job'}
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

          {!editingJob && (
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
                    Vehicles added on the customer's Vehicles tab appear here. Need a new one? Switch to "New".
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

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete job"
        message={
          deleteTarget
            ? `Delete job ${deleteTarget.jobId || ''}? This removes it from the database permanently.`
            : ''
        }
        isBusy={isDeleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
