import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Store, Mail, Lock, ShieldCheck, ArrowRight, Zap, AlertCircle, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminAuthService } from '../services/api';
import toast from 'react-hot-toast';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { adminLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    adminAuthService
      .getSetupStatus()
      .then((res) => setSetupRequired(res.data.data.isSetupRequired))
      .catch(() => {});
  }, []);

  const errorParam = searchParams.get('error');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const user = await adminLogin(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      const redirect = searchParams.get('redirect');
      navigate(redirect || '/admin/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredentials = (userEmail, userPassword) => {
    setEmail(userEmail);
    setPassword(userPassword);
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 bg-gradient-to-b from-[#f2fbf4] via-[#f8faf8] to-[#ffffff] flex flex-col justify-center items-center">
      <div className="max-w-md w-full">
        {/* Header */}
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
            Merchant & Admin Portal
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sign in to manage inventory, fulfill customer orders, and add products
          </p>
        </div>

        {/* Setup Required Notice */}
        {setupRequired && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-emerald-900 text-xs">
            <Key className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold mb-0.5">Initial Setup Required</strong>
              Master Admin has not been initialized yet.
              <Link to="/admin/setup" className="block text-emerald-700 font-bold underline mt-1">
                Click here to complete Master Admin setup &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Warning if redirected due to error */}
        {errorParam === 'approval_required' && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">Approval Required</strong>
              Your shopkeeper account is currently awaiting administrative approval. You will receive access once verified.
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 sm:p-8">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-full w-fit mb-6 text-primary-700 text-xs font-bold">
            <Store className="w-3.5 h-3.5" />
            <span>Authorized Shopkeeper & Admin Access</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Registered Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@flinkitstore.com or shop@domain.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-4 shadow-md shadow-primary-600/20"
            >
              {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Quick Credential Hint for Testing */}
          <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Default Administrator Login
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fillQuickCredentials('admin@flinkitstore.com', 'Admin@123')}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-mono transition-colors"
              >
                admin@flinkitstore.com
              </button>
            </div>
          </div>

          {/* Footer links */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <span>
              New Shopkeeper?{' '}
              <Link to="/admin/signup" className="text-primary-600 font-bold hover:underline">
                Register Store
              </Link>
            </span>
            <Link to="/" className="text-gray-400 hover:text-gray-600">
              Customer Store
            </Link>
          </div>
        </div>

        {/* Customer redirect note */}
        <div className="mt-6 text-center text-xs text-gray-400">
          Looking to purchase groceries?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">
            Go to Customer Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

