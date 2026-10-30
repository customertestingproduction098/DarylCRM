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

export const updateJob = createAsyncThunk(
  'jobs/updateJob',
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/jobs/${id}`, changes);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const deleteJob = createAsyncThunk(
  'jobs/deleteJob',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/jobs/${id}`);
      return { id };
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
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const addJobNote = createAsyncThunk(
  'jobs/addJobNote',
  async ({ id, content, file }, { rejectWithValue }) => {
    try {
      const form = new FormData();
      if (content) form.append('content', content);
      if (file) form.append('attachment', file);
      const response = await api.post(`/jobs/${id}/notes`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

const applyJobUpdate = (state, job) => {
  const index = state.items.findIndex((j) => j._id === job._id);
  if (index !== -1) state.items[index] = job;
  if (state.selectedJob && state.selectedJob._id === job._id) {
    state.selectedJob = job;
  }
};

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
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload?.data || [];
        state.total = action.payload?.total || 0;
        state.page = action.payload?.page || 1;
        state.pages = action.payload?.pages || 1;
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
      .addCase(updateJob.fulfilled, (state, action) => {
        applyJobUpdate(state, action.payload);
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.items = state.items.filter((j) => j._id !== action.payload.id);
        state.total = Math.max(0, state.total - 1);
        if (state.selectedJob?._id === action.payload.id) {
          state.selectedJob = null;
        }
      })
      .addCase(updateJobStatus.fulfilled, (state, action) => {
        applyJobUpdate(state, action.payload);
      })
      .addCase(uploadJobMedia.fulfilled, (state, action) => {
        applyJobUpdate(state, action.payload);
      })
      .addCase(addJobNote.fulfilled, (state, action) => {
        applyJobUpdate(state, action.payload);
      });
  }
});

export default jobSlice.reducer;
