import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  Key,
  ShieldCheck,
  ArrowRight,
  Zap,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const AdminSignup = () => {
  const navigate = useNavigate();
  const { adminSignup } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    shopName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    shopAddress: '',
    inviteCode: '',
  });

  const [loading, setLoading] = useState(false);
  const [registeredPending, setRegisteredPending] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      toast.error('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await adminSignup({
        name: formData.name,
        shopName: formData.shopName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        shopAddress: formData.shopAddress,
        inviteCode: formData.inviteCode,
      });

      if (res.isApproved) {
        toast.success('Registration successful! Welcome to Flinkit Merchant Portal.');
        navigate('/admin/dashboard');
      } else {
        setRegisteredPending(true);
        toast.success('Registration submitted for administrator review.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please verify your details.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (registeredPending) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-500">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Account Under Review</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Thank you for registering <strong>{formData.shopName}</strong> on Flinkit Store! To protect our customer experience, all new shopkeeper accounts are verified by our team.
          </p>
          <div className="bg-gray-50 rounded-2xl p-4 text-left mb-6 text-xs text-gray-600 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Merchant Name:</span>
              <span className="font-bold text-gray-800">{formData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Email Address:</span>
              <span className="font-bold text-gray-800">{formData.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Verification ETA:</span>
              <span className="font-bold text-emerald-600">Within 24 Hours</span>
            </div>
          </div>
          <Link
            to="/admin/login"
            className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2"
          >
            Go to Merchant Login <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 bg-gradient-to-b from-[#f2fbf4] via-[#f8faf8] to-[#ffffff] flex flex-col justify-center items-center">
      <div className="max-w-xl w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="bg-primary-600 rounded-xl p-2 shadow-sm">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-2xl font-black text-gray-900 tracking-tight">
              flinkit<span className="text-primary-600">.</span>
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            Partner with Flinkit
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Register your grocery shop or supermarket to start selling to thousands of neighborhood customers
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 sm:p-10">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-full w-fit mb-6 text-primary-700 text-xs font-bold">
            <Store className="w-3.5 h-3.5" />
            <span>Shopkeeper / Merchant Registration</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name & Shop Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Ramesh Gupta"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Shop / Store Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="shopName"
                    required
                    value={formData.shopName}
                    onChange={handleChange}
                    placeholder="e.g. Gupta Daily Mart"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Email & Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ramesh@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    name="phone"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Shop Address */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Shop Address & Pincode <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <textarea
                  name="shopAddress"
                  required
                  rows={2}
                  value={formData.shopAddress}
                  onChange={handleChange}
                  placeholder="Shop No. 12, Main Market, Block B, New Delhi - 110001"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Invitation Code (Optional) */}
            <div className="pt-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Invitation / Security Key (Optional)</span>
                <span className="text-[10px] text-gray-400 font-normal">For Instant Activation</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="inviteCode"
                  value={formData.inviteCode}
                  onChange={handleChange}
                  placeholder="e.g. FLINKIT_SHOP_2026 or FLINKIT_ADMIN_SECRET_2026"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all font-mono"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Enter your merchant onboarding code for automatic approval. Standard applications are reviewed within 24 hours.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-6 shadow-md shadow-primary-600/20"
            >
              {loading ? 'Creating Merchant Account...' : 'Register as Shopkeeper'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Footer info */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <span>
              Already registered as a partner?{' '}
              <Link to="/admin/login" className="text-primary-600 font-bold hover:underline">
                Sign In
              </Link>
            </span>
            <Link to="/" className="text-gray-400 hover:text-gray-600">
              Back to Customer Store
            </Link>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Role-Based Secure Multi-Tenant Access Control</span>
        </div>
      </div>
    </div>
  );
};

export default AdminSignup;

