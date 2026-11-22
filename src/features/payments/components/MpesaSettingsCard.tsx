import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Badge, Button, Card, ErrorNotice, Field, Input, Select, Spinner } from '@/components/ui';
import { errorMessage, fmtDateTime } from '@/lib/format';
import {
  isFinal, useMpesaSettings, useMpesaStatus, useRemoveMpesaSettings, useSaveMpesaSettings, useSendPrompt, useTestMpesaSettings,
  type MpesaSettings,
} from '../api';

/** Where this business's M-Pesa money goes, and the Daraja keys that let the till send prompts. */
export function MpesaSettingsCard() {
  const settings = useMpesaSettings();
  if (settings.isPending) return <Spinner />;
  if (settings.isError) return <ErrorNotice message={errorMessage(settings.error)} onRetry={() => void settings.refetch()} />;
  return <SettingsForm s={settings.data} />;
}

function SourceBadge({ s }: { s: MpesaSettings }) {
  if (s.source === 'dashboard') return s.enabled ? <Badge tone="success">Set up here</Badge> : <Badge tone="warning">Switched off</Badge>;
  if (s.source === 'server') return <Badge tone="success">Set on the server</Badge>;
  return <Badge>Not set up</Badge>;
}

function SettingsForm({ s }: { s: MpesaSettings }) {
  const save = useSaveMpesaSettings();
  const remove = useRemoveMpesaSettings();
  const test = useTestMpesaSettings();
  const [enabled, setEnabled] = useState(s.enabled);
  const [type, setType] = useState<'till' | 'paybill'>(s.transactionType);
  const [shortcode, setShortcode] = useState(s.shortcode);
  const [partyB, setPartyB] = useState(s.partyB);
  const [passkey, setPasskey] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const serverOff = s.serverMode !== 'daraja';

  function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    save.mutate(
      {
        enabled,
        transactionType: type,
        shortcode: shortcode.trim(),
        partyB: type === 'till' ? partyB.trim() || null : null,
        ...(passkey.trim() ? { passkey: passkey.trim() } : {}),
        ...(consumerKey.trim() ? { consumerKey: consumerKey.trim(), consumerSecret: consumerSecret.trim() } : {}),
        password,
      },
      {
        onSuccess: () => {
          setPasskey('');
          setConsumerKey('');
          setConsumerSecret('');
          setPassword('');
          toast.success('M-Pesa settings saved');
        },
        onError: (err) => setError(errorMessage(err)),
      },
    );
  }

  function onRemove() {
    if (!password) return setError('Enter your password to remove these settings');
    setError(null);
    remove.mutate(
      { password },
      {
        onSuccess: () => {
          setPassword('');
          toast.success('M-Pesa settings removed');
        },
        onError: (err) => setError(errorMessage(err)),
      },
    );
  }

  return (
    <Card className="mb-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">Connection to Safaricom</h2>
        <SourceBadge s={s} />
        <Badge>{s.environment === 'production' ? 'Live' : 'Sandbox (testing)'}</Badge>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Enter this business&apos;s own Paybill or Till and the keys from its Daraja app, so the till can send payment prompts to customers.
        Keys are stored encrypted and are never shown again after saving.
      </p>

      {serverOff && (
        <p role="alert" className="mb-4 rounded-lg bg-warning/15 p-3 text-sm">
          Payment prompts are switched off on the server, so nothing here takes effect yet. Ask whoever manages the server to set
          <code className="mx-1">MPESA_MODE=daraja</code>.
        </p>
      )}
      {!s.encryptionReady && (
        <p role="alert" className="mb-4 rounded-lg bg-warning/15 p-3 text-sm">
          Saving keys is not enabled yet: the server needs a <code>SETTINGS_ENCRYPTION_KEY</code> first.
        </p>
      )}
      {s.source === 'server' && (
        <p className="mb-4 rounded-lg bg-muted p-3 text-sm">
          This business currently uses settings from the server. Save settings here to take over from them.
        </p>
      )}

      <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2" autoComplete="off">
        <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className="size-4" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Send payment prompts to customers from the till
        </label>

        <Field label="Account type">
          {(p) => (
            <Select {...p} value={type} onChange={(e) => setType(e.target.value as 'till' | 'paybill')}>
              <option value="paybill">Paybill</option>
              <option value="till">Till (Buy Goods)</option>
            </Select>
          )}
        </Field>
        <Field label={type === 'paybill' ? 'Paybill number' : 'Store (head office) number'}>
          {(p) => <Input {...p} inputMode="numeric" required value={shortcode} onChange={(e) => setShortcode(e.target.value)} />}
        </Field>
        {type === 'till' && (
          <Field label="Till number" hint="The number customers pay to. Leave blank if it is the same as the store number.">
            {(p) => <Input {...p} inputMode="numeric" value={partyB} onChange={(e) => setPartyB(e.target.value)} />}
          </Field>
        )}
        <Field
          label="Passkey"
          hint={s.passkeyHint ? `Saved (${s.passkeyHint}). Leave blank to keep it.` : 'Issued by Safaricom for this Paybill or Till.'}
          className={type === 'till' ? '' : 'sm:col-span-2'}
        >
          {(p) => (
            <Input {...p} type="password" autoComplete="new-password" value={passkey} onChange={(e) => setPasskey(e.target.value)} placeholder={s.passkeyHint ?? ''} />
          )}
        </Field>
        <Field
          label="Consumer key"
          hint={
            s.consumerKeyHint
              ? `Saved (${s.consumerKeyHint}). Leave blank to keep it.`
              : s.sharedConsumerAvailable
                ? "Optional: leave blank to use the server's shared Daraja app."
                : 'From your Daraja app.'
          }
        >
          {(p) => (
            <Input {...p} type="password" autoComplete="new-password" value={consumerKey} onChange={(e) => setConsumerKey(e.target.value)} placeholder={s.consumerKeyHint ?? ''} />
          )}
        </Field>
        <Field label="Consumer secret" hint={s.hasConsumerSecret ? 'Saved. Leave blank to keep it.' : 'From your Daraja app.'}>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="new-password"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              required={consumerKey.trim() !== ''}
              placeholder={s.hasConsumerSecret ? '••••••••' : ''}
            />
          )}
        </Field>

        <Field label="Your password" hint="Needed to confirm any change to where payments go." className="sm:col-span-2">
          {(p) => <Input {...p} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>

        {error && (
          <div className="sm:col-span-2">
            <ErrorNotice message={error} />
          </div>
        )}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={save.isPending || !s.encryptionReady}>
            {save.isPending && <Loader2 className="animate-spin" />} Save settings
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={test.isPending || s.source === 'none'}
            onClick={() => {
              setResult(null);
              test.mutate(undefined, { onSuccess: setResult, onError: (err) => setResult({ ok: false, message: errorMessage(err) }) });
            }}
          >
            {test.isPending && <Loader2 className="animate-spin" />} Test connection
          </Button>
          {s.configured && (
            <Button type="button" variant="outline" disabled={remove.isPending} onClick={onRemove}>
              Remove these settings
            </Button>
          )}
        </div>
        {result && (
          <p role="status" className={result.ok ? 'text-sm text-success sm:col-span-2' : 'text-sm text-destructive sm:col-span-2'}>
            {result.message}{' '}
            {result.ok && <span className="text-muted-foreground">This checks the key and secret only. The passkey is checked by the test prompt below.</span>}
          </p>
        )}
        {s.updatedAt && (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Last changed {fmtDateTime(s.updatedAt)}
            {s.updatedByName ? ` by ${s.updatedByName}` : ''}.
          </p>
        )}
      </form>

      {s.source !== 'none' && !serverOff && <TestPrompt />}
    </Card>
  );
}

/** Sends KES 1 to a real phone: the only way to prove the passkey, Paybill and callback all work. */
function TestPrompt() {
  const send = useSendPrompt();
  const [phone, setPhone] = useState('');
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const status = useMpesaStatus(id);
  const state = status.data;

  function go(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setId(null);
    send.mutate(
      { phone, amountCents: 100, requestKey: globalThis.crypto.randomUUID() },
      { onSuccess: (r) => setId(r.id), onError: (err) => setError(errorMessage(err)) },
    );
  }

  return (
    <form onSubmit={go} className="mt-5 border-t border-border pt-4">
      <h3 className="mb-1 text-sm font-semibold">Try it with KES 1</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Sends a real KES 1 prompt to a phone. When the PIN is entered the KES 1 goes to this business&apos;s Paybill or Till.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Phone number" className="min-w-52">
          {(p) => <Input {...p} inputMode="tel" required placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />}
        </Field>
        <Button type="submit" variant="outline" disabled={send.isPending}>
          {send.isPending && <Loader2 className="animate-spin" />} Send KES 1 prompt
        </Button>
      </div>
      {error && (
        <div className="mt-2">
          <ErrorNotice message={error} />
        </div>
      )}
      {state && (
        <p role="status" className="mt-2 text-sm">
          {state.status === 'pending' && 'Waiting for the customer to enter their PIN…'}
          {state.status === 'paid' && <span className="text-success">Paid{state.receipt ? `: receipt ${state.receipt}` : ''}. Everything works.</span>}
          {isFinal(state.status) && state.status !== 'paid' && <span className="text-destructive">{state.resultDesc ?? `Prompt ${state.status}`}</span>}
        </p>
      )}
    </form>
  );
}
