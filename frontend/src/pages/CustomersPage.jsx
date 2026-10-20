import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { UserPlus, Eye, Search, Filter } from 'lucide-react';
import SearchBar from '../components/Common/SearchBar';
import Table from '../components/Common/Table';
import Button from '../components/Common/Button';
import Modal from '../components/Common/Modal';
import Input from '../components/Common/Input';
import Loading from '../components/Common/Loading';
import RowActions from '../components/Common/RowActions';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import {
  fetchCustomers,
  searchCustomersByPhone,
  searchCustomersByName,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '../store/slices/customerSlice';

const today = () => new Date().toISOString().split('T')[0];

const emptyCustomer = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  type: 'vehicle',
  address: '',
  customerSince: today()
};

export default function CustomersPage() {
  const dispatch = useDispatch();
  const { items: customers, isLoading } = useSelector((state) => state.customers);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState(emptyCustomer);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  useEffect(() => {
    dispatch(fetchCustomers({ limit: 100 }));
  }, [dispatch]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setForm({ ...emptyCustomer, customerSince: today() });
    setSaveError('');
    setIsModalOpen(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setForm({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      phoneNumber: customer.phoneNumber || '',
      type: customer.type || 'vehicle',
      address: customer.address || '',
      customerSince: customer.customerSince ? String(customer.customerSince).split('T')[0] : ''
    });
    setSaveError('');
    setIsModalOpen(true);
  };

  const handleSearch = ({ type, query: text }) => {
    setSearchError('');
    if (!text) {
      dispatch(fetchCustomers({ limit: 100 }));
      return;
    }

    const thunk = type === 'phone'
      ? searchCustomersByPhone(text)
      : searchCustomersByName(text);

    dispatch(thunk).then((result) => {
      if (result.meta.requestStatus === 'rejected') {
        setSearchError(result.payload || 'Search failed. Is the server running?');
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    setIsSaving(true);
    const payload = { ...form };

    try {
      if (editingCustomer) {
        await dispatch(updateCustomer({ id: editingCustomer._id, changes: payload })).unwrap();
      } else {
        await dispatch(createCustomer(payload)).unwrap();
      }
      setIsModalOpen(false);
      setEditingCustomer(null);
      setForm(emptyCustomer);
    } catch (err) {
      setSaveError(typeof err === 'string' ? err : 'Could not save. Is the server running?');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setIsDeleting(true);

    try {
      await dispatch(deleteCustomer(deleteTarget._id)).unwrap();
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(typeof err === 'string' ? err : 'Could not delete. Is the server running?');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => typeFilter === 'All' || c.type === typeFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customers</h2>
          <p className="text-xs text-slate-500">
            Find an existing customer by phone number or last name, or add a new one.
          </p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={openAddModal}>
          Add Customer
        </Button>
      </div>

      <SearchBar onSearch={handleSearch} />

      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-700">Type:</span>
        {['All', 'vehicle', 'residential'].map((ft) => (
          <button
            key={ft}
            onClick={() => setTypeFilter(ft)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              typeFilter === ft ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {ft === 'All' ? 'All' : ft === 'vehicle' ? 'Vehicle' : 'House'}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-auto">
          {filteredCustomers.length} of {customers.length} shown
        </span>
      </div>

      {searchError && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {searchError}
        </div>
      )}

      {isLoading ? (
        <Loading text="Loading customers..." />
      ) : (
        <>
          <Table
            columns={['Name', 'Customer ID', 'Phone Number', 'Customer Type', 'Date of Joining', 'Address / Job Location', '', '']}
            data={filteredCustomers}
            renderRow={(c) => (
              <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  <Link to={`/customers/${c._id}`} className="hover:text-blue-800">
                    {c.firstName} {c.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-blue-900">
                  {c.customerId || '—'}
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">{c.phoneNumber}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                    c.type === 'vehicle' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {c.type === 'vehicle' ? 'Vehicle' : 'House'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.customerSince ? String(c.customerSince).split('T')[0] : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.address || '—'}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/customers/${c._id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 rounded-md px-2 py-1"
                    title="Open customer file"
                  >
                    <Eye className="w-3.5 h-3.5" /> Open
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => openEditModal(c)}
                    onDelete={() => { setDeleteTarget(c); setDeleteError(''); }}
                  />
                </td>
              </tr>
            )}
          />
          {filteredCustomers.length === 0 && (
            <p className="text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <Search className="w-4 h-4" /> No customers found. Add the first one.
            </p>
          )}
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} isLoading={isSaving}>
              {editingCustomer ? 'Save Changes' : 'Save Customer'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {saveError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {saveError}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
              Customer Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800"
            >
              <option value="vehicle">Vehicle (windshield / auto glass)</option>
              <option value="residential">House / Residential glass</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Customer Name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="First name"
              required
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Last name"
              required
            />
          </div>

          <Input
            label="Phone Number"
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            placeholder="e.g. 555-0199 or +1 (416) 555-1234"
            helperText="Max 25 characters. Used to find this customer again."
            maxLength={25}
            required
          />

          <Input
            label="Date of Joining"
            type="date"
            value={form.customerSince}
            onChange={(e) => setForm({ ...form, customerSince: e.target.value })}
            max={today()}
          />

          <Input
            label="Address / Job Location"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="123 Main St..."
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete customer"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.firstName} ${deleteTarget.lastName}? This removes the customer record from the database.`
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
