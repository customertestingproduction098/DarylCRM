import React from 'react';

export default function StatusBadge({ status }) {
  const styles = {
    scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
    in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    overdue: 'bg-red-100 text-red-800 border-red-200',
    Accepted: 'bg-green-100 text-green-800 border-green-200',
    Sent: 'bg-blue-100 text-blue-800 border-blue-200',
    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
    accepted: 'bg-green-100 text-green-800 border-green-200',
    sent: 'bg-blue-100 text-blue-800 border-blue-200',
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    rejected: 'bg-rose-100 text-rose-800 border-rose-200',
    expired: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  const label = status ? status.replace('_', ' ').toUpperCase() : 'UNKNOWN';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {label}
    </span>
  );
}
