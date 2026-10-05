import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/invoices', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const createInvoice = createAsyncThunk(
  'invoices/createInvoice',
  async (invoiceData, { rejectWithValue }) => {
    try {
      const response = await api.post('/invoices', invoiceData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const recordPayment = createAsyncThunk(
  'invoices/recordPayment',
  async ({ id, paymentData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/invoices/${id}/payment`, paymentData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const updateInvoice = createAsyncThunk(
  'invoices/updateInvoice',
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/invoices/${id}`, changes);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const uploadInvoiceCopy = createAsyncThunk(
  'invoices/uploadInvoiceCopy',
  async ({ id, file }, { rejectWithValue }) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await api.post(`/invoices/${id}/copy`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.error || error.message,
        offline: !error.response
      });
    }
  }
);

const invoiceSlice = createSlice({
  name: 'invoices',
  initialState: {
    items: [],
    total: 0,
    isLoading: false,
    error: null
  },
  reducers: {
    addInvoiceLocal: (state, action) => {
      state.items.unshift(action.payload);
      state.total += 1;
    },
    updateInvoiceLocal: (state, action) => {
      const { id, changes } = action.payload;
      const invoice = state.items.find(i => i._id === id);
      if (invoice) Object.assign(invoice, changes);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.data && action.payload.data.length > 0) {
          state.items = action.payload.data;
          state.total = action.payload.total;
        }
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(recordPayment.fulfilled, (state, action) => {
        const index = state.items.findIndex(i => i._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        const index = state.items.findIndex(i => i._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(uploadInvoiceCopy.fulfilled, (state, action) => {
        const index = state.items.findIndex(i => i._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });
  }
});

export const { addInvoiceLocal, updateInvoiceLocal } = invoiceSlice.actions;
export default invoiceSlice.reducer;
