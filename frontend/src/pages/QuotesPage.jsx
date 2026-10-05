import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import StatusBadge from '../components/Common/StatusBadge';
import Table from '../components/Common/Table';
import Button from '../components/Common/Button';
import Modal from '../components/Common/Modal';
import Input from '../components/Common/Input';
import Loading from '../components/Common/Loading';
import { fetchQuotes, createQuote, addQuoteLocal } from '../store/slices/quoteSlice';
import { fetchCustomers } from '../store/slices/customerSlice';

export default function QuotesPage() {
  const dispatch = useDispatch();
  const { items: quotes, isLoading } = useSelector((state) => state.quotes);
  const { items: customers } = useSelector((state) => state.customers);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newQuote, setNewQuote] = useState({
    customerId: '',
    description: '',
    amount: '',
    status: 'draft'
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    dispatch(fetchQuotes());
    dispatch(fetchCustomers({ limit: 100 }));
  }, [dispatch]);

  const handleCreateQuote = async (e) => {
    e.preventDefault();
    setFormError('');

    const customer = customers.find((c) => c._id === newQuote.customerId);
    const amount = parseFloat(newQuote.amount);

    if (!customer) {
      setFormError('Choose the customer this quote is for.');
      return;
    }
    if (!amount || amount <= 0) {
      setFormError('Enter the quoted amount.');
      return;
    }

    const payload = {
      customerId: customer._id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      quoteDate: new Date().toISOString().split('T')[0],
      lineItems: [
        {
          description: newQuote.description || 'Glass repair / replacement',
          quantity: 1,
          unitPrice: amount
        }
      ],
      totalAmount: amount,
      status: newQuote.status
    };

    try {
      await dispatch(createQuote(payload)).unwrap();
    } catch {
      dispatch(addQuoteLocal({
        ...payload,
        _id: `q-${Date.now()}`,
        quoteId: `Q-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, '0')}`
      }));
    }

    setIsModalOpen(false);
    setNewQuote({ customerId: '', description: '', amount: '', status: 'draft' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quotes</h2>
          <p className="text-xs text-slate-500">Price estimates given to customers</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Create Quote
        </Button>
      </div>

      {isLoading ? (
        <Loading text="Loading quotes..." />
      ) : (
        <Table
          columns={['Quote ID', 'Customer', 'Date', 'Amount', 'Status']}
          data={quotes}
          renderRow={(q) => {
            const customerDisplayName = q.customerId?.firstName
              ? `${q.customerId.firstName} ${q.customerId.lastName}`
              : (q.customerName || '—');

            return (
              <tr key={q._id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-bold text-slate-900">{q.quoteId || q._id}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{customerDisplayName}</td>
                <td className="px-4 py-3 text-slate-500">
                  {String(q.quoteDate || q.date || '').split('T')[0] || '—'}
                </td>
                <td className="px-4 py-3 font-bold text-slate-900">
                  ${Number(q.totalAmount || q.amount || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
              </tr>
            );
          }}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Quote"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateQuote}>Save Quote</Button>
          </>
        }
      >
        <form onSubmit={handleCreateQuote} className="space-y-4">
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
              value={newQuote.customerId}
              onChange={(e) => setNewQuote({ ...newQuote, customerId: e.target.value })}
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
            label="What is being quoted?"
            value={newQuote.description}
            onChange={(e) => setNewQuote({ ...newQuote, description: e.target.value })}
            placeholder="Windshield replacement"
          />

          <Input
            label="Quoted Amount ($)"
            type="number"
            value={newQuote.amount}
            onChange={(e) => setNewQuote({ ...newQuote, amount: e.target.value })}
            placeholder="450.00"
            required
          />

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
              Status
            </label>
            <select
              value={newQuote.status}
              onChange={(e) => setNewQuote({ ...newQuote, status: e.target.value })}
              className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent to customer</option>
              <option value="accepted">Accepted</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
