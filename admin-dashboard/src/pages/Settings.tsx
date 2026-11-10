import { CheckCircle2, CreditCard, KeyRound, RotateCcw, Save, Server, Smartphone, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SERVER_URL,
  api,
  hasCustomServerUrl,
  setServerUrl,
  testServerConnection,
  useServerUrl,
  type ConnectionTestResult,
} from '../api/client';
import { onRealtimeEvent } from '../api/realtime';
import type { AppSettings } from '../api/types';
import { ADMIN_THEMES, useAdminTheme, type AdminThemeId } from '../theme/adminTheme';
import { Button, Card, CardHeader, Field, FormSkeleton, Input, PasswordInput, Select, Textarea, Toggle, useToast } from '../components/ui';

/** Colour theme of this admin console. Stored on this browser only; changes apply at once. */
function AppearanceCard() {
  const [theme, setTheme] = useAdminTheme();
  return (
    <Card>
      <CardHeader title="Appearance" subtitle="Colour theme for this console. Saved on this browser; the browser tab icon follows it." />
      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        {(Object.keys(ADMIN_THEMES) as AdminThemeId[]).map((id) => {
          const option = ADMIN_THEMES[id];
          const p = option.preview;
          const selected = theme === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              aria-pressed={selected}
              className={`group overflow-hidden rounded-xl border-2 bg-surface text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                selected ? 'border-brand' : 'border-line hover:border-ink/30'
              }`}
            >
              {/* Miniature of the console in this theme */}
              <div className="flex h-36 border-b border-line-soft" style={{ background: p.canvas }} aria-hidden>
                <div className="flex w-12 flex-col gap-1.5 p-2" style={{ background: p.sidebar }}>
                  <span className="h-1.5 w-6 rounded-full bg-white/80" />
                  <span className="h-1.5 w-7 rounded-full bg-white/40" />
                  <span className="h-1.5 w-5 rounded-full bg-white/40" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="h-2 w-16 rounded-full" style={{ background: p.accentSoft }} />
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                      style={{ background: p.accent, color: p.onAccent }}
                    >
                      Save
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 shadow-none ring-1 ring-black/5">
                    <div className="mb-2 h-1.5 w-10 rounded-full" style={{ background: p.accent }} />
                    <div className="flex items-end gap-1.5">
                      {[40, 70, 52, 88, 62].map((h, index) => (
                        <span key={index} className="w-full rounded-sm" style={{ height: h / 4, background: index % 2 ? p.accent : p.accentSoft }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4">
                <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-line" style={{ background: option.swatch }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{option.description}</p>
                </div>
                <span
                  className={`mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    selected ? 'bg-brand text-on-brand' : 'bg-surface-alt text-subtle'
                  }`}
                >
                  {selected ? 'In use' : 'Use this'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/** Admin login: the username is the login email. Changing either needs the current password, then a fresh sign-in. */
function AdminAccountCard() {
  const toast = useToast();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const changingPassword = newPassword.length > 0;
  const changingUsername = username.trim() !== '' && username.trim().toLowerCase() !== (user?.email ?? '').toLowerCase();
  const passwordsMatch = newPassword === confirmPassword;
  const canSave =
    !saving &&
    currentPassword.length > 0 &&
    (changingUsername || changingPassword) &&
    (!changingPassword || (newPassword.length >= 8 && passwordsMatch));

  async function save() {
    setSaving(true);
    try {
      await api.updateAccount({
        currentPassword,
        ...(changingUsername ? { email: username.trim().toLowerCase() } : {}),
        ...(changingPassword ? { newPassword } : {}),
      });
      toast('success', 'Login updated. Sign in again with the new details.');
      logout();
      navigate('/login');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not update the login');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Admin login" subtitle="Change the username (login email) or the password for this admin account" />
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <Field label="Username (login email)">
          <Input type="email" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </Field>
        <Field label="Current password" hint="Required to save any change">
          <PasswordInput value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label="New password" hint="At least 8 characters. Leave empty to keep it.">
          <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password" error={changingPassword && !passwordsMatch ? 'The passwords do not match' : undefined}>
          <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-4">
        <p className="text-[13px] text-muted">Saving signs you out so you can sign in with the new details.</p>
        <Button icon={KeyRound} onClick={save} loading={saving} disabled={!canSave}>
          Update login
        </Button>
      </div>
    </Card>
  );
}

/** Lets the admin quickly switch which backend server this dashboard talks to (saved in browser). */
function ConsoleServerCard({ onSwitched }: { onSwitched: () => void }) {
  const toast = useToast();
  const activeServer = useServerUrl();
  const [input, setInput] = useState(activeServer);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  useEffect(() => {
    setInput(activeServer);
  }, [activeServer]);

  async function runTest() {
    setTesting(true);
    const result = await testServerConnection(input);
    setTestResult(result);
    setTesting(false);
  }

  async function apply() {
    try {
      const next = setServerUrl(input);
      setTestResult(null);
      toast('success', `Dashboard switched to ${next}`);
      try {
        await api.me();
        onSwitched();
      } catch {
        /* 401 handler or network error notifies automatically */
      }
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Invalid server URL');
    }
  }

  async function reset() {
    const next = setServerUrl('');
    setInput(next);
    setTestResult(null);
    toast('success', `Reset to default server (${next})`);
    onSwitched();
  }

  return (
    <Card>
      <CardHeader
        title="Admin console server"
        subtitle="Switch which backend server this admin browser connects to — instant, no rebuild needed"
      />
      <div className="space-y-3 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Server size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <Input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setTestResult(null);
              }}
              placeholder={DEFAULT_SERVER_URL}
              aria-label="Admin console server URL"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" loading={testing} onClick={() => void runTest()}>
              Test
            </Button>
            <Button onClick={() => void apply()} disabled={input.trim().replace(/\/+$/, '').replace(/\/api$/i, '') === activeServer}>
              Switch server
            </Button>
            {hasCustomServerUrl() && (
              <Button variant="ghost" icon={RotateCcw} onClick={() => void reset()}>
                Default
              </Button>
            )}
          </div>
        </div>
        {testResult && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
              testResult.ok ? 'bg-success-soft text-success' : 'bg-error-soft text-error'
            }`}
          >
            {testResult.ok && <CheckCircle2 size={14} className="shrink-0" />}
            <span>
              {testResult.ok
                ? `Reachable · DB ${testResult.db} · ${testResult.latencyMs}ms`
                : testResult.error}
            </span>
          </div>
        )}
        <p className="text-xs text-subtle">
          Build default (VITE_API_URL): <span className="font-mono text-muted">{DEFAULT_SERVER_URL}</span>
        </p>
      </div>
    </Card>
  );
}

export default function Settings() {
  const toast = useToast();
  const activeServer = useServerUrl();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [form, setForm] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [appUrlTesting, setAppUrlTesting] = useState(false);
  const [appUrlTest, setAppUrlTest] = useState<ConnectionTestResult | null>(null);

  const load = useCallback(() => {
    api
      .getSettings()
      .then((s) => {
        setSettings(s);
        setForm(s);
      })
      .catch((e) => toast('error', e instanceof Error ? e.message : 'Failed to load settings'));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = settings && form ? JSON.stringify(settings) !== JSON.stringify(form) : false;

  // Another admin's save lands here live — refresh unless this form has unsaved edits.
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty || saving;
  useEffect(() => {
    const off = onRealtimeEvent('settings.updated', () => {
      if (!dirtyRef.current) load();
    });
    return () => {
      off();
    };
  }, [load]);

  if (!settings || !form) return <FormSkeleton sections={3} fieldsPerSection={3} className="max-w-3xl" />;

  async function testAppServerUrl() {
    const candidate = (form?.apiBaseUrl ?? '').trim();
    if (!candidate) {
      setAppUrlTest(null);
      return;
    }
    setAppUrlTesting(true);
    const result = await testServerConnection(candidate);
    setAppUrlTest(result);
    setAppUrlTesting(false);
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      // Banners, help, policies and checkout copy have their own pages; this form never sends them.
      const { faqs: _faqs, legalDocs: _legal, purchaseTerms: _terms, homeBanners: _banners, ...fields } = form;
      const cleanedApiBaseUrl = (fields.apiBaseUrl ?? '').trim().replace(/\/+$/, '').replace(/\/api$/i, '');
      const updated = await api.updateSettings({ ...fields, apiBaseUrl: cleanedApiBaseUrl });
      setSettings(updated);
      setForm(updated);
      setAppUrlTest(null);
      toast('success', form.maintenanceMode ? 'Saved — maintenance mode is ON for the app' : 'Settings saved');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader title="App identity" subtitle="Shown across the mobile app" />
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="App name">
              <Input value={form.appName} onChange={(e) => set('appName', e.target.value)} />
            </Field>
            <Field label="Currency">
              <Input value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} maxLength={3} />
            </Field>
          </div>
          <Field label="Tagline">
            <Textarea rows={2} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Support" subtitle="Where learners reach a human" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-5">
          <Field label="Support email">
            <Input type="email" value={form.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} />
          </Field>
          <Field label="Support phone">
            <Input value={form.supportPhone} onChange={(e) => set('supportPhone', e.target.value)} />
          </Field>
        </div>
      </Card>

      <AppearanceCard />

      <Card>
        <CardHeader title="Platform controls" subtitle="Take effect the next time the app syncs" />
        <div className="divide-y divide-line-soft">
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-error-soft">
                <Wrench size={16} className="text-error" />
              </div>
              <div>
                <p className="text-sm font-semibold">Maintenance mode</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                  The app shows a full-page maintenance screen and blocks new purchases (in the app and on the server) while this is on.
                </p>
              </div>
            </div>
            <Toggle checked={form.maintenanceMode} onChange={(v) => set('maintenanceMode', v)} label="Maintenance mode" />
          </div>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                <CreditCard size={16} className="text-brand-ink" />
              </div>
              <div>
                <p className="text-sm font-semibold">Checkout mode</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                  Both keep Razorpay inside the app. Web: UPI and QR in the in-app payment page (works in Expo Go). SDK: the native Razorpay sheet (dev build; otherwise the same in-app page).
                </p>
              </div>
            </div>
            <Select
              value={form.checkoutMode}
              onChange={(e) => set('checkoutMode', e.target.value as AppSettings['checkoutMode'])}
              className="sm:w-56"
              aria-label="Checkout mode"
            >
              <option value="web">Web (in-app page)</option>
              <option value="sdk">SDK (native sheet)</option>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                <Smartphone size={16} className="text-brand-ink" />
              </div>
              <div>
                <p className="text-sm font-semibold">Minimum app version</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                  Older builds see an update screen and cannot use the app until they update. Leave empty for no gate (e.g. “1.2.0”).
                </p>
              </div>
            </div>
            <Input value={form.minAppVersion} onChange={(e) => set('minAppVersion', e.target.value)} placeholder="1.0.0" className="w-32" />
          </div>
          <div className="space-y-3 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                  <Smartphone size={16} className="text-brand-ink" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Server URL for the mobile app</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                    Where the mobile app sends requests. Leave empty to use its built-in URL (EXPO_PUBLIC_API_URL). Save it and open apps switch live.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={form.apiBaseUrl ?? ''}
                  onChange={(e) => {
                    set('apiBaseUrl', e.target.value);
                    setAppUrlTest(null);
                  }}
                  placeholder="https://api.example.com"
                  aria-label="Server URL for the app"
                  className="sm:w-64"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={appUrlTesting}
                  disabled={!form.apiBaseUrl?.trim()}
                  onClick={() => void testAppServerUrl()}
                >
                  Test
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pl-12 text-xs">
              <button
                type="button"
                onClick={() => {
                  set('apiBaseUrl', activeServer);
                  setAppUrlTest(null);
                }}
                className="font-semibold text-brand-ink hover:underline"
              >
                Use this console’s server ({activeServer})
              </button>
              {form.apiBaseUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    set('apiBaseUrl', '');
                    setAppUrlTest(null);
                  }}
                  className="font-semibold text-muted hover:text-ink hover:underline"
                >
                  Reset to app built-in default
                </button>
              ) : null}
            </div>
            {appUrlTest && (
              <div
                className={`ml-12 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                  appUrlTest.ok ? 'bg-success-soft text-success' : 'bg-error-soft text-error'
                }`}
              >
                {appUrlTest.ok && <CheckCircle2 size={14} className="shrink-0" />}
                <span>
                  {appUrlTest.ok
                    ? `Reachable · DB ${appUrlTest.db} · ${appUrlTest.latencyMs}ms`
                    : appUrlTest.error}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <ConsoleServerCard onSwitched={load} />

      <AdminAccountCard />

      {form.maintenanceMode && (
        <div className="rounded-lg border border-error/25 bg-error-soft px-4 py-3 text-[13px] font-medium text-error">
          Heads up: learners currently see the maintenance screen.
        </div>
      )}

      <div className="flex justify-end">
        <Button icon={Save} onClick={save} loading={saving} disabled={!dirty}>
          Save settings
        </Button>
      </div>
    </div>
  );
}
