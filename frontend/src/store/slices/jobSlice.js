import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/jobs', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const fetchJobById = createAsyncThunk(
  'jobs/fetchJobById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/jobs/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const createJob = createAsyncThunk(
  'jobs/createJob',
  async (jobData, { rejectWithValue }) => {
    try {
      const response = await api.post('/jobs', jobData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const updateJobStatus = createAsyncThunk(
  'jobs/updateJobStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/jobs/${id}/status`, { status });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const uploadJobMedia = createAsyncThunk(
  'jobs/uploadJobMedia',
  async ({ id, file, slot }, { rejectWithValue }) => {
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('slot', slot);
      const response = await api.post(`/jobs/${id}/media`, form, {
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

const jobSlice = createSlice({
  name: 'jobs',
  initialState: {
    items: [],
    selectedJob: null,
    total: 0,
    page: 1,
    pages: 1,
    isLoading: false,
    error: null
  },
  reducers: {
    addJobLocal: (state, action) => {
      state.items.unshift(action.payload);
      state.total += 1;
    },
    updateJobStatusLocal: (state, action) => {
      const { id, status } = action.payload;
      const job = state.items.find(j => j._id === id || j.jobId === id);
      if (job) {
        job.status = status;
        job.jobStatus = status;
      }
      if (state.selectedJob && (state.selectedJob._id === id || state.selectedJob.jobId === id)) {
        state.selectedJob.status = status;
        state.selectedJob.jobStatus = status;
      }
    },
    setJobMediaLocal: (state, action) => {
      const { id, slot, url } = action.payload;
      const targets = [];
      const inList = state.items.find(j => j._id === id);
      if (inList) targets.push(inList);
      if (state.selectedJob && state.selectedJob._id === id) targets.push(state.selectedJob);

      targets.forEach((job) => {
        job.media = job.media || {};
        job.media[`${slot}Video`] = { url, uploadedAt: new Date().toISOString() };
      });
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.data && action.payload.data.length > 0) {
          state.items = action.payload.data;
          state.total = action.payload.total;
          state.page = action.payload.page;
          state.pages = action.payload.pages;
        }
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.selectedJob = action.payload;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(updateJobStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex(j => j._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedJob && state.selectedJob._id === action.payload._id) {
          state.selectedJob = action.payload;
        }
      })
      .addCase(uploadJobMedia.fulfilled, (state, action) => {
        const index = state.items.findIndex(j => j._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedJob && state.selectedJob._id === action.payload._id) {
          state.selectedJob = action.payload;
        }
      });
  }
});

export const { addJobLocal, updateJobStatusLocal, setJobMediaLocal } = jobSlice.actions;
export default jobSlice.reducer;
