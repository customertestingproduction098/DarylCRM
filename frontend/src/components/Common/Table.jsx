import React from 'react';

export default function Table({ columns = [], data = [], renderRow }) {
  return (
    <div className="w-full overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-4 py-3">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length > 0 ? (
            data.map((item, idx) => renderRow(item, idx))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
