import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/app/AuthGate';
import {
  Badge, Button, Confirm, ErrorNotice, Field, Input, Modal, PageHeader, Select, Spinner, Table,
} from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage, titleCase } from '@/lib/format';
import type { Member } from '@/lib/types';

function useMembers() {
  return useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<{ items: Member[] }>('/users')).data.items });
}

function AddUserForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'shop_manager' });
  const [error, setError] = useState<string | null>(null);
  const add = useMutation({
    mutationFn: async () => (await api.post('/users', { ...f, email: f.email.trim(), name: f.name.trim() })).data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User added'); onDone(); },
    onError: (e) => setError(errorMessage(e)),
  });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); setError(null); add.mutate(); }} className="flex flex-col gap-4">
      <Field label="Full name">{(p) => <Input {...p} required maxLength={100} autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} />}</Field>
      <Field label="Email">{(p) => <Input {...p} type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} />}</Field>
      <Field label="Temporary password" hint="At least 8 characters. Tell them to change it after signing in. Ignored if this email already has an account.">
        {(p) => <Input {...p} type="text" autoComplete="off" required minLength={8} value={f.password} onChange={(e) => set('password', e.target.value)} />}
      </Field>
      <Field label="Role" hint="Shop managers sell and manage stock. Admins can also change products, prices, users and see reports.">
        {(p) => <Select {...p} value={f.role} onChange={(e) => set('role', e.target.value)}><option value="shop_manager">Shop manager</option><option value="admin">Admin</option></Select>}
      </Field>
      {error && <ErrorNotice message={error} />}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={onDone}>Cancel</Button><Button type="submit" disabled={add.isPending}>Add user</Button></div>
    </form>
  );
}

function ResetPasswordForm({ member, onDone }: { member: Member; onDone: () => void }) {
  const [pw, setPw] = useState('');
  const reset = useMutation({
    mutationFn: async () => void (await api.post(`/users/${member.id}/reset-password`, { newPassword: pw })),
    onSuccess: () => { toast.success(`Password reset for ${member.name}. They are signed out everywhere.`); onDone(); },
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); reset.mutate(); }} className="flex flex-col gap-4">
      <Field label={`New password for ${member.name}`}>{(p) => <Input {...p} type="text" autoComplete="off" required minLength={8} autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />}</Field>
      {reset.isError && <ErrorNotice message={errorMessage(reset.error)} />}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={onDone}>Cancel</Button><Button type="submit" disabled={reset.isPending}>Reset password</Button></div>
    </form>
  );
}

export function UsersPage() {
  const { me } = useSession();
  const qc = useQueryClient();
  const members = useMembers();
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const changeRole = useMutation({
    mutationFn: async (v: { id: string; role: string }) => void (await api.patch(`/users/${v.id}`, { role: v.role })),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => void (await api.delete(`/users/${id}`)),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['users'] }); setRemoving(null); },
  });

  return (
    <>
      <PageHeader title="Users" description="People who can sign in to this business." actions={<Button onClick={() => setAdding(true)}><Plus /> Add user</Button>} />
      {members.isPending ? <Spinner /> : members.isError ? (
        <ErrorNotice message={errorMessage(members.error)} onRetry={() => void members.refetch()} />
      ) : (
        <Table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {members.data.map((m) => {
              const self = m.id === me.user.id;
              return (
                <tr key={m.id}>
                  <td className="font-medium">{m.name} {self && <Badge>You</Badge>}</td>
                  <td>{m.email}</td>
                  <td>
                    {self ? titleCase(m.role) : (
                      <Select aria-label={`Role of ${m.name}`} className="min-h-9 w-auto" value={m.role} onChange={(e) => changeRole.mutate({ id: m.id, role: e.target.value })}>
                        <option value="shop_manager">Shop manager</option><option value="admin">Admin</option>
                      </Select>
                    )}
                  </td>
                  <td className="flex justify-end gap-2">
                    <Button variant="outline" className="min-h-9" onClick={() => setResetting(m)}>Reset password</Button>
                    {!self && <Button variant="ghost" className="min-h-9 text-destructive" onClick={() => setRemoving(m)}>Remove</Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add user">{adding && <AddUserForm onDone={() => setAdding(false)} />}</Modal>
      <Modal open={resetting !== null} onClose={() => setResetting(null)} title="Reset password">{resetting && <ResetPasswordForm member={resetting} onDone={() => setResetting(null)} />}</Modal>
      <Confirm
        open={removing !== null}
        title="Remove user"
        message={`Remove ${removing?.name} from this business? They lose access immediately. Their past sales stay on record.`}
        confirmLabel="Remove"
        busy={remove.isPending}
        error={remove.isError ? errorMessage(remove.error) : null}
        onClose={() => { setRemoving(null); remove.reset(); }}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </>
  );
}
