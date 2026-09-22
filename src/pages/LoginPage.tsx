import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageSquare, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import { AgriFlowLogo } from '../components/ui/AgriFlowLogo';
import { authService } from '../services/authService';


type AuthTab = 'email' | 'phone';
type PhoneStep = 'enter' | 'verify';

export function LoginPage() {
  const [tab, setTab] = useState<AuthTab>('email');

  // Email auth
  const [email, setEmail] = useState('buyer@kolafarms.com');
  const [password, setPassword] = useState('agriflow123');

  // Phone auth
  const [phone, setPhone] = useState('');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const { login } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast('error', 'Please enter your email and password.'); return; }
    setLoading(true);
    try {
      await login(email, password);
      toast('success', 'Signed in successfully.');
      navigate('/app/dashboard');
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Sign in failed.');
    } finally { setLoading(false); }
  };

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { toast('error', 'Enter your phone number.'); return; }
    const code = authService.requestOtp(phone);
    setDemoOtp(code);
    setPhoneStep('verify');
    toast('success', 'OTP sent! (Demo: see code below)');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) { toast('error', 'Enter the OTP code.'); return; }
    setLoading(true);
    try {
      const session = await authService.loginWithPhone(phone, otp);
      toast('success', `Welcome back, ${session.name}!`);
      // Full reload so AppProvider picks up the new localStorage session
      window.location.href = '/app/dashboard';
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'OTP verification failed.');
    } finally { setLoading(false); }
  };

  const setCredentials = (userEmail: string) => { setEmail(userEmail); setPassword('agriflow123'); };

  return (
    <div className="min-h-screen bg-[#f4f5f6] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 border border-gray-200 rounded-xl shadow-xs">
          <div className="mb-6">
            <AgriFlowLogo size="md" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Sign in to your account</h2>
          <p className="text-xs text-gray-500 mt-1 mb-5">
            Access the agricultural trade platform.
          </p>

          {/* Auth method tabs */}
          <div className="flex rounded-lg border border-gray-200 p-1 mb-5 bg-gray-50 gap-1">
            <button
              type="button"
              onClick={() => setTab('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors ${
                tab === 'email' ? 'bg-white shadow-xs text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => { setTab('phone'); setPhoneStep('enter'); setDemoOtp(null); setOtp(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors ${
                tab === 'phone' ? 'bg-white shadow-xs text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Phone + OTP
            </button>
          </div>

          {tab === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-agri-700 hover:bg-agri-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <>
              {phoneStep === 'enter' ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">We'll send a one-time code to this number.</p>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-agri-700 hover:bg-agri-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-xs"
                  >
                    Send OTP
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                    OTP sent to <strong>{phone}</strong>.{' '}
                    <button type="button" className="underline font-medium" onClick={() => { setPhoneStep('enter'); setDemoOtp(null); setOtp(''); }}>
                      Change number
                    </button>
                  </div>

                  {demoOtp && (
                    <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <span className="font-semibold">Demo only:</span> Your OTP is{' '}
                      <span className="font-mono font-bold tracking-widest text-sm">{demoOtp}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Enter 4-digit OTP</label>
                    <input
                      type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4}
                      required value={otp} onChange={(e) => setOtp(e.target.value)}
                      placeholder="e.g. 4829"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none tracking-widest text-center text-lg font-mono"
                    />
                  </div>
                  <button
                    type="submit" disabled={loading}
                    className="w-full bg-agri-700 hover:bg-agri-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-xs disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                </form>
              )}
            </>
          )}

          {/* Test accounts (email tab only) */}
          {tab === 'email' && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                Select Test Account
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Buyer', sub: 'Kola Farms Ltd', email: 'buyer@kolafarms.com' },
                  { label: 'Supplier', sub: 'Adeyemi Produce', email: 'supplier@adeyemiproduce.com' },
                  { label: 'Logistics', sub: 'SwiftHaul Logistics', email: 'logistics@swifthaul.com' },
                  { label: 'Operations', sub: 'AgriFlow Admin', email: 'admin@agriflow.trade' },
                ].map(({ label, sub, email: e }) => (
                  <button
                    key={e} type="button" onClick={() => setCredentials(e)}
                    className="p-2 border border-gray-200 hover:border-gray-300 rounded-md text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="font-medium text-gray-900">{label}</div>
                    <div className="text-[10px] text-gray-500 truncate">{sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-xs text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-agri-700 hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
