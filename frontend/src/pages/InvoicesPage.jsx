import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Upload, CreditCard, Filter, FileCheck2, FileText } from 'lucide-react';
import StatusBadge from '../components/Common/StatusBadge';
import Table from '../components/Common/Table';
import Button from '../components/Common/Button';
import Modal from '../components/Common/Modal';
import Input from '../components/Common/Input';
import Loading from '../components/Common/Loading';
import mediaUrl from '../utils/mediaUrl';
import {
  fetchInvoices,
  createInvoice,
  recordPayment,
  addInvoiceLocal,
  updateInvoice,
  updateInvoiceLocal,
  uploadInvoiceCopy
} from '../store/slices/invoiceSlice';
import { fetchCustomers } from '../store/slices/customerSlice';

export default function InvoicesPage() {
  const dispatch = useDispatch();
  const { items: invoices, isLoading } = useSelector((state) => state.invoices);
  const { items: customers } = useSelector((state) => state.customers);
  const fileInputRef = useRef(null);

  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [newInvoice, setNewInvoice] = useState({ customerId: '', description: '', amount: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    dispatch(fetchInvoices());
    dispatch(fetchCustomers({ limit: 100 }));
  }, [dispatch]);

  const filteredInvoices = invoices.filter((i) => {
    if (statusFilter === 'All') return true;
    return (i.paymentStatus || i.status) === statusFilter;
  });

  const totalOutstanding = invoices.reduce((sum, inv) => {
    const status = inv.paymentStatus || inv.status;
    const amount = Number(inv.totalAmount || inv.amount || 0);
    const paid = Number(inv.amountPaid || inv.paid || 0);
    return status !== 'paid' ? sum + (amount - paid) : sum;
  }, 0);

  const handleRecordPayment = async (inv) => {
    const payAmount = Number(inv.totalAmount || inv.amount || 0) - Number(inv.amountPaid || inv.paid || 0);
    if (payAmount <= 0 || !inv._id) return;

    try {
      await dispatch(recordPayment({
        id: inv._id,
        paymentData: { amountPaid: payAmount, paymentMethod: 'Cash' }
      })).unwrap();
    } catch {
      dispatch(updateInvoiceLocal({
        id: inv._id,
        changes: {
          amountPaid: Number(inv.totalAmount || inv.amount || 0),
          paymentStatus: 'paid'
        }
      }));
    }
  };

  const handleTogglePhysical = async (inv) => {
    const next = !(inv.physicalCopyFiled ?? false);
    if (!inv._id) return;

    try {
      await dispatch(updateInvoice({
        id: inv._id,
        changes: { physicalCopyFiled: next }
      })).unwrap();
    } catch {
      dispatch(updateInvoiceLocal({ id: inv._id, changes: { physicalCopyFiled: next } }));
    }
  };

  const handleFileSelected = async (file) => {
    const target = uploadTarget;
    if (!file || !target) return;
    setUploadError('');

    try {
      await dispatch(uploadInvoiceCopy({ id: target._id, file })).unwrap();
    } catch (err) {
      if (err?.offline) {
        dispatch(updateInvoiceLocal({
          id: target._id,
          changes: { fileLocation: URL.createObjectURL(file) }
        }));
      } else {
        setUploadError(err?.message || 'Upload failed');
      }
    } finally {
      setUploadTarget(null);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setFormError('');

    const customer = customers.find((c) => c._id === newInvoice.customerId);
    const amount = parseFloat(newInvoice.amount);

    if (!customer) {
      setFormError('Choose the customer this invoice is for.');
      return;
    }
    if (!amount || amount <= 0) {
      setFormError('Enter the invoice amount.');
      return;
    }

    const payload = {
      customerId: customer._id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      lineItems: [{ description: newInvoice.description || 'Glass work', quantity: 1, unitPrice: amount }],
      totalAmount: amount,
      amountPaid: 0,
      paymentStatus: 'pending',
      physicalCopyFiled: false
    };

    try {
      await dispatch(createInvoice(payload)).unwrap();
    } catch {
      dispatch(addInvoiceLocal({
        ...payload,
        _id: `inv-${Date.now()}`,
        invoiceId: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`
      }));
    }

    setIsModalOpen(false);
    setNewInvoice({ customerId: '', description: '', amount: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Invoices</h2>
          <p className="text-xs text-slate-500">
            Store a digital copy of each invoice and tick when the paper copy is filed
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Create Invoice
        </Button>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Balance</p>
          <p className="text-2xl font-extrabold text-slate-900">${totalOutstanding.toFixed(2)}</p>
        </div>
        <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg">
          {invoices.filter((i) => (i.paymentStatus || i.status) !== 'paid').length} unpaid
        </span>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-700">Status:</span>
        {['All', 'paid', 'pending', 'overdue'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === st ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {uploadError && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {uploadError}
        </div>
      )}

      {isLoading ? (
        <Loading text="Loading invoices..." />
      ) : (
        <Table
          columns={['Invoice ID', 'Customer', 'Date', 'Amount', 'Paid', 'Status', 'Digital Copy', 'Paper Filed', '']}
          data={filteredInvoices}
          renderRow={(inv) => {
            const customerDisplayName = inv.customerId?.firstName
              ? `${inv.customerId.firstName} ${inv.customerId.lastName}`
              : (inv.customerName || '—');

            const status = inv.paymentStatus || inv.status;
            const amount = Number(inv.totalAmount || inv.amount || 0);
            const paid = Number(inv.amountPaid || inv.paid || 0);
            const copyUrl = mediaUrl(inv.fileLocation || inv.digitalCopyUrl);

            return (
              <tr key={inv._id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-bold text-slate-900">{inv.invoiceId || inv._id}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{customerDisplayName}</td>
                <td className="px-4 py-3 text-slate-500">
                  {String(inv.invoiceDate || inv.date || '').split('T')[0] || '—'}
                </td>
                <td className="px-4 py-3 font-bold text-slate-900">${amount.toFixed(2)}</td>
                <td className="px-4 py-3 font-medium text-slate-700">${paid.toFixed(2)}</td>
                <td className="px-4 py-3"><StatusBadge status={status} /></td>
                <td className="px-4 py-3">
                  {copyUrl ? (
                    <a
                      href={copyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:underline"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" /> View
                    </a>
                  ) : (
                    <button
                      onClick={() => { setUploadTarget(inv); setUploadError(''); fileInputRef.current?.click(); }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /> Store
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={Boolean(inv.physicalCopyFiled)}
                    onChange={() => handleTogglePhysical(inv)}
                    className="rounded border-slate-300 cursor-pointer"
                    title="Paper copy is in the filing stack"
                  />
                </td>
                <td className="px-4 py-3">
                  {status !== 'paid' && (
                    <button
                      onClick={() => handleRecordPayment(inv)}
                      className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <CreditCard className="w-3 h-3" /> Record payment
                    </button>
                  )}
                </td>
              </tr>
            );
          }}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          handleFileSelected(file);
          e.target.value = '';
        }}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Invoice"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateInvoice}>Create Invoice</Button>
          </>
        }
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
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
              value={newInvoice.customerId}
              onChange={(e) => setNewInvoice({ ...newInvoice, customerId: e.target.value })}
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

          <Input
            label="What is being invoiced?"
            value={newInvoice.description}
            onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
            placeholder="Windshield replacement & materials"
          />

          <Input
            label="Total Amount ($)"
            type="number"
            value={newInvoice.amount}
            onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
            placeholder="680.00"
            required
          />

          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <FileText className="w-3.5 h-3.5" />
            You can store a digital copy and tick the paper copy once it is filed.
          </p>
        </form>
      </Modal>
    </div>
  );
}
