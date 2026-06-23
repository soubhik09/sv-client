import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch {
      // Error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Blue Panel */}
      <div className="md:w-5/12 bg-gradient-to-br from-blue-600 to-indigo-700 p-10 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[300px] md:min-h-screen">
        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-800 rounded-bl-full"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-indigo-800 rounded-tr-full"></div>

        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg z-10">
          <span className="text-3xl font-bold text-blue-600">SV</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 z-10">Siddhi Vinayak Enterprise</h2>
        <p className="text-blue-200 text-sm leading-relaxed max-w-[260px] z-10">
          Management system for billing, customers, and reports.
        </p>
      </div>

      {/* Right Form Panel */}
      <div className="md:w-7/12 bg-white p-10 md:p-16 flex flex-col justify-center md:min-h-screen">
        <div className="max-w-sm mx-auto w-full">
          <h1 className="text-3xl font-bold text-indigo-700 mb-2">Sign In</h1>
          <p className="text-gray-500 text-sm mb-8">Hey, enter your details to sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-lg transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Login In
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            © {new Date().getFullYear()} Siddhi Vinayak Enterprise
          </p>
        </div>
      </div>
    </div>
  );
}
