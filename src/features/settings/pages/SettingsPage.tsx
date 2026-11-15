import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/app/store/auth';
import { Button, Card, ErrorNotice, Field, Input, PageHeader, Spinner, Textarea } from '@/components/ui';
import { changePasswordRequest } from '@/features/auth/api';
import { errorMessage } from '@/lib/format';
import type { BusinessProfile } from '@/lib/types';
import { useBusinessProfile, useUpdateProfile } from '../api';

function ProfileForm({ profile }: { profile: BusinessProfile }) {
  const update = useUpdateProfile();
  const [f, setF] = useState({
    name: profile.name, phone: profile.phone ?? '', address: profile.address ?? '', receiptFooter: profile.receiptFooter ?? '',
  });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  function submit(e: FormEvent) {
    e.preventDefault();
    update.mutate(
      { name: f.name.trim(), phone: f.phone.trim() || null, address: f.address.trim() || null, receiptFooter: f.receiptFooter.trim() || null },
      { onSuccess: () => toast.success('Business details saved') },
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Business name">{(p) => <Input {...p} required maxLength={100} value={f.name} onChange={(e) => set('name', e.target.value)} />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone">{(p) => <Input {...p} type="tel" maxLength={40} value={f.phone} onChange={(e) => set('phone', e.target.value)} />}</Field>
        <Field label="Address">{(p) => <Input {...p} maxLength={200} value={f.address} onChange={(e) => set('address', e.target.value)} />}</Field>
      </div>
      <Field label="Receipt footer" hint="Printed at the bottom of every receipt">{(p) => <Textarea {...p} maxLength={200} value={f.receiptFooter} onChange={(e) => set('receiptFooter', e.target.value)} />}</Field>
      {update.isError && <ErrorNotice message={errorMessage(update.error)} />}
      <div><Button type="submit" disabled={update.isPending}>Save</Button></div>
    </form>
  );
}

function PasswordForm() {
  const clear = useAuthStore((s) => s.clear);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await changePasswordRequest(cur, next);
      toast.success('Password changed. Please sign in again.');
      clear(); // the server ended every session
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Current password">{(p) => <Input {...p} type="password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} />}</Field>
      <Field label="New password" hint="At least 8 characters">{(p) => <Input {...p} type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />}</Field>
      {error && <ErrorNotice message={error} />}
      <div><Button type="submit" disabled={busy}>Change password</Button></div>
    </form>
  );
}

export function SettingsPage() {
  const profile = useBusinessProfile();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-2xl gap-5">
        <Card>
          <h2 className="mb-3 font-semibold">Business details</h2>
          {profile.isPending ? <Spinner /> : profile.isError ? <ErrorNotice message={errorMessage(profile.error)} /> : (
            <ProfileForm key={profile.data.id} profile={profile.data} />
          )}
          {profile.data && <p className="mt-3 text-xs text-muted-foreground">Currency {profile.data.currency} · Timezone {profile.data.timezone}</p>}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Your password</h2>
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
