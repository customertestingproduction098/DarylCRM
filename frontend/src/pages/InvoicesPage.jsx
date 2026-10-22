import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Upload, CreditCard, Filter, FileCheck2, Printer, Paperclip, Undo2 } from 'lucide-react';
import StatusBadge from '../components/Common/StatusBadge';
import Table from '../components/Common/Table';
import Button from '../components/Common/Button';
import Modal from '../components/Common/Modal';
import Loading from '../components/Common/Loading';
import RowActions from '../components/Common/RowActions';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import InvoiceDocument from '../components/Common/InvoiceDocument';
import InvoiceFormModal from '../components/Common/InvoiceFormModal';
import mediaUrl from '../utils/mediaUrl';
import {
  fetchInvoices,
  recordPayment,
  updateInvoice,
  deleteInvoice,
  uploadInvoiceCopy
} from '../store/slices/invoiceSlice';
import { fetchCustomers } from '../store/slices/customerSlice';
import { fetchJobs } from '../store/slices/jobSlice';

export default function InvoicesPage() {
  const dispatch = useDispatch();
  const { items: invoices, isLoading } = useSelector((state) => state.invoices);
  const fileInputRef = useRef(null);

  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [viewTarget, setViewTarget] = useState(null);
  const [justPaidId, setJustPaidId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchInvoices({ limit: 100 }));
    dispatch(fetchCustomers({ limit: 100 }));
    dispatch(fetchJobs({ limit: 100 }));
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
    setActionError('');

    try {
      await dispatch(recordPayment({
        id: inv._id,
        paymentData: { amountPaid: payAmount, paymentMethod: 'Cash' }
      })).unwrap();
      setJustPaidId(inv._id);
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'Could not record the payment. Is the server running?');
    }
  };

  const handleUndoPayment = async (inv) => {
    if (!inv._id) return;
    setActionError('');

    try {
      await dispatch(updateInvoice({
        id: inv._id,
        changes: { amountPaid: 0, paymentStatus: 'pending' }
      })).unwrap();
      setJustPaidId((prev) => (prev === inv._id ? null : prev));
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'Could not undo the payment. Is the server running?');
    }
  };

  const handleTogglePhysical = async (inv) => {
    const next = !(inv.physicalCopyFiled ?? false);
    if (!inv._id) return;
    setActionError('');

    try {
      await dispatch(updateInvoice({
        id: inv._id,
        changes: { physicalCopyFiled: next }
      })).unwrap();
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'Could not update the invoice. Is the server running?');
    }
  };

  const handleFileSelected = async (file) => {
    const target = uploadTarget;
    if (!file || !target) return;
    setUploadError('');

    try {
      await dispatch(uploadInvoiceCopy({ id: target._id, file })).unwrap();
    } catch (err) {
      setUploadError(typeof err === 'string' ? err : 'Upload failed. Is the server running?');
    } finally {
      setUploadTarget(null);
    }
  };

  const handlePrint = () => {
    const area = document.getElementById('invoice-print-area');
    if (!area) return;
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;
    win.document.write(
      `<html><head><title>Invoice</title>
        <style>
          body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; }
        </style>
      </head><body>${area.outerHTML}</body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  };

  const openAddModal = () => {
    setEditingInvoice(null);
    setIsModalOpen(true);
  };

  const openEditModal = (inv) => {
    setEditingInvoice(inv);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setIsDeleting(true);

    try {
      await dispatch(deleteInvoice(deleteTarget._id)).unwrap();
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
          <h2 className="text-xl font-bold text-slate-900">Invoices</h2>
          <p className="text-xs text-slate-500">
            Store a digital copy of each invoice and tick when the paper copy is filed
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openAddModal}>
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

      {(uploadError || actionError) && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {uploadError || actionError}
        </div>
      )}

      {isLoading ? (
        <Loading text="Loading invoices..." />
      ) : (
        <Table
          columns={['Invoice ID', 'Customer', 'Job', 'Date', 'Amount', 'Paid', 'Status', 'Digital Copy', 'Paper Filed', '', '']}
          data={filteredInvoices}
          renderRow={(inv) => {
            const customerDisplayName = inv.customerId?.firstName
              ? `${inv.customerId.firstName} ${inv.customerId.lastName}`
              : (inv.customerName || '—');

            const status = inv.paymentStatus || inv.status;
            const amount = Number(inv.totalAmount || inv.amount || 0);
            const paid = Number(inv.amountPaid || inv.paid || 0);
            const copyUrl = mediaUrl(inv.fileLocation || inv.digitalCopyUrl);
            const jobId = inv.jobId?._id || inv.jobId;
            const jobLabel = inv.jobId?.jobId
              || inv.jobId?.jobType
              || (jobId ? String(jobId).slice(-6) : '—');

            return (
              <tr key={inv._id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-bold text-slate-900">{inv.invoiceId || inv._id}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{customerDisplayName}</td>
                <td className="px-4 py-3 text-slate-600 font-medium">{jobLabel}</td>
                <td className="px-4 py-3 text-slate-500">
                  {String(inv.invoiceDate || inv.date || '').split('T')[0] || '—'}
                </td>
                <td className="px-4 py-3 font-bold text-slate-900">${amount.toFixed(2)}</td>
                <td className="px-4 py-3 font-medium text-slate-700">${paid.toFixed(2)}</td>
                <td className="px-4 py-3"><StatusBadge status={status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewTarget(inv)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:underline cursor-pointer"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" /> View
                    </button>
                    {copyUrl ? (
                      <a
                        href={copyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:underline"
                        title="Open the scanned copy"
                      >
                        <Paperclip className="w-3 h-3" /> Scan
                      </a>
                    ) : (
                      <button
                        onClick={() => { setUploadTarget(inv); setUploadError(''); fileInputRef.current?.click(); }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-semibold cursor-pointer"
                        title="Attach a scanned copy"
                      >
                        <Upload className="w-3 h-3" /> Attach scan
                      </button>
                    )}
                  </div>
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
                  <div className="flex items-center gap-2">
                    {status !== 'paid' && (
                      <button
                        onClick={() => handleRecordPayment(inv)}
                        className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <CreditCard className="w-3 h-3" /> Record payment
                      </button>
                    )}
                    {(justPaidId === inv._id || paid > 0) && (
                      <button
                        onClick={() => handleUndoPayment(inv)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                        title="Undo payment and mark as unpaid"
                      >
                        <Undo2 className="w-3 h-3" /> Undo
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => openEditModal(inv)}
                    onDelete={() => { setDeleteTarget(inv); setDeleteError(''); }}
                  />
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

      <InvoiceFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingInvoice(null); }}
        invoice={editingInvoice}
        onSaved={(_saved, warning) => {
          if (warning) setActionError(warning);
        }}
      />

      <Modal
        isOpen={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        title={`Digital Copy — ${viewTarget?.invoiceId || 'Invoice'}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setViewTarget(null)}>Close</Button>
            <Button variant="primary" icon={Printer} onClick={handlePrint}>Print / Save PDF</Button>
          </>
        }
      >
        <InvoiceDocument invoice={viewTarget} />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete invoice"
        message={
          deleteTarget
            ? `Delete invoice ${deleteTarget.invoiceId || ''}? This removes it from the database permanently.`
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
