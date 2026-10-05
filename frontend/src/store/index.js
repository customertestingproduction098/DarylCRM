import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import customerReducer from './slices/customerSlice';
import jobReducer from './slices/jobSlice';
import quoteReducer from './slices/quoteSlice';
import invoiceReducer from './slices/invoiceSlice';
import communicationReducer from './slices/communicationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    customers: customerReducer,
    jobs: jobReducer,
    quotes: quoteReducer,
    invoices: invoiceReducer,
    communications: communicationReducer
  }
});

export default store;
