import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { isDemoMode } from '../api/client';
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from '../api/demo';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui';

/** Left brand panel (hidden on small screens) + login card. */
export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    const from = (location.state as { from?: string } | null)?.from || '/';
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed, try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-brand p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M8 4h8l-1.4 3.2h-1.7V20h-1.8V7.2H9.4L8 4z" fill="#FFFFFF" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold leading-tight text-white">YDU Academy</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Admin console</p>
          </div>
        </div>

        <div>
          <h2 className="max-w-md text-3xl font-bold leading-snug text-white">
            Full control of the academy — courses, learners, orders and more.
          </h2>
          <ul className="mt-6 space-y-2.5 text-[15px] font-medium text-white/80">
            <li>• Live revenue and enrollment charts</li>
            <li>• Publish and price the whole catalog</li>
            <li>• Moderate reviews and manage refunds</li>
            <li>• Coupons, categories and app settings</li>
          </ul>
        </div>

        <p className="text-[13px] font-medium text-white/60">Learn the dairy trade, one batch at a time.</p>

        {/* soft decorative circles */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/25" />
        <div className="pointer-events-none absolute -bottom-32 -right-10 h-80 w-80 rounded-full bg-ink/6" />
      </div>

      {/* form panel */}
      <div className="flex flex-1 items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-line bg-surface p-8">
            <div className="mb-7 flex items-center gap-2.5 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M8 4h8l-1.4 3.2h-1.7V20h-1.8V7.2H9.4L8 4z" fill="#0F231A" />
                </svg>
              </div>
              <p className="text-base font-bold">YDU Academy — Admin</p>
            </div>

            <h1 className="text-xl font-bold">Sign in</h1>
            <p className="mt-1 text-sm text-muted">Use your admin account to continue.</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold">Email</span>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@yduacademy.com"
                    className="h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold">Password</span>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-10 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-subtle hover:text-ink"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="rounded-lg bg-error-soft px-3.5 py-2.5 text-[13px] font-medium text-error">{error}</div>
              )}

              <Button type="submit" loading={loading} className="h-11 w-full text-[15px]">
                Sign in to dashboard
              </Button>
            </form>

            <div className="mt-6 rounded-lg border border-line-soft bg-surface-alt px-4 py-3">
              <p className="text-xs font-semibold text-brand-ink">Demo credentials</p>
              <p className="mt-1 font-mono text-[13px] text-ink">
                {DEMO_ADMIN_EMAIL} · {DEMO_ADMIN_PASSWORD}
              </p>
              {isDemoMode() && (
                <p className="mt-1 text-xs text-muted">Server offline — the demo dataset is active.</p>
              )}
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-subtle">
            YDU Academy admin console · only signed-in admins can reach the dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
