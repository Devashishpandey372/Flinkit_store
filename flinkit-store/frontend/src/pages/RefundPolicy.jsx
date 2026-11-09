import { RotateCcw, Clock, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

const RefundPolicy = () => {
  const lastUpdated = 'November 9, 2026';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Header */}
      <div className="border-b border-gray-100 pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 rounded-full text-xs font-bold text-primary-700">
          <RotateCcw className="w-3.5 h-3.5 text-primary-600" /> Customer Satisfaction Guarantee
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900">Refund and Cancellation Policy</h1>
        <p className="text-xs text-gray-500">Last updated: {lastUpdated} • Effective Date: January 1, 2026</p>
      </div>

      {/* Main Content */}
      <div className="prose prose-sm sm:prose max-w-none text-gray-600 space-y-8 leading-relaxed">
        <section className="space-y-3">
          <p>
            At <strong>Flinkit Store</strong> (operated by <strong>[YOUR REGISTERED BUSINESS NAME / LEGAL ENTITY NAME]</strong>), our priority is delivering fresh, uncompromised quality groceries within minutes. If you are not satisfied with your purchase or require an order cancellation, this Refund and Cancellation Policy outlines your entitlements and our transparent procedure.
          </p>
        </section>

        {/* 1. Cancellation Policy */}
        <section className="space-y-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            1. Order Cancellation Policy
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              <strong>Cancellation by Customer:</strong> Due to our ultra-fast 10-15 minute fulfillment model, order packing begins immediately upon order placement:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                You may cancel your order free of charge directly via the <strong>&ldquo;My Orders&rdquo;</strong> section on our website while the order status displays <strong>&ldquo;Placed&rdquo;</strong> or <strong>&ldquo;Confirmed&rdquo;</strong>.
              </li>
              <li>
                Once an order transitions to <strong>&ldquo;Out for Delivery&rdquo;</strong> or has been handed over to the delivery rider, it cannot be cancelled online. If you refuse delivery at your doorstep due to quality concerns, our team will review and process a refund accordingly.
              </li>
            </ul>
            <p>
              <strong>Cancellation by Flinkit Store:</strong> In rare circumstances (such as unforeseen stock-outs, unserviceable adverse weather, or technical anomalies), we may need to cancel an order. In all such cases, you will receive an immediate notification, and <strong>100% of the paid amount will be refunded immediately</strong> to your original payment source.
            </p>
          </div>
        </section>

        {/* 2. Return & Replacement Eligibility */}
        <section className="space-y-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            2. Return & Refund Eligibility Criteria
          </h2>
          <p className="text-sm">You are eligible for a replacement or a full refund under the following conditions:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              { title: 'Damaged or Spilled Items', desc: 'Broken packaging, leaked bottles, or crushed goods upon arrival.' },
              { title: 'Expired or Near-Expiry Goods', desc: 'Any product delivered past its best-before or expiration date.' },
              { title: 'Substandard Fresh Produce', desc: 'Stale, spoiled, or rotten fruits, vegetables, or dairy products.' },
              { title: 'Incorrect or Missing Items', desc: 'Item delivered does not match what you ordered, or was omitted from the delivery bag.' },
            ].map((item, idx) => (
              <div key={idx} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <p className="font-bold text-gray-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  {item.title}
                </p>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-700" /> Reporting Timeframe:
            </p>
            <p>
              Please report any issues within <strong>24 to 48 hours</strong> of delivery through our Contact Us page, email (support@flinkitstore.com), or phone helpline. For fresh produce or dairy items, prompt reporting within 24 hours with clear photos expedites instant resolution.
            </p>
          </div>
        </section>

        {/* 3. Refund Process & Timelines */}
        <section className="space-y-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            3. Refund Methods & Settlement Timelines
          </h2>
          <p className="text-sm">
            All refunds are initiated once our customer service team approves the return/cancellation claim:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-gray-100 rounded-xl overflow-hidden">
              <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-[11px]">
                <tr>
                  <th className="p-3 border-b">Payment Method</th>
                  <th className="p-3 border-b">Refund Mode</th>
                  <th className="p-3 border-b">Processing & Reflection Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600">
                <tr>
                  <td className="p-3 font-semibold text-gray-800">Online — UPI (GPay, PhonePe, Paytm)</td>
                  <td className="p-3">Source UPI Bank Account via Razorpay</td>
                  <td className="p-3 font-medium text-primary-700">1 to 2 business days</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-800">Online — Debit / Credit Card</td>
                  <td className="p-3">Source Card via Razorpay</td>
                  <td className="p-3 font-medium text-primary-700">5 to 7 business days (depends on issuing bank)</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-800">Online — Net Banking</td>
                  <td className="p-3">Source Bank Account via Razorpay</td>
                  <td className="p-3 font-medium text-primary-700">3 to 5 business days</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-800">Cash on Delivery (COD)</td>
                  <td className="p-3">Direct Bank Transfer (NEFT/IMPS/UPI)</td>
                  <td className="p-3 font-medium text-primary-700">2 to 3 business days upon details confirmation</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">
            * Note: The turnaround time is governed by Razorpay and standard banking clearing systems. Flinkit Store initiates all approved refunds within 24 hours of approval.
          </p>
        </section>

        {/* 4. Non-Refundable Items */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            4. Non-Refundable / Non-Returnable Scenarios
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>Items returned with unsealed, altered, or tampered original packaging without quality defects.</li>
            <li>Perishable goods reported after 48 hours of delivery or items consumed before inspection.</li>
            <li>Incorrect delivery address provided by the customer resulting in delivery failure after multiple rider attempts.</li>
          </ul>
        </section>

        {/* 5. Contact */}
        <section className="bg-gray-50 p-6 rounded-3xl border border-gray-200/80 space-y-2 text-xs text-gray-700">
          <h2 className="text-base font-bold text-gray-900">5. How to Request a Refund</h2>
          <p>
            To initiate a return or refund request, please provide your <strong>Order ID</strong> and a brief description of the issue (along with photographs if damaged):
          </p>
          <div className="pt-1 space-y-0.5">
            <p><strong>Customer Care Email:</strong> support@flinkitstore.com</p>
            <p><strong>Helpline Number:</strong> +91 98765 43210</p>
            <p><strong>Business Address:</strong> [YOUR REGISTERED BUSINESS NAME / LEGAL ENTITY NAME], 123 Green Valley, Sector 5, New Delhi — 110001, India</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RefundPolicy;

