import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  User, Phone, MapPin, Calendar, Car, Wrench, MessageSquare, FileText, Plus, Send, File
} from 'lucide-react';
import Button from '../components/Common/Button';
import StatusBadge from '../components/Common/StatusBadge';
import Loading from '../components/Common/Loading';
import Modal from '../components/Common/Modal';
import Input from '../components/Common/Input';
import mediaUrl from '../utils/mediaUrl';
import {
  fetchCustomerHistory,
  createVehicle,
  createNote,
  addVehicleLocal,
  appendHistoryItem
} from '../store/slices/customerSlice';
import { createCommunication, addCommunicationLocal } from '../store/slices/communicationSlice';

const emptyVehicle = { year: '', make: '', model: '', glassCode: '', insuranceNumber: '' };

export default function CustomerProfilePage() {
  const { customerId } = useParams();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('details');

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState(emptyVehicle);
  const [vehicleError, setVehicleError] = useState('');

  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const [comm, setComm] = useState({ communicationType: 'call', direction: 'outbound', message: '' });
  const [commSaving, setCommSaving] = useState(false);

  const { items: customers, customerHistory, isLoading } = useSelector((state) => state.customers);
  const { items: allJobs } = useSelector((state) => state.jobs);
  const { items: allQuotes } = useSelector((state) => state.quotes);
  const { items: allInvoices } = useSelector((state) => state.invoices);
  const { items: allComms } = useSelector((state) => state.communications);

  useEffect(() => {
    if (customerId) {
      dispatch(fetchCustomerHistory(customerId));
    }
  }, [dispatch, customerId]);

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
  const customerQuotes = customerHistory?.quotes?.length ? customerHistory.quotes : allQuotes.filter(matchesCustomer);
  const customerInvoices = customerHistory?.invoices?.length ? customerHistory.invoices : allInvoices.filter(matchesCustomer);
  const customerNotes = customerHistory?.notes || [];
  const customerComms = customerHistory?.communications?.length
    ? customerHistory.communications
    : allComms.filter(matchesCustomer);

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setVehicleError('');

    if (!newVehicle.year.trim() || !newVehicle.make.trim()) {
      setVehicleError('Year and make are required.');
      return;
    }

    const payload = {
      year: Number(newVehicle.year),
      make: newVehicle.make,
      model: newVehicle.model,
      glassCode: newVehicle.glassCode,
      insuranceNumber: newVehicle.insuranceNumber
    };

    try {
      await dispatch(createVehicle({ customerId: resolvedId, data: payload })).unwrap();
    } catch {
      dispatch(addVehicleLocal({ _id: `veh-${Date.now()}`, customerId: resolvedId, ...payload }));
    }

    setIsVehicleModalOpen(false);
    setNewVehicle(emptyVehicle);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setNoteSaving(true);

    try {
      await dispatch(createNote({ customerId: resolvedId, content: noteText })).unwrap();
    } catch {
      dispatch(appendHistoryItem({
        key: 'notes',
        item: {
          _id: `note-${Date.now()}`,
          customerId: resolvedId,
          content: noteText,
          createdAt: new Date().toISOString()
        }
      }));
    }

    setNoteText('');
    setNoteSaving(false);
  };

  const handleLogCommunication = async (e) => {
    e.preventDefault();
    if (!comm.message.trim()) return;
    setCommSaving(true);

    const payload = { customerId: resolvedId, ...comm };

    try {
      await dispatch(createCommunication(payload)).unwrap();
    } catch {
      dispatch(addCommunicationLocal({
        _id: `comm-${Date.now()}`,
        customerId: resolvedId,
        customerName: `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim(),
        communicationType: comm.communicationType,
        direction: comm.direction,
        message: comm.message,
        createdAt: new Date().toISOString()
      }));
      dispatch(appendHistoryItem({
        key: 'communications',
        item: {
          _id: `comm-${Date.now()}`,
          communicationType: comm.communicationType,
          direction: comm.direction,
          message: comm.message,
          createdAt: new Date().toISOString()
        }
      }));
    }

    setComm({ communicationType: 'call', direction: 'outbound', message: '' });
    setCommSaving(false);
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
    { id: 'quotes', label: `Quotes & Invoices (${customerQuotes.length + customerInvoices.length})`, icon: File },
    { id: 'notes', label: `Notes (${customerNotes.length})`, icon: FileText },
    { id: 'communication', label: `Communication (${customerComms.length})`, icon: MessageSquare }
  ];

  const vehicleLabel = (job) => {
    const v = job.vehicleId && typeof job.vehicleId === 'object' ? job.vehicleId : null;
    if (v) return [v.year, v.make, v.model].filter(Boolean).join(' ');
    return job.glassCode ? `Glass ${job.glassCode}` : '—';
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

        <Link to="/jobs">
          <Button variant="primary" icon={Wrench}>New Job</Button>
        </Link>
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
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Details</h3>
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
            <Button variant="outline" size="sm" icon={Plus} onClick={() => setIsVehicleModalOpen(true)}>
              Add Vehicle
            </Button>
          </div>

          {customerVehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customerVehicles.map((v, i) => (
                <div key={v._id || i} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <span className="font-bold text-slate-900">
                    {[v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}
                  </span>
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

      {activeTab === 'quotes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <h3 className="text-sm font-semibold text-slate-800 p-4 border-b border-slate-100">Quotes</h3>
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-slate-100">
                {customerQuotes.length === 0 && (
                  <tr><td className="p-4 text-slate-400">No quotes yet.</td></tr>
                )}
                {customerQuotes.map((q) => (
                  <tr key={q._id}>
                    <td className="p-3 font-bold text-slate-900">{q.quoteId || q._id}</td>
                    <td className="p-3 text-slate-500">{String(q.quoteDate || q.date || '').split('T')[0]}</td>
                    <td className="p-3 font-semibold">${Number(q.totalAmount || q.amount || 0).toFixed(2)}</td>
                    <td className="p-3"><StatusBadge status={q.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Notes</h3>

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
                <p>{n.content}</p>
                <span className="text-[10px] text-slate-400">{String(n.createdAt || '').split('T')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'communication' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Communication History</h3>

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
                <div>
                  <span className="text-xs font-bold text-slate-900 mr-2">
                    [{String(cm.communicationType || cm.type || '').toUpperCase()} · {cm.direction || 'outbound'}]
                  </span>
                  <span className="text-xs text-slate-700">{cm.message}</span>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {String(cm.createdAt || cm.date || '').split('T')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        title="Add Vehicle"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsVehicleModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddVehicle}>Save Vehicle</Button>
          </>
        }
      >
        <form onSubmit={handleAddVehicle} className="space-y-4">
          {vehicleError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {vehicleError}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Input label="Year" value={newVehicle.year} onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })} placeholder="2020" required />
            <Input label="Make" value={newVehicle.make} onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })} placeholder="Toyota" required />
            <Input label="Model" value={newVehicle.model} onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} placeholder="RAV4" />
          </div>
          <Input label="Glass Code" value={newVehicle.glassCode} onChange={(e) => setNewVehicle({ ...newVehicle, glassCode: e.target.value })} placeholder="FW04210 GTY" />
          <Input label="Insurance Number" value={newVehicle.insuranceNumber} onChange={(e) => setNewVehicle({ ...newVehicle, insuranceNumber: e.target.value })} placeholder="Policy / claim number" />
        </form>
      </Modal>
    </div>
  );
}
