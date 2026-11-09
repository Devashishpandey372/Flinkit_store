import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');
  const from = location.state?.from?.pathname || location.state?.from || redirectParam || '/';

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const user = await login(data.email, data.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}! 👋`);
      navigate(user.role === 'admin' ? '/admin/dashboard' : from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left image panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 to-emerald-400 items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 text-white text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-white/20 rounded-2xl p-2"><Zap className="w-8 h-8 fill-white" /></div>
            <span className="text-3xl font-black">flinkit<span className="text-yellow-300">.</span></span>
          </div>
          <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80" alt="Fresh food" className="rounded-3xl w-80 h-80 object-cover mx-auto mb-6 shadow-2xl" />
          <h2 className="text-2xl font-bold mb-2">Your grocery store,</h2>
          <p className="text-white/80">delivered in 10 minutes.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="bg-primary-600 rounded-xl p-1.5"><Zap className="w-5 h-5 text-white fill-white" /></div>
            <span className="text-xl font-black">flinkit<span className="text-primary-600">.</span></span>
          </div>

          <h1 className="text-3xl font-black text-gray-900 mb-2">Welcome back!</h1>
          <p className="text-gray-500 mb-8">Sign in to continue shopping</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" id="login-form">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="login-email">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })}
                  className="input-field pl-10"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="login-password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password', { required: 'Password is required' })}
                  className="input-field pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  id="login-toggle-password">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="w-full btn-primary flex items-center justify-center gap-2 text-base py-3" id="login-submit-btn">
              {isLoading ? <LoadingSpinner size="sm" className="border-white/30 border-t-white" /> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary-600 font-semibold hover:underline" id="login-signup-link">Create one</Link>
          </p>

          <div className="mt-4 text-center">
            <Link to="/admin/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Admin login →</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
