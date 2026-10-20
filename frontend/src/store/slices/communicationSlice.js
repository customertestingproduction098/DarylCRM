import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchCommunications = createAsyncThunk(
  'communications/fetchCommunications',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/communications', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const createCommunication = createAsyncThunk(
  'communications/createCommunication',
  async (commData, { rejectWithValue }) => {
    try {
      const response = await api.post('/communications', commData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const updateCommunication = createAsyncThunk(
  'communications/updateCommunication',
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/communications/${id}`, changes);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const deleteCommunication = createAsyncThunk(
  'communications/deleteCommunication',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/communications/${id}`);
      return { id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

const communicationSlice = createSlice({
  name: 'communications',
  initialState: {
    items: [],
    isLoading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommunications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCommunications.fulfilled, (state, action) => {
        state.isLoading = false;
        if (Array.isArray(action.payload)) {
          state.items = action.payload;
        } else if (Array.isArray(action.payload?.data)) {
          state.items = action.payload.data;
        }
      })
      .addCase(fetchCommunications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createCommunication.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateCommunication.fulfilled, (state, action) => {
        const index = state.items.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(deleteCommunication.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c._id !== action.payload.id);
      });
  }
});

export default communicationSlice.reducer;
