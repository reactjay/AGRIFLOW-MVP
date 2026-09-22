import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import { AgriFlowLogo } from '../components/ui/AgriFlowLogo';
import { authService } from '../services/authService';
import type { UserRole } from '../types';

type AuthMethod = 'email' | 'phone';
type PhoneStep = 'form' | 'verify';

export function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<UserRole>('buyer');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');

  // Email fields
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  // Phone-OTP flow
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('form');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const { register } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRoleSelect = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { toast('error', 'Please fill in all required fields.'); return; }
    setLoading(true);
    try {
      await register({ name, organizationName: organizationName || name, email, password, role, phone, location });
      toast('success', 'Account created successfully.');
      navigate('/app/dashboard');
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Registration failed.');
    } finally { setLoading(false); }
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone.trim()) { toast('error', 'Enter your name and phone number.'); return; }
    const code = authService.requestOtp(phone);
    setDemoOtp(code);
    setPhoneStep('verify');
    toast('success', 'OTP sent! (Demo: see code below)');
  };

  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) { toast('error', 'Enter the OTP code.'); return; }
    setLoading(true);
    try {
      const session = await authService.registerWithPhone({
        phone, name, role, otp, organizationName: organizationName || name, location,
      });
      toast('success', `Account created! Welcome, ${session.name}.`);
      window.location.href = '/app/dashboard';
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Registration failed.');
    } finally { setLoading(false); }
  };

  const showPhoneOption = role === 'buyer' || role === 'supplier';

  return (
    <div className="min-h-screen bg-[#f4f5f6] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 border border-gray-200 rounded-xl shadow-xs">
          <div className="mb-6">
            <AgriFlowLogo size="md" />
          </div>

          {step === 1 ? (
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Create your account</h2>
              <p className="text-xs text-gray-500 mt-1 mb-6">
                Select how you will use AgriFlow. This cannot be changed later.
              </p>

              <form onSubmit={handleRoleSelect} className="space-y-3">
                {(['buyer', 'supplier', 'logistics'] as UserRole[]).map((r) => (
                  <label
                    key={r}
                    className={`block border rounded-lg p-4 cursor-pointer transition-all ${
                      role === r ? 'border-gray-800 bg-gray-50/50 shadow-xs' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio" name="role" value={r} checked={role === r}
                        onChange={() => setRole(r)} className="mt-0.5 accent-gray-900"
                      />
                      <div>
                        <div className="text-sm font-semibold text-gray-900 capitalize">
                          {r === 'logistics' ? 'Logistics Provider' : r === 'buyer' ? 'Buyer' : 'Supplier'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {r === 'buyer' && 'Post demand, review matches, pay and confirm delivery.'}
                          {r === 'supplier' && 'List available supply, accept requests and fulfil orders.'}
                          {r === 'logistics' && 'Accept transport jobs, confirm pickup and delivery.'}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}

                <p className="text-[11px] text-gray-400 pt-1 leading-relaxed">
                  Operations accounts are provisioned internally and do not appear here.
                </p>

                <button
                  type="submit"
                  className="w-full mt-4 bg-agri-700 hover:bg-agri-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-xs"
                >
                  Continue
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-agri-700 hover:underline">Log in</Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Account Details</h2>
                <button type="button" onClick={() => setStep(1)} className="text-xs text-gray-500 hover:text-gray-800 underline">
                  Change role ({role})
                </button>
              </div>

              {/* Auth method toggle — phone only for buyer/supplier */}
              {showPhoneOption && (
                <div className="flex rounded-lg border border-gray-200 p-1 mb-5 bg-gray-50 gap-1">
                  <button
                    type="button" onClick={() => setAuthMethod('email')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors ${
                      authMethod === 'email' ? 'bg-white shadow-xs text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" /> Email
                  </button>
                  <button
                    type="button" onClick={() => { setAuthMethod('phone'); setPhoneStep('form'); setDemoOtp(null); setOtp(''); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors ${
                      authMethod === 'phone' ? 'bg-white shadow-xs text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Phone + OTP
                  </button>
                </div>
              )}

              {authMethod === 'email' || !showPhoneOption ? (
                <form onSubmit={handleEmailRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Contact / Full Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Kola Farms Ltd"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Company / Organization Name</label>
                    <input type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="e.g. Kola Farms Ltd"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                      <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                        placeholder="+234 800 000 0000"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Location / State</label>
                      <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Ikeja, Lagos"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full mt-2 bg-agri-700 hover:bg-agri-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-xs disabled:opacity-50">
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>
                </form>
              ) : (
                <>
                  {phoneStep === 'form' ? (
                    <form onSubmit={handleSendOtp} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Emeka Okafor"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Organization Name</label>
                        <input type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)}
                          placeholder="e.g. Okafor Farms"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                          placeholder="+234 800 000 0000"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none" />
                        <p className="text-[11px] text-gray-400 mt-1">You'll verify your number with a one-time code.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Location / State</label>
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g. Kano, Nigeria"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none" />
                      </div>
                      <button type="submit"
                        className="w-full bg-agri-700 hover:bg-agri-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-xs">
                        Send OTP
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handlePhoneRegister} className="space-y-4">
                      <div className="px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                        OTP sent to <strong>{phone}</strong>.{' '}
                        <button type="button" className="underline font-medium"
                          onClick={() => { setPhoneStep('form'); setDemoOtp(null); setOtp(''); }}>
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
                        <input type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4}
                          required value={otp} onChange={(e) => setOtp(e.target.value)}
                          placeholder="e.g. 4829"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-agri-700 focus:border-agri-700 outline-none tracking-widest text-center text-lg font-mono" />
                      </div>
                      <button type="submit" disabled={loading}
                        className="w-full bg-agri-700 hover:bg-agri-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-xs disabled:opacity-50">
                        {loading ? 'Creating account...' : 'Verify & Create Account'}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
