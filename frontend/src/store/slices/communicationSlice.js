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

const communicationSlice = createSlice({
  name: 'communications',
  initialState: {
    items: [],
    isLoading: false,
    error: null
  },
  reducers: {
    addCommunicationLocal: (state, action) => {
      state.items.unshift(action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommunications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCommunications.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload && action.payload.length > 0) {
          state.items = action.payload;
        }
      })
      .addCase(fetchCommunications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createCommunication.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  }
});

export const { addCommunicationLocal } = communicationSlice.actions;
export default communicationSlice.reducer;
