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

export const deleteInvoice = createAsyncThunk(
  'invoices/deleteInvoice',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/invoices/${id}`);
      return { id };
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
      return rejectWithValue(error.response?.data?.error || error.message);
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
  reducers: {},
  extraReducers: (builder) => {
    const applyUpdate = (state, invoice) => {
      const index = state.items.findIndex((i) => i._id === invoice._id);
      if (index !== -1) state.items[index] = invoice;
    };

    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload?.data || [];
        state.total = action.payload?.total || 0;
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
        applyUpdate(state, action.payload);
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        applyUpdate(state, action.payload);
      })
      .addCase(deleteInvoice.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i._id !== action.payload.id);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(uploadInvoiceCopy.fulfilled, (state, action) => {
        applyUpdate(state, action.payload);
      });
  }
});

export default invoiceSlice.reducer;
