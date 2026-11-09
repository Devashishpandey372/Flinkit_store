import { FileText, ShieldAlert, CheckCircle2 } from 'lucide-react';

const TermsAndConditions = () => {
  const lastUpdated = 'November 9, 2026';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Header */}
      <div className="border-b border-gray-100 pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 rounded-full text-xs font-bold text-primary-700">
          <FileText className="w-3.5 h-3.5 text-primary-600" /> User Agreement
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900">Terms and Conditions</h1>
        <p className="text-xs text-gray-500">Last updated: {lastUpdated} • Effective Date: January 1, 2026</p>
      </div>

      {/* Main Content */}
      <div className="prose prose-sm sm:prose max-w-none text-gray-600 space-y-8 leading-relaxed">
        <section className="space-y-3">
          <p>
            These Terms and Conditions (&ldquo;Terms&rdquo;) govern your use of the website and online grocery ordering service operated by <strong>[YOUR REGISTERED BUSINESS NAME / LEGAL ENTITY NAME]</strong> (&ldquo;Flinkit Store,&rdquo; &ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), having its registered office at <strong>[YOUR REGISTERED BUSINESS ADDRESS, e.g., 123 Green Valley, Sector 5, New Delhi — 110001, India]</strong>.
          </p>
          <p>
            By accessing our website, creating an account, or placing an order, you agree to be bound by these Terms and our Privacy Policy, Refund Policy, and Shipping Policy. If you do not agree with any part of these Terms, you must refrain from using the Service.
          </p>
        </section>

        {/* 1. Eligibility */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">1. Eligibility & User Account</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>You must be at least 18 years of age or possess legal parental/guardian consent to use this platform.</li>
            <li>You are responsible for maintaining the confidentiality of your login credentials (email and password) and for all activities that occur under your account.</li>
            <li>You agree to provide accurate, current, and complete delivery and contact information during account creation and order checkout.</li>
          </ul>
        </section>

        {/* 2. Product Pricing & Availability */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">2. Products, Pricing & Accuracy</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              <strong>Currency & Taxes:</strong> All product prices displayed on the platform are listed in <strong>Indian Rupees (INR / ₹)</strong> and are inclusive of applicable Goods and Services Tax (GST) unless explicitly stated otherwise.
            </li>
            <li>
              <strong>Price Changes:</strong> We reserve the right to revise prices for products at any time without prior notice. The price charged will be the price displayed at the time of order confirmation.
            </li>
            <li>
              <strong>Fresh Produce Weight Variations:</strong> Natural fruits and vegetables may exhibit slight variations in weight and size upon harvest and packing. While we endeavor to match stated weights closely, minor variances within ±5% are customary.
            </li>
            <li>
              <strong>Stock Availability:</strong> Products are subject to stock availability in your nearest dark store. If an item becomes unavailable after placing an order, we will notify you and promptly refund the amount for the unavailable item.
            </li>
          </ul>
        </section>

        {/* 3. Orders & Payment Terms */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">3. Orders & Payment Terms</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              <strong>Order Confirmation:</strong> An order is confirmed once you receive an on-screen confirmation, order reference number, and confirmation message.
            </li>
            <li>
              <strong>Payment Options:</strong> We support:
              <ul className="list-circle pl-5 mt-1 space-y-1 text-xs">
                <li><strong>Online Payment:</strong> Securely processed via Razorpay (UPI, Credit/Debit Cards, Net Banking, and Mobile Wallets).</li>
                <li><strong>Cash on Delivery (COD):</strong> Payable in exact cash or digital UPI upon doorstep delivery.</li>
              </ul>
            </li>
            <li>
              <strong>Payment Gateway Security:</strong> All card and electronic payment transactions are facilitated by <strong>Razorpay Software Private Limited</strong> using 256-bit SSL encryption and PCI-DSS compliance. We do not store banking credentials.
            </li>
            <li>
              <strong>Failed Transactions:</strong> In case your account is debited but the order fails to generate, the debited amount will be automatically reversed to your source account within 5-7 working days by Razorpay and your issuing bank.
            </li>
          </ul>
        </section>

        {/* 4. Delivery Terms */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">4. Delivery Terms & Delivery Charges</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>Deliveries are typically executed within 10-15 minutes of order placement within active serviceable pincodes during operating hours (7:00 AM – 11:00 PM IST).</li>
            <li>Orders with subtotal equal to or exceeding <strong>₹499</strong> qualify for <strong>FREE Delivery</strong>. Orders below ₹499 incur a nominal delivery fee of <strong>₹40</strong>.</li>
            <li>For full delivery terms, please refer to our <a href="/shipping-policy" className="text-primary-600 underline font-semibold">Shipping and Delivery Policy</a>.</li>
          </ul>
        </section>

        {/* 5. Cancellations & Refunds */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">5. Cancellations, Returns & Refunds</h2>
          <p className="text-sm">
            Customers may cancel orders before they are dispatched through the &ldquo;My Orders&rdquo; dashboard. For damaged, missing, or unsatisfactory items, refunds are processed back to the original payment method within 5-7 business days via Razorpay. Full details are governed by our <a href="/refund-policy" className="text-primary-600 underline font-semibold">Refund and Cancellation Policy</a>.
          </p>
        </section>

        {/* 6. Intellectual Property */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">6. Intellectual Property Rights</h2>
          <p className="text-sm">
            All brand names, trademarks, logos, texts, images, and user interface designs displayed on Flinkit Store are the property of [YOUR REGISTERED BUSINESS NAME / LEGAL ENTITY NAME] or respective brand partners. Unauthorized reproduction or exploitation is prohibited.
          </p>
        </section>

        {/* 7. Limitation of Liability */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">7. Limitation of Liability</h2>
          <p className="text-sm">
            To the maximum extent permitted under applicable Indian law, Flinkit Store shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from the use or inability to use the Service. Our total liability for any claim arising under these Terms shall not exceed the value of the specific order in dispute.
          </p>
        </section>

        {/* 8. Governing Law & Dispute Resolution */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">8. Governing Law & Jurisdiction</h2>
          <p className="text-sm">
            These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts located in <strong>[YOUR REGISTERED CITY / NEW DELHI, INDIA]</strong>.
          </p>
        </section>

        {/* 9. Contact */}
        <section className="bg-gray-50 p-6 rounded-3xl border border-gray-200/80 space-y-2 text-xs text-gray-700">
          <h2 className="text-base font-bold text-gray-900">9. Grievances and Contact Information</h2>
          <p>For questions or grievances regarding these Terms and Conditions, please contact us at:</p>
          <p><strong>Entity Name:</strong> [YOUR REGISTERED BUSINESS NAME / LEGAL ENTITY NAME]</p>
          <p><strong>Address:</strong> [YOUR REGISTERED BUSINESS ADDRESS, New Delhi — 110001, India]</p>
          <p><strong>Email:</strong> support@flinkitstore.com | <strong>Helpline:</strong> +91 98765 43210</p>
        </section>
      </div>
    </div>
  );
};

export default TermsAndConditions;

