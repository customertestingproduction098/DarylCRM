import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Eye, Filter } from 'lucide-react';
import StatusBadge from '../components/Common/StatusBadge';
import Table from '../components/Common/Table';
import Button from '../components/Common/Button';
import Loading from '../components/Common/Loading';
import RowActions from '../components/Common/RowActions';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import JobFormModal from '../components/Common/JobFormModal';
import { fetchJobs, deleteJob } from '../store/slices/jobSlice';
import { fetchCustomers } from '../store/slices/customerSlice';

export default function JobsPage() {
  const dispatch = useDispatch();
  const { items: jobs, isLoading } = useSelector((state) => state.jobs);

  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchJobs({ limit: 100 }));
    dispatch(fetchCustomers({ limit: 100 }));
  }, [dispatch]);

  const openAddModal = () => {
    setEditingJob(null);
    setIsModalOpen(true);
  };

  const openEditModal = (job) => {
    setEditingJob(job);
    setIsModalOpen(true);
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
        {['All', 'quote', 'scheduled', 'in_progress', 'completed', 'cancelled'].map((st) => (
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
          columns={['Job ID', 'Customer', 'Job Type', 'Appointment', 'Created', 'Quote', 'Status', '', '']}
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
                <td className="px-4 py-3 text-slate-600">
                  {j.createdAt ? String(j.createdAt).replace('T', ' ').slice(0, 16) : '—'}
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

      <JobFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingJob(null); }}
        job={editingJob}
      />

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
