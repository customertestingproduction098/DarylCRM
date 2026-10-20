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
      if (!error.response) {
        return rejectWithValue({
          message: 'Cannot reach the server. Make sure the backend is running (cd backend && npm run dev).'
        });
      }
      return rejectWithValue({
        message: error.response?.data?.error || 'Login failed'
      });
    }
  }
);

const storedToken = localStorage.getItem('token') || null;
// Older builds stored a fake offline session token - discard it
const validToken = storedToken && storedToken !== 'local-session' ? storedToken : null;
if (storedToken === 'local-session') {
  localStorage.removeItem('token');
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: validToken,
    isLoading: false,
    error: null,
    isAuthenticated: Boolean(validToken)
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
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

export const { logout } = authSlice.actions;
export default authSlice.reducer;
