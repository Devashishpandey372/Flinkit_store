import { ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react';

const PrivacyPolicy = () => {
  const lastUpdated = 'November 9, 2026';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Header */}
      <div className="border-b border-gray-100 pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 rounded-full text-xs font-bold text-primary-700">
          <ShieldCheck className="w-3.5 h-3.5 text-primary-600" /> Legal Compliance
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900">Privacy Policy</h1>
        <p className="text-xs text-gray-500">Last updated: {lastUpdated} • Effective Date: January 1, 2026</p>
      </div>

      {/* Main Content */}
      <div className="prose prose-sm sm:prose max-w-none text-gray-600 space-y-8 leading-relaxed">
        {/* Intro */}
        <section className="space-y-3">
          <p>
            Welcome to <strong>Flinkit Store</strong> (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;), operated by <strong>[YOUR REGISTERED BUSINESS NAME / LEGAL ENTITY NAME]</strong> (&ldquo;Company&rdquo;). We are committed to protecting your privacy and ensuring your personal information is handled in a safe and responsible manner.
          </p>
          <p>
            This Privacy Policy describes how we collect, use, disclose, and safeguard your personal information when you visit or use our website (the &ldquo;Service&rdquo;). By accessing or using the Service, you agree to the collection and use of information in accordance with this policy and Indian Information Technology laws, including the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.
          </p>
        </section>

        {/* 1. Information We Collect */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            1. Information We Collect
          </h2>
          <p>We collect several types of information from and about users of our Service, including:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              <strong>Personal Identification Information:</strong> Name, email address, mobile phone number, delivery address (including house number, street, city, state, and pin code).
            </li>
            <li>
              <strong>Account Credentials:</strong> Password hashes stored using industry-standard bcrypt encryption. We never store raw passwords.
            </li>
            <li>
              <strong>Order & Transaction Information:</strong> Products purchased, quantities, order reference numbers, billing details, and timestamps.
            </li>
            <li>
              <strong>Payment Data (Payment Gateway Protected):</strong> Online payments are processed through <strong>Razorpay Software Private Limited</strong>. All payment transactions (credit/debit cards, UPI, net banking, wallets) are processed via Razorpay&apos;s PCI-DSS Level 1 certified environment. <strong>Flinkit Store does NOT store, capture, or have access to your credit/debit card numbers, CVVs, or UPI PINs.</strong>
            </li>
            <li>
              <strong>Technical & Usage Data:</strong> IP address, browser type, device identifiers, operating system, and session logs for analytics and fraud prevention.
            </li>
          </ul>
        </section>

        {/* 2. How We Use Your Information */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            2. How We Use Your Information
          </h2>
          <p>We use the collected information for specific, lawful purposes including:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>Processing, packing, and delivering your grocery orders within our 10-15 minute commitment.</li>
            <li>Sending order confirmations, digital invoices, and delivery status updates via SMS/email.</li>
            <li>Facilitating secure payments, processing eligible cancellations, and executing refunds through Razorpay.</li>
            <li>Responding to customer support inquiries and resolving grievances.</li>
            <li>Preventing fraudulent orders and maintaining the security of our platform.</li>
            <li>Complying with statutory, tax (GST), and regulatory requirements under Indian law.</li>
          </ul>
        </section>

        {/* 3. Sharing & Disclosure */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            3. Sharing & Disclosure of Information
          </h2>
          <p>
            We do not sell, rent, or trade your personal information to third parties. We disclose your information only to trusted service partners under strict confidentiality agreements:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              <strong>Payment Processors:</strong> Razorpay Software Private Limited, to verify and process online payments and process refunds securely.
            </li>
            <li>
              <strong>Delivery & Fulfillment Partners:</strong> Our dedicated delivery riders and micro-warehouse staff solely to fulfill and deliver your orders.
            </li>
            <li>
              <strong>Legal & Regulatory Authorities:</strong> When required by applicable law, court order, or governmental regulation to protect the rights, property, or safety of our customers.
            </li>
          </ul>
        </section>

        {/* 4. Data Security */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            4. Data Security & Storage
          </h2>
          <p>
            We implement robust administrative, technical, and physical safeguards to protect your personal information against unauthorized access, destruction, loss, alteration, or disclosure:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>All data transmissions across the website are encrypted using industry-standard Transport Layer Security (TLS 1.2 / TLS 1.3 / SSL).</li>
            <li>Databases are hosted in enterprise-grade cloud environments with encrypted storage at rest.</li>
            <li>Payment flows are isolated and governed by PCI-DSS certified gateway infrastructure.</li>
          </ul>
        </section>

        {/* 5. Cookies */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            5. Cookies & Session Storage
          </h2>
          <p>
            We use secure cookies and local storage tokens solely to maintain your authentication session, preserve your shopping cart items, and optimize website functionality. You may choose to disable cookies in your browser settings, though doing so may prevent you from placing orders.
          </p>
        </section>

        {/* 6. User Rights */}
        <section className="space-y-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            6. Your Privacy Rights
          </h2>
          <p>
            You have the right to access, update, correct, or request deletion of your account and personal details at any time by logging into your profile or contacting our support team at <span className="font-semibold text-primary-600">support@flinkitstore.com</span>.
          </p>
        </section>

        {/* 7. Contact Details */}
        <section className="bg-gray-50 p-6 rounded-3xl border border-gray-200/80 space-y-3">
          <h2 className="text-lg font-bold text-gray-900">7. Contact for Privacy Matters</h2>
          <p className="text-xs text-gray-600">
            For questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out to our designated compliance officer:
          </p>
          <div className="text-xs text-gray-700 space-y-1 pt-1">
            <p><strong>Legal Entity:</strong> [YOUR REGISTERED BUSINESS NAME / LEGAL ENTITY NAME]</p>
            <p><strong>Address:</strong> [YOUR REGISTERED BUSINESS ADDRESS, New Delhi, India]</p>
            <p><strong>Privacy Email:</strong> privacy@flinkitstore.com / support@flinkitstore.com</p>
            <p><strong>Support Helpline:</strong> +91 98765 43210</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

