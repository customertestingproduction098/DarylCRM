import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  isBusy = false,
  error = '',
  onConfirm,
  onCancel
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={isBusy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isBusy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 shrink-0 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
        </div>
        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
