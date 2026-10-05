import React from 'react';

export default function Loading({ text = 'Loading Daryl\'s CRM Data...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-3 text-slate-500">
      <div className="w-8 h-8 border-3 border-blue-800 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}
