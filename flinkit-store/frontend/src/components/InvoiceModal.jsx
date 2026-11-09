import { Printer, X, ShieldCheck, CheckCircle2 } from 'lucide-react';

const InvoiceModal = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  const invoiceNo = `INV-${order._id ? order._id.slice(-8).toUpperCase() : '000000'}`;
  const invoiceDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 my-8 border border-gray-100 print:m-0 print:p-4 print:shadow-none print:w-full print:max-w-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full">
              Tax Invoice
            </span>
            <span className="text-xs text-gray-500 font-mono font-semibold">{invoiceNo}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1.5 font-bold"
              id="print-invoice-btn"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="space-y-6 pt-4 text-gray-800 text-xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-1.5 text-xl font-black text-gray-900 mb-1">
                flinkit<span className="text-primary-600">.</span>
              </div>
              <p className="font-bold text-gray-900 text-sm">[YOUR REGISTERED BUSINESS NAME / LEGAL ENTITY NAME]</p>
              <p className="text-gray-500 mt-0.5">123 Green Valley, Sector 5, New Delhi — 110001, India</p>
              <p className="text-gray-500">GSTIN: [YOUR 15-DIGIT GSTIN NUMBER] • CIN: [CIN / LLPIN]</p>
              <p className="text-gray-500">Email: support@flinkitstore.com • Phone: +91 98765 43210</p>
            </div>

            <div className="sm:text-right space-y-1">
              <p className="text-sm font-black text-primary-700 uppercase tracking-wide">RETAIL TAX INVOICE</p>
              <p><span className="font-semibold">Invoice No:</span> {invoiceNo}</p>
              <p><span className="font-semibold">Invoice Date:</span> {invoiceDate}</p>
              <p><span className="font-semibold">Order ID:</span> <span className="font-mono">{order._id}</span></p>
              <p>
                <span className="font-semibold">Payment Mode:</span>{' '}
                <span className="uppercase font-bold text-gray-900">
                  {order.paymentMethod === 'online' ? 'Online (Razorpay)' : 'Cash on Delivery'}
                </span>
              </p>
              {order.razorpayPaymentId && (
                <p>
                  <span className="font-semibold">Razorpay Payment ID:</span>{' '}
                  <span className="font-mono text-gray-700">{order.razorpayPaymentId}</span>
                </p>
              )}
            </div>
          </div>

          {/* Customer / Delivery Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div>
              <p className="font-bold text-gray-900 uppercase text-[11px] mb-1">Billed To &amp; Delivered To:</p>
              <p className="font-semibold text-gray-800">{order.deliveryAddress?.fullName || 'Customer'}</p>
              <p className="text-gray-600">Phone: {order.deliveryAddress?.phone || 'N/A'}</p>
              <p className="text-gray-600">
                {order.deliveryAddress?.houseNumber}, {order.deliveryAddress?.street}
                {order.deliveryAddress?.landmark ? `, ${order.deliveryAddress?.landmark}` : ''}
              </p>
              <p className="text-gray-600">
                {order.deliveryAddress?.city}, {order.deliveryAddress?.state} — {order.deliveryAddress?.pinCode}
              </p>
            </div>

            <div className="sm:text-right space-y-1">
              <p className="font-bold text-gray-900 uppercase text-[11px] mb-1">Payment Status:</p>
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded-full font-bold uppercase text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {order.paymentStatus === 'paid' ? 'Paid via Razorpay' : 'Pending (Cash on Delivery)'}
              </div>
              <p className="text-[11px] text-gray-500 pt-1">
                Fulfillment: <span className="capitalize font-semibold text-gray-800">{order.fulfillmentStatus?.replace(/_/g, ' ')}</span>
              </p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-2.5 border-b">#</th>
                  <th className="p-2.5 border-b">Item Description</th>
                  <th className="p-2.5 border-b">Unit</th>
                  <th className="p-2.5 border-b text-center">Qty</th>
                  <th className="p-2.5 border-b text-right">Price (₹)</th>
                  <th className="p-2.5 border-b text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 text-xs">
                {order.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="p-2.5 text-gray-400">{idx + 1}</td>
                    <td className="p-2.5 font-medium text-gray-900">{item.name}</td>
                    <td className="p-2.5 text-gray-500">{item.unit || '-'}</td>
                    <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                    <td className="p-2.5 text-right font-mono">₹{item.sellingPrice}</td>
                    <td className="p-2.5 text-right font-mono font-bold">₹{item.sellingPrice * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculation */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-64 space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-mono font-semibold text-gray-800">₹{order.subtotal || order.totalAmount - (order.deliveryFee || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge:</span>
                <span className="font-mono font-semibold text-gray-800">
                  {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee || 0}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-200 pt-2 border-dashed">
                <span>Grand Total:</span>
                <span className="font-mono text-primary-700 text-base">₹{order.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Footer Legal Declaration */}
          <div className="pt-4 border-t border-gray-200 text-[10px] text-gray-400 space-y-1 text-center">
            <p>This is a computer-generated invoice and does not require a physical signature.</p>
            <p>All grocery &amp; food prices are inclusive of applicable taxes under the Goods and Services Tax (GST) Act.</p>
            <p>Thank you for choosing Flinkit Store for your daily groceries!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;

