import { CreditCard, KeyRound, Save, Smartphone, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { onRealtimeEvent } from '../api/realtime';
import type { AppSettings } from '../api/types';
import { Button, Card, CardHeader, Field, Input, LoadingBlock, Select, Textarea, Toggle, useToast } from '../components/ui';

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
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label="New password" hint="At least 8 characters. Leave empty to keep it.">
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password" error={changingPassword && !passwordsMatch ? 'The passwords do not match' : undefined}>
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
        </Field>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line-soft px-5 py-4">
        <p className="text-[13px] text-muted">Saving signs you out so you can sign in with the new details.</p>
        <Button icon={KeyRound} onClick={save} loading={saving} disabled={!canSave}>
          Update login
        </Button>
      </div>
    </Card>
  );
}

export default function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [form, setForm] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

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

  if (!settings || !form) return <Card><LoadingBlock label="Loading settings…" /></Card>;

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      // Banners, help, policies and checkout copy have their own pages; this form never sends them.
      const { faqs: _faqs, legalDocs: _legal, purchaseTerms: _terms, homeBanners: _banners, ...fields } = form;
      const updated = await api.updateSettings(fields);
      setSettings(updated);
      setForm(updated);
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
                <CreditCard size={16} className="text-brand" />
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
        </div>
      </Card>

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
