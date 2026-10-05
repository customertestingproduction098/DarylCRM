import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut } from 'lucide-react';
import { logout } from '../../store/slices/authSlice';

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-900 text-white rounded-lg flex items-center justify-center font-bold">
          <Shield className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">Daryl's Glass Repair</h1>
          <p className="text-[11px] text-slate-500 font-medium">Customer & Job Records</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:block text-right">
          <p className="text-xs font-semibold text-slate-800">
            {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Staff'}
          </p>
          <p className="text-[10px] text-slate-500">Signed in</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Log out
        </button>
      </div>
    </header>
  );
}
