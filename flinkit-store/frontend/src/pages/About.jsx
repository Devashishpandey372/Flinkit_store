import { Zap, ShieldCheck, Clock, Award, Users, HeartHandshake, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 border border-primary-200 rounded-full text-xs font-bold text-primary-700">
          <Zap className="w-3.5 h-3.5 text-primary-600 fill-primary-600" />
          India's Fastest Grocery Delivery Platform
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
          Delivering Freshness in <span className="text-primary-600">10 Minutes</span>
        </h1>
        <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
          At Flinkit Store, we believe that accessing fresh groceries and daily essentials should be instantaneous, effortless, and reliable. Powered by our hyperlocal dark store network, we bring farm-fresh produce and trusted brands directly to your doorstep.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Delivery Time', value: '10 Mins', desc: 'Average hyper-local turnaround' },
          { label: 'Products Stocked', value: '1,000+', desc: 'Across fresh & household categories' },
          { label: 'Orders Delivered', value: '50,000+', desc: 'To satisfied families & professionals' },
          { label: 'Customer Rating', value: '4.8 / 5', desc: 'Based on verified buyer reviews' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
            <p className="text-2xl sm:text-3xl font-black text-primary-600">{stat.value}</p>
            <p className="font-bold text-gray-900 text-sm mt-1">{stat.label}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Our mission is to eliminate the daily friction of grocery shopping. By combining cutting-edge supply chain intelligence with neighborhood fulfillment centers, we ensure that every household receives fresh, high-quality groceries without stepping out or waiting hours for delivery.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Our Quality Promise</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Every apple, carton of milk, and pantry staple undergoes strict 3-stage quality checks. We source our fruits and vegetables directly from trusted farmers and authorized distributors, guaranteeing freshness and fair pricing with 100% genuine products.
          </p>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-gray-100 shadow-sm space-y-8">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Why Customers Trust Flinkit</h2>
          <p className="text-gray-500 text-sm mt-2">Built for everyday convenience with unmatched reliability.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2 text-center p-4">
            <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900">Sub-15 Min Delivery</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Strategically positioned micro-stores within 2 km of your location ensure rapid fulfillment.
            </p>
          </div>

          <div className="space-y-2 text-center p-4">
            <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900">Safe & Secure Payments</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Integrated with Razorpay for encrypted, PCI-DSS compliant transactions across UPI, cards, and netbanking.
            </p>
          </div>

          <div className="space-y-2 text-center p-4">
            <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mx-auto">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900">Dedicated Support</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Prompt customer service ready to assist with order tracking, replacements, or instant refunds.
            </p>
          </div>
        </div>
      </div>

      {/* Corporate & Registration Information (Required by Razorpay) */}
      <div className="bg-gray-50 p-6 sm:p-8 rounded-3xl border border-gray-200/80 space-y-4">
        <h3 className="text-base font-bold text-gray-900 uppercase tracking-wider text-xs">
          Legal & Business Entity Information
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Flinkit Store is owned and operated by <span className="font-bold text-gray-800">[YOUR REGISTERED BUSINESS NAME / LEGAL ENTITY NAME]</span>, an enterprise incorporated under the laws of India.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-600 pt-2 border-t border-gray-200">
          <div>
            <span className="font-semibold text-gray-800 block">Registered Office Address:</span>
            <span>[YOUR REGISTERED BUSINESS ADDRESS, e.g., 123 Green Valley, Sector 5, New Delhi — 110001, India]</span>
          </div>
          <div>
            <span className="font-semibold text-gray-800 block">Corporate Identity / Registration Number:</span>
            <span>[CIN / LLPIN / UDYAM REGISTRATION NUMBER]</span>
          </div>
          <div>
            <span className="font-semibold text-gray-800 block">GST Identification Number (GSTIN):</span>
            <span>[YOUR 15-DIGIT GSTIN NUMBER IF APPLICABLE]</span>
          </div>
          <div>
            <span className="font-semibold text-gray-800 block">Official Contact Email:</span>
            <span>support@flinkitstore.com</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-4">
        <Link to="/products" className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-base font-bold">
          Explore Grocery Store <Zap className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default About;

