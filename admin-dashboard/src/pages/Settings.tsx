import { Save, Smartphone, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AppSettings } from '../api/types';
import { Button, Card, CardHeader, Field, Input, LoadingBlock, Textarea, Toggle, useToast } from '../components/ui';

export default function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [form, setForm] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        setSettings(s);
        setForm(s);
      })
      .catch((e) => toast('error', e instanceof Error ? e.message : 'Failed to load settings'));
  }, [toast]);

  if (!settings || !form) return <Card><LoadingBlock label="Loading settings…" /></Card>;

  const dirty = JSON.stringify(settings) !== JSON.stringify(form);

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const updated = await api.updateSettings(form);
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
          <div className="grid grid-cols-2 gap-4">
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
        <div className="grid grid-cols-2 gap-4 p-5">
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
                  The app shows a maintenance screen and blocks new purchases while this is on.
                </p>
              </div>
            </div>
            <Toggle checked={form.maintenanceMode} onChange={(v) => set('maintenanceMode', v)} label="Maintenance mode" />
          </div>
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                <Smartphone size={16} className="text-brand-ink" />
              </div>
              <div>
                <p className="text-sm font-semibold">Minimum app version</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                  Older builds are asked to update. Leave empty for no gate (e.g. “1.2.0”).
                </p>
              </div>
            </div>
            <Input value={form.minAppVersion} onChange={(e) => set('minAppVersion', e.target.value)} placeholder="1.0.0" className="w-32" />
          </div>
        </div>
      </Card>

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
