import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/customers', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/customers/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const fetchCustomerHistory = createAsyncThunk(
  'customers/fetchCustomerHistory',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/customers/${id}/history`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const searchCustomersByPhone = createAsyncThunk(
  'customers/searchCustomersByPhone',
  async (phone, { rejectWithValue }) => {
    try {
      const response = await api.get(`/customers/search/by-phone/${phone}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const searchCustomersByName = createAsyncThunk(
  'customers/searchCustomersByName',
  async (lastName, { rejectWithValue }) => {
    try {
      const response = await api.get(`/customers/search/by-name/${lastName}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (customerData, { rejectWithValue }) => {
    try {
      const response = await api.post('/customers', customerData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/customers/${id}`, changes);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/customers/${id}`);
      return { id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const createVehicle = createAsyncThunk(
  'customers/createVehicle',
  async ({ customerId, data }, { rejectWithValue }) => {
    try {
      const response = await api.post('/vehicles', { customerId, ...data });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const fetchCustomerVehicles = createAsyncThunk(
  'customers/fetchCustomerVehicles',
  async (customerId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/vehicles/customer/${customerId}`);
      return { customerId, vehicles: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const updateVehicle = createAsyncThunk(
  'customers/updateVehicle',
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/vehicles/${id}`, changes);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const deleteVehicle = createAsyncThunk(
  'customers/deleteVehicle',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/vehicles/${id}`);
      return { id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const createNote = createAsyncThunk(
  'customers/createNote',
  async ({ customerId, content }, { rejectWithValue }) => {
    try {
      const response = await api.post('/notes', { customerId, content });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const updateNote = createAsyncThunk(
  'customers/updateNote',
  async ({ id, content }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/notes/${id}`, { content });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const deleteNote = createAsyncThunk(
  'customers/deleteNote',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/notes/${id}`);
      return { id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

const customerSlice = createSlice({
  name: 'customers',
  initialState: {
    items: [],
    selectedCustomer: null,
    customerHistory: null,
    customerVehicles: [],
    vehiclesCustomerId: null,
    total: 0,
    page: 1,
    pages: 1,
    isLoading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchCustomers
      .addCase(fetchCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload?.data || [];
        state.total = action.payload?.total || 0;
        state.page = action.payload?.page || 1;
        state.pages = action.payload?.pages || 1;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // fetchCustomerById
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.selectedCustomer = action.payload;
      })
      // fetchCustomerHistory
      .addCase(fetchCustomerHistory.fulfilled, (state, action) => {
        state.customerHistory = action.payload;
      })
      // Search
      .addCase(searchCustomersByPhone.fulfilled, (state, action) => {
        if (Array.isArray(action.payload)) {
          state.items = action.payload;
        }
      })
      .addCase(searchCustomersByName.fulfilled, (state, action) => {
        if (Array.isArray(action.payload)) {
          state.items = action.payload;
        }
      })
      // Create
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.total += 1;
      })
      // Update
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const index = state.items.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        if (state.selectedCustomer?._id === action.payload._id) {
          state.selectedCustomer = action.payload;
        }
        if (state.customerHistory?.customer?._id === action.payload._id) {
          state.customerHistory.customer = action.payload;
        }
      })
      // Delete
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c._id !== action.payload.id);
        state.total = Math.max(0, state.total - 1);
        if (state.selectedCustomer?._id === action.payload.id) {
          state.selectedCustomer = null;
        }
      })
      .addCase(createVehicle.fulfilled, (state, action) => {
        const history = state.customerHistory;
        if (history?.customer && action.payload.customerId === history.customer._id) {
          history.vehicles = [...(history.vehicles || []), action.payload];
        }
        if (action.payload.customerId === state.vehiclesCustomerId) {
          state.customerVehicles = [...state.customerVehicles, action.payload];
        }
      })
      .addCase(fetchCustomerVehicles.pending, (state, action) => {
        state.vehiclesCustomerId = action.meta.arg;
        state.customerVehicles = [];
      })
      .addCase(fetchCustomerVehicles.fulfilled, (state, action) => {
        state.vehiclesCustomerId = action.payload.customerId;
        state.customerVehicles = Array.isArray(action.payload.vehicles) ? action.payload.vehicles : [];
      })
      .addCase(createNote.fulfilled, (state, action) => {
        const history = state.customerHistory;
        if (history?.customer && action.payload.customerId === history.customer._id) {
          history.notes = [action.payload, ...(history.notes || [])];
        }
      });
  }
});

export default customerSlice.reducer;
