import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MainLayout from './components/Layout/MainLayout';
import LoginPage from './pages/LoginPage';
import CustomersPage from './pages/CustomersPage';
import CustomerProfilePage from './pages/CustomerProfilePage';
import JobsPage from './pages/JobsPage';
import JobDetailsPage from './pages/JobDetailsPage';
import QuotesPage from './pages/QuotesPage';
import InvoicesPage from './pages/InvoicesPage';

export default function App() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/customers" replace /> : <LoginPage />}
        />

        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/customers" replace />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/customers/:customerId" element={<CustomerProfilePage />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
                  <Route path="/quotes" element={<QuotesPage />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                  <Route path="*" element={<Navigate to="/customers" replace />} />
                </Routes>
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
