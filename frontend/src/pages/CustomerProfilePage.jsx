import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  User, Phone, MapPin, Calendar, Car, Wrench, MessageSquare, FileText, Plus, Send, File
} from 'lucide-react';
import Button from '../components/Common/Button';
import StatusBadge from '../components/Common/StatusBadge';
import Loading from '../components/Common/Loading';
import Modal from '../components/Common/Modal';
import Input from '../components/Common/Input';
import RowActions from '../components/Common/RowActions';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import mediaUrl from '../utils/mediaUrl';
import {
  fetchCustomerHistory,
  updateCustomer,
  deleteCustomer,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  createNote,
  updateNote,
  deleteNote
} from '../store/slices/customerSlice';
import {
  createCommunication,
  updateCommunication,
  deleteCommunication
} from '../store/slices/communicationSlice';

const emptyVehicle = { year: '', make: '', model: '', glassCode: '', insuranceNumber: '' };

export default function CustomerProfilePage() {
  const { customerId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ firstName: '', lastName: '', type: 'vehicle', phoneNumber: '', email: '', address: '', customerSince: '' });
  const [customerFormError, setCustomerFormError] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [vehicleError, setVehicleError] = useState('');

  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteText, setEditNoteText] = useState('');

  const [comm, setComm] = useState({ communicationType: 'call', direction: 'outbound', message: '' });
  const [commSaving, setCommSaving] = useState(false);
  const [commError, setCommError] = useState('');
  const [editingComm, setEditingComm] = useState(null);
  const [commEditForm, setCommEditForm] = useState({ communicationType: 'call', direction: 'outbound', message: '' });
  const [commEditError, setCommEditError] = useState('');
  const [isSavingCommEdit, setIsSavingCommEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { items: customers, customerHistory, isLoading } = useSelector((state) => state.customers);
  const { items: allJobs } = useSelector((state) => state.jobs);
  const { items: allInvoices } = useSelector((state) => state.invoices);
  const { items: allComms } = useSelector((state) => state.communications);

  useEffect(() => {
    if (customerId) {
      dispatch(fetchCustomerHistory(customerId));
    }
  }, [dispatch, customerId]);

  const refreshHistory = () => {
    if (customerId) dispatch(fetchCustomerHistory(customerId));
  };

  const fallbackCustomer = customers.find((c) => c._id === customerId) || customers[0];
  const customer = customerHistory?.customer || fallbackCustomer;
  const resolvedId = customer?._id;

  const matchesCustomer = (item) => {
    const id = item.customerId?._id || item.customerId;
    if (id && resolvedId) return String(id) === String(resolvedId);
    return Boolean(customer?.lastName) && Boolean(item.customerName) &&
      item.customerName.includes(customer.lastName);
  };

  const customerVehicles = customerHistory?.vehicles || customer?.vehicles || [];
  const customerJobs = customerHistory?.jobs?.length ? customerHistory.jobs : allJobs.filter(matchesCustomer);
  const customerInvoices = customerHistory?.invoices?.length ? customerHistory.invoices : allInvoices.filter(matchesCustomer);
  const customerNotes = customerHistory?.notes || [];
  const customerComms = customerHistory?.communications?.length
    ? customerHistory.communications
    : allComms.filter(matchesCustomer);

  const errMsg = (err) => (typeof err === 'string' ? err : 'Could not reach the server. Is it running?');

  const openCustomerEdit = () => {
    setCustomerForm({
      firstName: customer?.firstName || '',
      lastName: customer?.lastName || '',
      type: customer?.type === 'residential' ? 'residential' : 'vehicle',
      phoneNumber: customer?.phoneNumber || '',
      email: customer?.email || '',
      address: customer?.address || '',
      customerSince: customer?.customerSince ? String(customer.customerSince).split('T')[0] : ''
    });
    setCustomerFormError('');
    setIsCustomerModalOpen(true);
  };

  const handleCustomerSave = async (e) => {
    e.preventDefault();
    setCustomerFormError('');

    if (!customerForm.firstName.trim() || !customerForm.lastName.trim()) {
      setCustomerFormError('First and last name are required.');
      return;
    }
    if (!customerForm.phoneNumber.trim()) {
      setCustomerFormError('Phone number is required.');
      return;
    }

    setIsSavingCustomer(true);
    try {
      await dispatch(updateCustomer({ id: resolvedId, changes: customerForm })).unwrap();
      setIsCustomerModalOpen(false);
      refreshHistory();
    } catch (err) {
      setCustomerFormError(errMsg(err));
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const openVehicleModal = (vehicle = null) => {
    setEditingVehicle(vehicle);
    setVehicleForm(vehicle
      ? {
          year: String(vehicle.year || ''),
          make: vehicle.make || '',
          model: vehicle.model || '',
          glassCode: vehicle.glassCode || '',
          insuranceNumber: vehicle.insuranceNumber || ''
        }
      : emptyVehicle);
    setVehicleError('');
    setIsVehicleModalOpen(true);
  };

  const handleVehicleSave = async (e) => {
    e.preventDefault();
    setVehicleError('');

    if (!vehicleForm.year.trim() || !vehicleForm.make.trim()) {
      setVehicleError('Year and make are required.');
      return;
    }

    const payload = {
      year: Number(vehicleForm.year),
      make: vehicleForm.make,
      model: vehicleForm.model,
      glassCode: vehicleForm.glassCode,
      insuranceNumber: vehicleForm.insuranceNumber
    };

    try {
      if (editingVehicle) {
        await dispatch(updateVehicle({ id: editingVehicle._id, changes: payload })).unwrap();
      } else {
        await dispatch(createVehicle({ customerId: resolvedId, data: payload })).unwrap();
      }
      setIsVehicleModalOpen(false);
      setEditingVehicle(null);
      setVehicleForm(emptyVehicle);
      refreshHistory();
    } catch (err) {
      setVehicleError(errMsg(err));
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setNoteSaving(true);
    setNoteError('');

    try {
      await dispatch(createNote({ customerId: resolvedId, content: noteText })).unwrap();
      setNoteText('');
      refreshHistory();
    } catch (err) {
      setNoteError(errMsg(err));
    } finally {
      setNoteSaving(false);
    }
  };

  const handleEditNote = async (note) => {
    if (!editNoteText.trim()) return;
    setNoteError('');

    try {
      await dispatch(updateNote({ id: note._id, content: editNoteText })).unwrap();
      setEditingNoteId(null);
      setEditNoteText('');
      refreshHistory();
    } catch (err) {
      setNoteError(errMsg(err));
    }
  };

  const handleLogCommunication = async (e) => {
    e.preventDefault();
    if (!comm.message.trim()) return;
    setCommSaving(true);
    setCommError('');

    try {
      await dispatch(createCommunication({ customerId: resolvedId, ...comm })).unwrap();
      setComm({ communicationType: 'call', direction: 'outbound', message: '' });
      refreshHistory();
    } catch (err) {
      setCommError(errMsg(err));
    } finally {
      setCommSaving(false);
    }
  };

  const openCommEdit = (cm) => {
    setEditingComm(cm);
    setCommEditForm({
      communicationType: cm.communicationType || cm.type || 'call',
      direction: cm.direction || 'outbound',
      message: cm.message || ''
    });
    setCommEditError('');
  };

  const handleCommEditSave = async () => {
    if (!editingComm) return;
    if (!commEditForm.message.trim()) {
      setCommEditError('Message cannot be empty.');
      return;
    }
    setCommEditError('');
    setIsSavingCommEdit(true);

    try {
      await dispatch(updateCommunication({ id: editingComm._id, changes: commEditForm })).unwrap();
      setEditingComm(null);
      refreshHistory();
    } catch (err) {
      setCommEditError(errMsg(err));
    } finally {
      setIsSavingCommEdit(false);
    }
  };

  const askDelete = (type, item, label) => setDeleteTarget({ type, item, label });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setIsDeleting(true);

    try {
      if (deleteTarget.type === 'customer') {
        await dispatch(deleteCustomer(deleteTarget.item._id)).unwrap();
        navigate('/customers');
        return;
      }
      if (deleteTarget.type === 'vehicle') {
        await dispatch(deleteVehicle(deleteTarget.item._id)).unwrap();
      } else if (deleteTarget.type === 'note') {
        await dispatch(deleteNote(deleteTarget.item._id)).unwrap();
      } else if (deleteTarget.type === 'comm') {
        await dispatch(deleteCommunication(deleteTarget.item._id)).unwrap();
      }
      setDeleteTarget(null);
      refreshHistory();
    } catch (err) {
      setDeleteError(errMsg(err));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && !customer) {
    return <Loading text="Loading customer file..." />;
  }

  if (!customer) {
    return (
      <p className="text-sm text-slate-500">
        Customer not found. <Link className="text-blue-800 font-semibold" to="/customers">Back to customers</Link>
      </p>
    );
  }

  const tabs = [
    { id: 'details', label: 'Details', icon: User },
    { id: 'jobs', label: `Jobs (${customerJobs.length})`, icon: Wrench },
    { id: 'vehicles', label: `Vehicles (${customerVehicles.length})`, icon: Car },
    { id: 'invoices', label: `Invoices (${customerInvoices.length})`, icon: File },
    { id: 'notes', label: `Notes (${customerNotes.length})`, icon: FileText },
    { id: 'communication', label: `Communication (${customerComms.length})`, icon: MessageSquare }
  ];

  const vehicleLabel = (job) => {
    const v = job.vehicleId && typeof job.vehicleId === 'object' ? job.vehicleId : null;
    if (v) return [v.year, v.make, v.model].filter(Boolean).join(' ');
    return job.glassCode ? `Glass ${job.glassCode}` : '—';
  };

  const deleteMessage = () => {
    if (!deleteTarget) return '';
    const { type, item, label } = deleteTarget;
    if (type === 'customer') {
      return `Delete ${customer.firstName} ${customer.lastName}? This removes the customer file from the database permanently.`;
    }
    if (type === 'vehicle') {
      return `Delete vehicle ${label}? It will be removed from this customer's file.`;
    }
    if (type === 'note') return 'Delete this note? This cannot be undone.';
    if (type === 'comm') return `Delete this logged ${String(item.communicationType || 'communication')} entry?`;
    return 'Delete this item?';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-blue-900 text-white rounded-xl flex items-center justify-center text-xl font-bold">
            {(customer.firstName || 'C')[0]}{(customer.lastName || ' ')[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{customer.firstName} {customer.lastName}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                customer.type === 'vehicle' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}>
                {customer.type === 'residential' ? 'House' : 'Vehicle'}
              </span>
              {customer.customerId && (
                <span className="font-mono text-xs font-bold text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">
                  {customer.customerId}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-2">
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.phoneNumber}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {customer.address || '—'}</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Customer since {String(customer.customerSince || '').split('T')[0]}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/jobs">
            <Button variant="primary" icon={Wrench}>New Job</Button>
          </Link>
          <RowActions
            onEdit={openCustomerEdit}
            onDelete={() => askDelete('customer', customer, '')}
          />
        </div>
      </div>

      <div className="border-b border-slate-200 flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-blue-800 text-blue-900 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Details</h3>
              <button
                onClick={openCustomerEdit}
                className="text-xs font-semibold text-blue-800 hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>
            <p className="text-sm text-slate-800">
              <span className="font-semibold text-slate-600">Name:</span> {customer.firstName} {customer.lastName}
            </p>
            <p className="text-sm text-slate-800">
              <span className="font-semibold text-slate-600">Phone:</span> {customer.phoneNumber}
            </p>
            <p className="text-sm text-slate-800">
              <span className="font-semibold text-slate-600">Address:</span> {customer.address || '—'}
            </p>
            <p className="text-sm text-slate-800">
              <span className="font-semibold text-slate-600">Last contact:</span>{' '}
              {customer.lastContactDate ? String(customer.lastContactDate).split('T')[0] : '—'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Insurance</h3>
            {customerVehicles.filter((v) => v.insuranceNumber).length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-800">
                {customerVehicles.filter((v) => v.insuranceNumber).map((v, i) => (
                  <li key={v._id || i} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-medium">{[v.year, v.make, v.model].filter(Boolean).join(' ')}</span>
                    <span className="font-mono text-xs font-bold text-blue-900">{v.insuranceNumber}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                No insurance numbers recorded. Add one on the Vehicles tab.
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 font-semibold text-slate-500">
              <tr>
                <th className="p-3">Job ID</th>
                <th className="p-3">Type</th>
                <th className="p-3">Vehicle / Location</th>
                <th className="p-3">Appointment</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerJobs.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-slate-400">No jobs recorded yet.</td></tr>
              )}
              {customerJobs.map((j) => (
                <tr key={j._id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-bold text-blue-900">{j.jobId || j._id}</td>
                  <td className="p-3 font-medium text-slate-800">
                    {(j.jobType || '').startsWith('vehicle') ? 'Vehicle' : 'House'} ·{' '}
                    {(j.jobType || '').includes('replacement') ? 'Replacement' : 'Repair'}
                  </td>
                  <td className="p-3 text-slate-600">
                    {(j.jobType || '').startsWith('vehicle') ? vehicleLabel(j) : (j.location || '—')}
                  </td>
                  <td className="p-3 text-slate-500">
                    {String(j.appointmentDateTime || '').replace('T', ' ').slice(0, 16) || '—'}
                  </td>
                  <td className="p-3"><StatusBadge status={j.jobStatus || j.status} /></td>
                  <td className="p-3">
                    <Link to={`/jobs/${j._id}`} className="text-blue-800 font-semibold hover:underline">
                      Open file
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'vehicles' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-800">Vehicles</h3>
            <Button variant="outline" size="sm" icon={Plus} onClick={() => openVehicleModal(null)}>
              Add Vehicle
            </Button>
          </div>

          {customerVehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customerVehicles.map((v, i) => (
                <div key={v._id || i} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      {[v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}
                    </span>
                    <RowActions
                      onEdit={() => openVehicleModal(v)}
                      onDelete={() => askDelete('vehicle', v, [v.year, v.make, v.model].filter(Boolean).join(' '))}
                    />
                  </div>
                  <p className="text-xs text-slate-600 font-mono">
                    Glass code: <span className="font-bold text-blue-900">{v.glassCode || '—'}</span>
                  </p>
                  <p className="text-xs text-slate-600 font-mono">
                    Insurance #: <span className="font-bold text-blue-900">{v.insuranceNumber || '—'}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No vehicles on file for this customer.</p>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <h3 className="text-sm font-semibold text-slate-800 p-4 border-b border-slate-100">Invoices</h3>
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-slate-100">
              {customerInvoices.length === 0 && (
                <tr><td className="p-4 text-slate-400">No invoices yet.</td></tr>
              )}
              {customerInvoices.map((inv) => {
                const copyUrl = mediaUrl(inv.fileLocation || inv.digitalCopyUrl);
                return (
                  <tr key={inv._id}>
                    <td className="p-3 font-bold text-slate-900">{inv.invoiceId || inv._id}</td>
                    <td className="p-3 text-slate-500">{String(inv.invoiceDate || inv.date || '').split('T')[0]}</td>
                    <td className="p-3 font-semibold">${Number(inv.totalAmount || inv.amount || 0).toFixed(2)}</td>
                    <td className="p-3"><StatusBadge status={inv.paymentStatus || inv.status} /></td>
                    <td className="p-3">
                      {copyUrl ? (
                        <a href={copyUrl} target="_blank" rel="noreferrer" className="text-blue-800 font-semibold hover:underline">
                          View copy
                        </a>
                      ) : (
                        <span className="text-slate-400">No copy</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Notes</h3>

          {noteError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {noteError}
            </div>
          )}

          <form onSubmit={handleAddNote} className="space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write a note about this customer..."
              rows={3}
              className="w-full text-sm rounded-lg border border-slate-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <Button type="submit" variant="primary" size="sm" isLoading={noteSaving} disabled={!noteText.trim()}>
              Add Note
            </Button>
          </form>

          <div className="space-y-3">
            {customerNotes.length === 0 && (
              <p className="text-xs text-slate-400">No notes yet.</p>
            )}
            {customerNotes.map((n, i) => (
              <div key={n._id || i} className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 text-xs text-slate-700 space-y-1">
                {editingNoteId === n._id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editNoteText}
                      onChange={(e) => setEditNoteText(e.target.value)}
                      rows={3}
                      className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleEditNote(n)}
                        disabled={!editNoteText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditingNoteId(null); setEditNoteText(''); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex-1">{n.content}</p>
                      <RowActions
                        onEdit={() => { setEditingNoteId(n._id); setEditNoteText(n.content); setNoteError(''); }}
                        onDelete={() => askDelete('note', n, '')}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">{String(n.createdAt || '').split('T')[0]}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'communication' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Communication History</h3>

          {commError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {commError}
            </div>
          )}

          <form onSubmit={handleLogCommunication} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Type</label>
              <select
                value={comm.communicationType}
                onChange={(e) => setComm({ ...comm, communicationType: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
              >
                <option value="call">Call</option>
                <option value="sms">Text message</option>
                <option value="email">Email</option>
                <option value="in_person">In person</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Direction</label>
              <select
                value={comm.direction}
                onChange={(e) => setComm({ ...comm, direction: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
              >
                <option value="outbound">Outgoing (we contacted them)</option>
                <option value="inbound">Incoming (they contacted us)</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Message</label>
              <input
                type="text"
                value={comm.message}
                onChange={(e) => setComm({ ...comm, message: e.target.value })}
                placeholder="Spoke about appointment..."
                className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800"
                required
              />
            </div>

            <div>
              <Button type="submit" variant="primary" size="sm" icon={Send} isLoading={commSaving} disabled={!comm.message.trim()}>
                Log
              </Button>
            </div>
          </form>

          <div className="space-y-3">
            {customerComms.length === 0 && (
              <p className="text-xs text-slate-400">No calls or messages logged yet.</p>
            )}
            {customerComms.map((cm, i) => (
              <div key={cm._id || cm.id || i} className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 flex justify-between items-start gap-3">
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-900 mr-2">
                    [{String(cm.communicationType || cm.type || '').toUpperCase()} · {cm.direction || 'outbound'}]
                  </span>
                  <span className="text-xs text-slate-700">{cm.message}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {String(cm.createdAt || cm.date || '').split('T')[0]}
                  </span>
                  <RowActions
                    onEdit={() => openCommEdit(cm)}
                    onDelete={() => askDelete('comm', cm, '')}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Edit Customer"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCustomerModalOpen(false)} disabled={isSavingCustomer}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCustomerSave} isLoading={isSavingCustomer}>
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleCustomerSave} className="space-y-4">
          {customerFormError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {customerFormError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={customerForm.firstName}
              onChange={(e) => setCustomerForm({ ...customerForm, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={customerForm.lastName}
              onChange={(e) => setCustomerForm({ ...customerForm, lastName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
              Customer Type
            </label>
            <select
              value={customerForm.type}
              onChange={(e) => setCustomerForm({ ...customerForm, type: e.target.value })}
              className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
            >
              <option value="vehicle">Vehicle (auto glass)</option>
              <option value="residential">House / Residential</option>
            </select>
          </div>
          <Input
            label="Phone Number"
            value={customerForm.phoneNumber}
            onChange={(e) => setCustomerForm({ ...customerForm, phoneNumber: e.target.value })}
            helperText="Max 25 characters."
            maxLength={25}
            required
          />
          <Input
            label="Date of Joining"
            type="date"
            value={customerForm.customerSince}
            onChange={(e) => setCustomerForm({ ...customerForm, customerSince: e.target.value })}
          />
          <Input
            label="Email (optional)"
            type="email"
            value={customerForm.email}
            onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
          />
          <Input
            label="Address"
            value={customerForm.address}
            onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
          />
        </form>
      </Modal>

      <Modal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsVehicleModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleVehicleSave}>
              {editingVehicle ? 'Save Changes' : 'Save Vehicle'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleVehicleSave} className="space-y-4">
          {vehicleError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {vehicleError}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Input label="Year" value={vehicleForm.year} onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })} placeholder="2020" required />
            <Input label="Make" value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })} placeholder="Toyota" required />
            <Input label="Model" value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="RAV4" />
          </div>
          <Input label="Glass Code" value={vehicleForm.glassCode} onChange={(e) => setVehicleForm({ ...vehicleForm, glassCode: e.target.value })} placeholder="FW04210 GTY" />
          <Input label="Insurance Number" value={vehicleForm.insuranceNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, insuranceNumber: e.target.value })} placeholder="Policy / claim number" />
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editingComm)}
        onClose={() => setEditingComm(null)}
        title="Edit Communication"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingComm(null)} disabled={isSavingCommEdit}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCommEditSave} isLoading={isSavingCommEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {commEditError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {commEditError}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Type</label>
            <select
              value={commEditForm.communicationType}
              onChange={(e) => setCommEditForm({ ...commEditForm, communicationType: e.target.value })}
              className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
            >
              <option value="call">Call</option>
              <option value="sms">Text message</option>
              <option value="email">Email</option>
              <option value="in_person">In person</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Direction</label>
            <select
              value={commEditForm.direction}
              onChange={(e) => setCommEditForm({ ...commEditForm, direction: e.target.value })}
              className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
            >
              <option value="outbound">Outgoing (we contacted them)</option>
              <option value="inbound">Incoming (they contacted us)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Message</label>
            <textarea
              value={commEditForm.message}
              onChange={(e) => setCommEditForm({ ...commEditForm, message: e.target.value })}
              rows={3}
              className="w-full text-sm rounded-lg border border-slate-300 p-3 text-slate-800"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Confirm delete"
        message={deleteMessage()}
        isBusy={isDeleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
