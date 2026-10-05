import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Wrench, FileText, CreditCard } from 'lucide-react';

const navItems = [
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Jobs', path: '/jobs', icon: Wrench },
  { label: 'Quotes', path: '/quotes', icon: FileText },
  { label: 'Invoices', path: '/invoices', icon: CreditCard }
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col border-r border-slate-800">
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-800 text-white font-semibold'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
        Daryl's Glass Repair CRM
      </div>
    </aside>
  );
}
