import React from 'react';

// Renders an invoice's stored data as a printable "digital copy" so it can be
// viewed/printed without anyone having to scan and upload a paper document.
export default function InvoiceDocument({ invoice }) {
  if (!invoice) return null;

  const customer = invoice.customerId && typeof invoice.customerId === 'object'
    ? invoice.customerId
    : null;

  const customerName = customer
    ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
    : (invoice.customerName || 'Customer');

  const amount = Number(invoice.totalAmount || invoice.amount || 0);
  const paid = Number(invoice.amountPaid || invoice.paid || 0);
  const balance = amount - paid;
  const status = invoice.paymentStatus || invoice.status || 'pending';
  const date = String(invoice.invoiceDate || invoice.date || '').split('T')[0] || '—';

  const items = Array.isArray(invoice.lineItems) && invoice.lineItems.length
    ? invoice.lineItems
    : [{ description: 'Glass work', quantity: 1, unitPrice: amount }];

  const money = (n) => `$${Number(n || 0).toFixed(2)}`;

  return (
    <div id="invoice-print-area" className="bg-white text-slate-900 p-6">
      <div className="flex items-start justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Daryl's Glass Repair</h2>
          <p className="text-xs text-slate-500">Windshield &amp; Auto Glass Replacement Service</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Invoice</p>
          <p className="text-sm font-bold text-blue-900">{invoice.invoiceId || invoice._id}</p>
          <p className="text-xs text-slate-500">{date}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Billed To</p>
          <p className="text-sm font-semibold text-slate-800">{customerName}</p>
          {customer?.phoneNumber && <p className="text-xs text-slate-500">{customer.phoneNumber}</p>}
          {customer?.address && <p className="text-xs text-slate-500">{customer.address}</p>}
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</p>
          <p className="text-sm font-semibold capitalize text-slate-800">{status}</p>
          <p className="text-xs text-slate-500">Balance due: {money(balance)}</p>
        </div>
      </div>

      <table className="w-full text-xs my-4">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="text-left py-2 font-semibold">Description</th>
            <th className="text-right py-2 font-semibold">Qty</th>
            <th className="text-right py-2 font-semibold">Unit Price</th>
            <th className="text-right py-2 font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const qty = Number(it.quantity ?? 1);
            const price = Number(it.unitPrice ?? 0);
            return (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 text-slate-800">{it.description || 'Glass work'}</td>
                <td className="py-2 text-right text-slate-600">{qty}</td>
                <td className="py-2 text-right text-slate-600">{money(price)}</td>
                <td className="py-2 text-right font-semibold text-slate-800">{money(qty * price)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-48 space-y-1 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Total</span>
            <span className="font-semibold text-slate-800">{money(amount)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Paid</span>
            <span className="font-semibold text-slate-800">{money(paid)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 text-sm">
            <span className="font-bold text-slate-900">Balance Due</span>
            <span className="font-bold text-blue-900">{money(balance)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <p className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3">{invoice.notes}</p>
      )}

      <p className="mt-6 text-[11px] text-slate-400 text-center">
        Thank you for your business. This is a system-generated copy of the invoice.
      </p>
    </div>
  );
}
