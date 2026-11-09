import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, ShieldCheck, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    orderId: '',
    subject: 'General Inquiry',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please complete all required fields.');
      return;
    }
    setSubmitted(true);
    toast.success('Thank you! Your inquiry has been received. Our support team will reply within 24 hours.');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900">Contact Us</h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Have a question about your order, delivery, or refund? We are here to help you 7 days a week.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Information & Channels */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Get in Touch</h2>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Phone Support</p>
                  <p className="text-gray-600 text-xs mt-0.5">+91 98765 43210</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">[PLACEHOLDER: REPLACE WITH YOUR OFFICIAL PHONE NUMBER]</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Email Support</p>
                  <p className="text-gray-600 text-xs mt-0.5">support@flinkitstore.com</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">[PLACEHOLDER: REPLACE WITH YOUR OFFICIAL SUPPORT EMAIL]</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Operating Hours</p>
                  <p className="text-gray-600 text-xs mt-0.5">Monday to Sunday: 7:00 AM – 11:00 PM IST</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Orders delivered within 10-15 mins during operational hours</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Registered Office Address</p>
                  <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">
                    [YOUR REGISTERED BUSINESS NAME / LEGAL ENTITY NAME]<br />
                    123 Green Valley, Sector 5, New Delhi — 110001, India<br />
                    <span className="text-[11px] text-gray-400">[PLACEHOLDER: REPLACE WITH YOUR COMPLETE REGISTERED OFFICE ADDRESS]</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grievance Officer Box (Mandatory under Indian E-Commerce Rules) */}
          <div className="bg-amber-50/70 rounded-3xl p-6 border border-amber-200/80 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              Grievance Redressal Officer
            </div>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              In accordance with the Information Technology Act, 2000 and Consumer Protection (E-Commerce) Rules, 2020:
            </p>
            <div className="text-xs text-amber-950 space-y-1">
              <p><span className="font-semibold">Officer Name:</span> [NAME OF GRIEVANCE OFFICER]</p>
              <p><span className="font-semibold">Designation:</span> Head of Customer Grievance & Compliance</p>
              <p><span className="font-semibold">Email:</span> grievance@flinkitstore.com</p>
              <p><span className="font-semibold">Response Time:</span> Acknowledged within 48 hours; resolved within 30 days.</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Send Us a Message</h2>

          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Message Received!</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Thank you for contacting Flinkit Store support. Ticket reference #FLK-{Date.now().toString().slice(-6)} has been created and our team will get back to you shortly.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setFormData({ name: '', email: '', phone: '', orderId: '', subject: 'General Inquiry', message: '' });
                }}
                className="btn-outline text-xs px-4 py-2"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="input-field text-sm py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. ramesh@example.com"
                    className="input-field text-sm py-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="input-field text-sm py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Order Reference ID (If applicable)</label>
                  <input
                    type="text"
                    value={formData.orderId}
                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                    placeholder="e.g. 6af0cf29..."
                    className="input-field text-sm py-2.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Inquiry Subject *</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="input-field text-sm py-2.5 bg-white"
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Order Status / Delay">Order Status / Delivery Query</option>
                  <option value="Refund & Cancellation">Refund & Cancellation Request</option>
                  <option value="Product Quality / Missing Item">Product Quality / Damaged Item</option>
                  <option value="Payment / Razorpay Transaction">Payment / Razorpay Transaction Query</option>
                  <option value="Feedback & Suggestions">Feedback & Suggestions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Your Message *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Please describe how we can assist you..."
                  className="input-field text-sm py-2.5 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">All inquiries are responded to within 24 hours.</p>
                <button type="submit" className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2">
                  <Send className="w-4 h-4" /> Send Inquiry
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contact;

