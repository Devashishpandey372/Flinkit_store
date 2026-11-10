import { Link } from 'react-router-dom';
import { Zap, Phone, Mail, MapPin, ShieldCheck, Clock } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Brand & Promise */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary-600 rounded-xl p-1.5">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-xl font-black text-white">
                flinkit<span className="text-primary-400">.</span>
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              India&apos;s lightning-fast 10-minute grocery delivery platform. Fresh vegetables, dairy essentials, pantry staples, and household supplies delivered to your door.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-3 py-2 rounded-xl">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Razorpay Verified &amp; PCI-DSS 256-Bit SSL Secured</span>
            </div>
          </div>

          {/* Col 2: Quick Shop Categories */}
          <div>
            <h3 className="text-white font-bold text-sm mb-4 tracking-wide uppercase">Shop Groceries</h3>
            <ul className="space-y-2.5">
              {[
                ['All Groceries', '/products'],
                ['Fruits & Vegetables', '/products?category=fruits-vegetables'],
                ['Dairy, Bread & Eggs', '/products?category=dairy-bread-eggs'],
                ['Snacks & Munchies', '/products?category=snacks-munchies'],
                ['Cold Drinks & Juices', '/products?category=cold-drinks-juices'],
                ['Atta, Rice & Dal', '/products?category=atta-rice-dal'],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link to={href} className="text-xs text-gray-400 hover:text-primary-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Company & Information */}
          <div>
            <h3 className="text-white font-bold text-sm mb-4 tracking-wide uppercase">Company</h3>
            <ul className="space-y-2.5">
              {[
                ['About Us', '/about'],
                ['Contact Customer Support', '/contact'],
                ['Track My Orders', '/my-orders'],
                ['My Account Profile', '/profile'],
                ['Customer Sign In', '/login'],
                ['Sell on Flinkit (Merchant Portal)', '/admin/login'],
                ['Partner Registration', '/admin/signup'],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link to={href} className="text-xs text-gray-400 hover:text-primary-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Mandatory Legal & Razorpay Policy Links */}
          <div>
            <h3 className="text-white font-bold text-sm mb-4 tracking-wide uppercase">Policy &amp; Legal</h3>
            <ul className="space-y-2.5">
              {[
                ['Privacy Policy', '/privacy-policy'],
                ['Terms & Conditions', '/terms-and-conditions'],
                ['Refund & Cancellation Policy', '/refund-policy'],
                ['Shipping & Delivery Policy', '/shipping-policy'],
                ['Contact & Grievance Redressal', '/contact'],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link to={href} className="text-xs text-gray-400 hover:text-primary-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-4 border-t border-gray-800 space-y-1.5 text-[11px] text-gray-400">
              <p className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary-400" /> Support: 7:00 AM – 11:00 PM IST
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary-400" /> support@flinkitstore.com
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary-400" /> +91 98765 43210
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <div className="text-center sm:text-left">
            <span>&copy; {new Date().getFullYear()} Flinkit Store. Operated by [YOUR REGISTERED BUSINESS NAME / LEGAL ENTITY NAME]. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <Link to="/about" className="hover:text-gray-300 transition-colors">About Us</Link>
            <Link to="/contact" className="hover:text-gray-300 transition-colors">Contact Us</Link>
            <Link to="/privacy-policy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
            <Link to="/refund-policy" className="hover:text-gray-300 transition-colors">Refund Policy</Link>
            <Link to="/shipping-policy" className="hover:text-gray-300 transition-colors">Shipping Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
