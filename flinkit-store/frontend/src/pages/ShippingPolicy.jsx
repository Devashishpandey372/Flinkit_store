import { Truck, Clock, MapPin, CheckCircle2, ShieldCheck, IndianRupee } from 'lucide-react';

const ShippingPolicy = () => {
  const lastUpdated = 'November 9, 2026';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Header */}
      <div className="border-b border-gray-100 pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 rounded-full text-xs font-bold text-primary-700">
          <Truck className="w-3.5 h-3.5 text-primary-600" /> Express Grocery Delivery
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900">Shipping and Delivery Policy</h1>
        <p className="text-xs text-gray-500">Last updated: {lastUpdated} • Effective Date: January 1, 2026</p>
      </div>

      {/* Main Content */}
      <div className="prose prose-sm sm:prose max-w-none text-gray-600 space-y-8 leading-relaxed">
        <section className="space-y-3">
          <p>
            Welcome to the Shipping and Delivery Policy of <strong>Flinkit Store</strong>, operated by <strong>[YOUR REGISTERED BUSINESS NAME / LEGAL ENTITY NAME]</strong> (&ldquo;Company&rdquo;). This policy sets out the shipping terms, delivery timelines, charges, and procedures applicable to all grocery and household orders placed through our website.
          </p>
        </section>

        {/* 1. Delivery Timelines */}
        <section className="space-y-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-600" />
            1. Estimated Delivery Timeframes
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              Flinkit Store operates an advanced hyperlocal fulfillment network designed to deliver fresh groceries within minutes of receiving your order:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-4 bg-primary-50/60 rounded-2xl border border-primary-100 space-y-1">
                <p className="font-bold text-primary-900 text-sm">Instant 10 - 15 Minutes Delivery</p>
                <p className="text-gray-600">
                  Standard delivery window for all orders placed within 3 km of an active Flinkit dark store during operational hours.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <p className="font-bold text-gray-800 text-sm">Peak Hours & Heavy Weather</p>
                <p className="text-gray-600">
                  During peak monsoon downpours or heavy urban traffic, deliveries may take up to 25-30 minutes. Real-time notifications will be provided.
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              <strong>Operating Hours:</strong> Orders are accepted and delivered 7 days a week from <strong>7:00 AM to 11:00 PM IST</strong>. Orders placed outside operational hours will be scheduled for delivery the following morning starting at 7:00 AM.
            </p>
          </div>
        </section>

        {/* 2. Delivery Charges & Thresholds */}
        <section className="space-y-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-primary-600" />
            2. Shipping & Delivery Charges
          </h2>
          <div className="space-y-3 text-sm">
            <p>We maintain an upfront and transparent delivery fee structure:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-gray-100 rounded-xl overflow-hidden">
                <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="p-3 border-b">Cart Subtotal Value</th>
                    <th className="p-3 border-b">Delivery Charge</th>
                    <th className="p-3 border-b">Benefits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-600">
                  <tr>
                    <td className="p-3 font-semibold text-gray-800">Orders ₹499 and Above</td>
                    <td className="p-3 font-bold text-green-600">FREE DELIVERY (₹0)</td>
                    <td className="p-3">Zero shipping fee automatically applied at checkout</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-gray-800">Orders Below ₹499</td>
                    <td className="p-3 font-bold text-gray-900">₹40 Flat Fee</td>
                    <td className="p-3">Covers doorstep micro-logistics and handling</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400">
              * Delivery charges (if applicable) are clearly itemized in the Order Summary prior to payment confirmation. No hidden surcharge is applied.
            </p>
          </div>
        </section>

        {/* 3. Serviceable Areas */}
        <section className="space-y-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            3. Serviceable Pincodes & Geographic Coverage
          </h2>
          <div className="space-y-2 text-sm">
            <p>
              We currently service prime urban zones across Delhi NCR, Mumbai, Bengaluru, Hyderabad, Chennai, Ahmedabad, Pune, and Jaipur. Serviceable pincodes include (but are not limited to):
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-mono font-bold text-gray-700 pt-1">
              {['110001', '110002', '400001', '400002', '500001', '560001', '600001', '700001', '380001', '302001'].map((pin) => (
                <span key={pin} className="px-2.5 py-1 bg-gray-100 rounded-lg border border-gray-200">
                  PIN {pin}
                </span>
              ))}
              <span className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg border border-primary-200 font-sans">
                + Expanding Weekly
              </span>
            </div>
            <p className="text-xs text-gray-500 pt-1">
              You can check delivery availability by selecting your delivery address or pincode during the checkout process.
            </p>
          </div>
        </section>

        {/* 4. Domestic Only Policy */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">4. Domestic Only Shipping (No International Deliveries)</h2>
          <p className="text-sm">
            Flinkit Store operates exclusively within specified local jurisdictions in the <strong>Republic of India</strong>. We do NOT accept orders for international delivery or delivery outside our active dark store network.
          </p>
        </section>

        {/* 5. Order Tracking & Contactless Delivery */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">5. Order Tracking & Doorstep Delivery</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              <strong>Live Tracking:</strong> You can track your order status in real time via the <strong>&ldquo;My Orders&rdquo;</strong> page from packing to dispatch and arrival.
            </li>
            <li>
              <strong>Contactless Delivery:</strong> Customers can instruct our delivery riders to leave packages at their door, guard gate, or specified drop point by noting special instructions in the delivery address form.
            </li>
            <li>
              <strong>Customer Unreachable / Failed Delivery:</strong> If our delivery rider is unable to contact you at the designated delivery address after multiple calls, the order will be returned to the store. For prepaid orders, customer support will reach out to reschedule or issue a refund as per policy.
            </li>
          </ul>
        </section>

        {/* 6. Contact Information */}
        <section className="bg-gray-50 p-6 rounded-3xl border border-gray-200/80 space-y-2 text-xs text-gray-700">
          <h2 className="text-base font-bold text-gray-900">6. Shipping & Delivery Queries</h2>
          <p>If you experience any delay or have questions regarding your delivery, please contact our dispatch desk:</p>
          <div className="pt-1 space-y-0.5">
            <p><strong>Customer Care Email:</strong> support@flinkitstore.com</p>
            <p><strong>Support Helpline:</strong> +91 98765 43210 (7:00 AM – 11:00 PM IST)</p>
            <p><strong>Registered Office:</strong> [YOUR REGISTERED BUSINESS NAME / LEGAL ENTITY NAME], 123 Green Valley, Sector 5, New Delhi — 110001, India</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ShippingPolicy;

