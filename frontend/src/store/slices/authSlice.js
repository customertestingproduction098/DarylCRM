import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      localStorage.setItem('token', response.data.token);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.error || 'Login failed',
        offline: !error.response
      });
    }
  }
);

const storedToken = localStorage.getItem('token') || null;

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: storedToken,
    isLoading: false,
    error: null,
    isAuthenticated: Boolean(storedToken)
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    // Allows opening the CRM when the backend is unreachable (local/demo use)
    offlineLogin: (state) => {
      localStorage.setItem('token', 'local-session');
      state.token = 'local-session';
      state.user = { firstName: 'Staff', lastName: '' };
      state.isAuthenticated = true;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || action.payload;
      });
  }
});

export const { logout, offlineLogin } = authSlice.actions;
export default authSlice.reducer;
