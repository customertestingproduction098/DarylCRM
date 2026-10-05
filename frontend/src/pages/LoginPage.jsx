import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Shield, Lock, Mail } from 'lucide-react';
import Button from '../components/Common/Button';
import Input from '../components/Common/Input';
import { loginUser, offlineLogin } from '../store/slices/authSlice';

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(loginUser({ email, password })).unwrap();
      navigate('/customers');
    } catch (err) {
      if (err?.offline) {
        // Backend unreachable: open the CRM in local mode
        dispatch(offlineLogin());
        navigate('/customers');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center mb-3 shadow-md">
            <Shield className="w-7 h-7 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Daryl's Glass Repair</h2>
          <p className="text-xs text-slate-500">Customer & Job Records</p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@darlsglass.com"
            icon={Mail}
            required
          />
          <Input
            label="Password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            icon={Lock}
            required
          />

          <Button type="submit" variant="primary" className="w-full py-2.5" isLoading={isLoading}>
            Log In
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          Authorized staff only.
        </div>
      </div>
    </div>
  );
}
