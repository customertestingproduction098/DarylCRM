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

const customerSlice = createSlice({
  name: 'customers',
  initialState: {
    items: [],
    selectedCustomer: null,
    customerHistory: null,
    total: 0,
    page: 1,
    pages: 1,
    isLoading: false,
    error: null
  },
  reducers: {
    addCustomerLocal: (state, action) => {
      state.items.unshift(action.payload);
      state.total += 1;
    },
    // Adds an item to the loaded customer history without a refetch
    appendHistoryItem: (state, action) => {
      const { key, item } = action.payload;
      if (state.customerHistory && Array.isArray(state.customerHistory[key])) {
        state.customerHistory[key].unshift(item);
      }
    },
    addVehicleLocal: (state, action) => {
      if (state.customerHistory && Array.isArray(state.customerHistory.vehicles)) {
        state.customerHistory.vehicles.push(action.payload);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchCustomers
      .addCase(fetchCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.data && action.payload.data.length > 0) {
          state.items = action.payload.data;
          state.total = action.payload.total;
          state.page = action.payload.page;
          state.pages = action.payload.pages;
        }
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
      .addCase(createVehicle.fulfilled, (state, action) => {
        const history = state.customerHistory;
        if (history?.customer && action.payload.customerId === history.customer._id) {
          history.vehicles = [...(history.vehicles || []), action.payload];
        }
      })
      .addCase(createNote.fulfilled, (state, action) => {
        const history = state.customerHistory;
        if (history?.customer && action.payload.customerId === history.customer._id) {
          history.notes = [action.payload, ...(history.notes || [])];
        }
      });
  }
});

export const { addCustomerLocal, appendHistoryItem, addVehicleLocal } = customerSlice.actions;
export default customerSlice.reducer;
