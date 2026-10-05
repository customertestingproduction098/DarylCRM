import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchQuotes = createAsyncThunk(
  'quotes/fetchQuotes',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/quotes', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const createQuote = createAsyncThunk(
  'quotes/createQuote',
  async (quoteData, { rejectWithValue }) => {
    try {
      const response = await api.post('/quotes', quoteData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

const quoteSlice = createSlice({
  name: 'quotes',
  initialState: {
    items: [],
    total: 0,
    isLoading: false,
    error: null
  },
  reducers: {
    addQuoteLocal: (state, action) => {
      state.items.unshift(action.payload);
      state.total += 1;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuotes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuotes.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.data && action.payload.data.length > 0) {
          state.items = action.payload.data;
          state.total = action.payload.total;
        }
      })
      .addCase(fetchQuotes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createQuote.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.total += 1;
      });
  }
});

export const { addQuoteLocal } = quoteSlice.actions;
export default quoteSlice.reducer;
