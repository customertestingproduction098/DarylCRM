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
import { fetchJobs, createJob, addJobLocal } from '../store/slices/jobSlice';
import { fetchCustomers } from '../store/slices/customerSlice';

const emptyJob = {
  customerId: '',
  jobKind: 'vehicle',
  service: 'replacement',
  date: '',
  time: '09:00',
  poNumber: '',
  year: '',
  make: '',
  model: '',
  glassCode: '',
  insuranceNumber: '',
  supplierName: '',
  supplierOrderedFrom: '',
  address: ''
};

const jobTypeOf = (kind, service) =>
  `${kind}_${service}`;

export default function JobsPage() {
  const dispatch = useDispatch();
  const { items: jobs, isLoading } = useSelector((state) => state.jobs);
  const { items: customers } = useSelector((state) => state.customers);

  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newJob, setNewJob] = useState(emptyJob);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    dispatch(fetchJobs());
    dispatch(fetchCustomers({ limit: 100 }));
  }, [dispatch]);

  const set = (field) => (e) => setNewJob({ ...newJob, [field]: e.target.value });

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newJob.customerId) {
      setFormError('Choose the customer for this job.');
      return;
    }
    if (!newJob.date || !newJob.time) {
      setFormError('Appointment date and time are required.');
      return;
    }
    if (newJob.jobKind === 'residential' && !newJob.address.trim()) {
      setFormError('Job location (address) is required for house jobs.');
      return;
    }
    if (newJob.jobKind === 'vehicle' && (!newJob.year.trim() || !newJob.make.trim())) {
      setFormError('Vehicle year and make are required.');
      return;
    }

    const isVehicle = newJob.jobKind === 'vehicle';
    const payload = {
      customerId: newJob.customerId,
      jobType: jobTypeOf(newJob.jobKind, newJob.service),
      appointmentDateTime: `${newJob.date}T${newJob.time}`,
      poNumber: newJob.poNumber,
      specifications: {
        repairType: newJob.service === 'replacement' ? 'Replacement' : 'Repair'
      },
      ...(isVehicle
        ? {
            vehicle: {
              year: Number(newJob.year),
              make: newJob.make,
              model: newJob.model,
              glassCode: newJob.glassCode,
              insuranceNumber: newJob.insuranceNumber
            },
            supplierName: newJob.supplierName,
            supplierOrderedFrom: newJob.supplierOrderedFrom
          }
        : { location: newJob.address })
    };

    const customer = customers.find((c) => c._id === newJob.customerId);

    try {
      await dispatch(createJob(payload)).unwrap();
    } catch {
      dispatch(addJobLocal({
        _id: `job-${Date.now()}`,
        jobId: `JOB-${new Date().getFullYear()}-${String(jobs.length + 1).padStart(3, '0')}`,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Customer',
        jobType: payload.jobType,
        jobStatus: 'scheduled',
        appointmentDateTime: payload.appointmentDateTime,
        poNumber: payload.poNumber,
        supplierName: payload.supplierName,
        supplierOrderedFrom: payload.supplierOrderedFrom,
        location: payload.location,
        glassCode: payload.vehicle?.glassCode,
        specifications: payload.specifications,
        media: { beforeVideo: null, afterVideo: null }
      }));
    }

    setIsModalOpen(false);
    setNewJob(emptyJob);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Jobs</h2>
          <p className="text-xs text-slate-500">Windshield, auto glass and house glass work orders</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
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
          columns={['Job ID', 'Customer', 'Job Type', 'Appointment', 'Status', '']}
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
                  {String(j.date || j.appointmentDateTime || '').replace('T', ' ').slice(0, 16)}
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
              </tr>
            );
          }}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Job"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateJob}>Save Job</Button>
          </>
        }
      >
        <form onSubmit={handleCreateJob} className="space-y-4">
          {formError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={newJob.customerId}
              onChange={set('customerId')}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                Job For
              </label>
              <select
                value={newJob.jobKind}
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
                value={newJob.service}
                onChange={set('service')}
                className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
              >
                <option value="replacement">Replacement</option>
                <option value="repair">Repair</option>
              </select>
            </div>
          </div>

          {newJob.jobKind === 'vehicle' ? (
            <div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50/40">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Vehicle Details</p>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Year" value={newJob.year} onChange={set('year')} placeholder="2020" required />
                <Input label="Make" value={newJob.make} onChange={set('make')} placeholder="Toyota" required />
                <Input label="Model" value={newJob.model} onChange={set('model')} placeholder="RAV4" />
              </div>
              <Input
                label="Windshield / Glass Code"
                value={newJob.glassCode}
                onChange={set('glassCode')}
                placeholder="FW04210 GTY"
              />
              <Input
                label="Insurance / Auto Number"
                value={newJob.insuranceNumber}
                onChange={set('insuranceNumber')}
                placeholder="Policy or claim number"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Supplier Name"
                  value={newJob.supplierName}
                  onChange={set('supplierName')}
                  placeholder="PGW Auto Glass"
                />
                <Input
                  label="Ordered From"
                  value={newJob.supplierOrderedFrom}
                  onChange={set('supplierOrderedFrom')}
                  placeholder="Website / phone / local"
                />
              </div>
            </div>
          ) : (
            <Input
              label="Address / Job Location"
              value={newJob.address}
              onChange={set('address')}
              placeholder="123 Main St, Cityville"
              required
            />
          )}

          <div className="grid grid-cols-3 gap-3">
            <Input label="Appointment Date" type="date" value={newJob.date} onChange={set('date')} required />
            <Input label="Time" type="time" value={newJob.time} onChange={set('time')} required />
            <Input label="PO Number" value={newJob.poNumber} onChange={set('poNumber')} placeholder="PO-98231" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
