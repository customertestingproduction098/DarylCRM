import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { UserPlus, Eye, Search } from 'lucide-react';
import SearchBar from '../components/Common/SearchBar';
import Table from '../components/Common/Table';
import Button from '../components/Common/Button';
import Modal from '../components/Common/Modal';
import Input from '../components/Common/Input';
import Loading from '../components/Common/Loading';
import {
  fetchCustomers,
  searchCustomersByPhone,
  searchCustomersByName,
  createCustomer,
  addCustomerLocal
} from '../store/slices/customerSlice';

const emptyCustomer = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  type: 'vehicle',
  address: ''
};

export default function CustomersPage() {
  const dispatch = useDispatch();
  const { items: customers, isLoading } = useSelector((state) => state.customers);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState(emptyCustomer);
  const [query, setQuery] = useState(null);
  const [searchOffline, setSearchOffline] = useState(false);

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const handleSearch = ({ type, query: text }) => {
    setQuery(text ? { type, text } : null);
    if (!text) {
      setSearchOffline(false);
      dispatch(fetchCustomers());
      return;
    }

    const thunk = type === 'phone'
      ? searchCustomersByPhone(text)
      : searchCustomersByName(text);

    dispatch(thunk).then((result) => {
      setSearchOffline(result.meta.requestStatus === 'rejected');
    });
  };

  // Backend unreachable: match on phone number or last name locally
  const displayedCustomers = (() => {
    if (!searchOffline || !query) return customers;
    const isPhone = query.type === 'phone';
    const needle = isPhone ? query.text.replace(/\D/g, '') : query.text.trim().toLowerCase();

    return customers.filter((c) => {
      if (isPhone) return (c.phoneNumber || '').replace(/\D/g, '').includes(needle);
      const last = (c.lastName || '').toLowerCase();
      return last === needle || last.startsWith(needle);
    });
  })();

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...newCustomer };

    try {
      await dispatch(createCustomer(payload)).unwrap();
    } catch {
      dispatch(addCustomerLocal({
        _id: `cust-${Date.now()}`,
        ...payload,
        customerSince: new Date().toISOString(),
        vehicles: []
      }));
    }

    setIsAddModalOpen(false);
    setNewCustomer(emptyCustomer);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customers</h2>
          <p className="text-xs text-slate-500">
            Find an existing customer by phone number or last name, or add a new one.
          </p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={() => setIsAddModalOpen(true)}>
          Add Customer
        </Button>
      </div>

      <SearchBar onSearch={handleSearch} />

      {isLoading ? (
        <Loading text="Loading customers..." />
      ) : (
        <>
          <Table
            columns={['Name', 'Phone Number', 'Customer Type', 'Address / Job Location', '']}
            data={displayedCustomers}
            renderRow={(c) => (
              <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  <Link to={`/customers/${c._id}`} className="hover:text-blue-800">
                    {c.firstName} {c.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">{c.phoneNumber}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                    c.type === 'vehicle' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {c.type === 'vehicle' ? 'Vehicle' : 'House'}
                  </span>
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
              </tr>
            )}
          />
          {displayedCustomers.length === 0 && (
            <p className="text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <Search className="w-4 h-4" /> No customer matches that phone number or last name.
            </p>
          )}
        </>
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Customer"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddSubmit}>
              Save Customer
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
              Customer Type
            </label>
            <select
              value={newCustomer.type}
              onChange={(e) => setNewCustomer({ ...newCustomer, type: e.target.value })}
              className="w-full text-sm rounded-lg border border-slate-300 p-2 text-slate-800"
            >
              <option value="vehicle">Vehicle (windshield / auto glass)</option>
              <option value="residential">House / Residential glass</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Customer Name"
              value={newCustomer.firstName}
              onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
              placeholder="First name"
              required
            />
            <Input
              label="Last Name"
              value={newCustomer.lastName}
              onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
              placeholder="Last name"
              required
            />
          </div>

          <Input
            label="Phone Number"
            value={newCustomer.phoneNumber}
            onChange={(e) => setNewCustomer({ ...newCustomer, phoneNumber: e.target.value })}
            placeholder="e.g. 555-0199"
            helperText="Used to find this customer again"
            required
          />

          <Input
            label="Address / Job Location"
            value={newCustomer.address}
            onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
            placeholder="123 Main St..."
          />
        </form>
      </Modal>
    </div>
  );
}
