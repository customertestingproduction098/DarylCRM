import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

export default function RowActions({ onEdit, onDelete, disabled = false }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          title="Edit"
          className="p-1.5 rounded-md text-slate-500 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          title="Delete"
          className="p-1.5 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
