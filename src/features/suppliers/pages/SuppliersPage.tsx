import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  Badge, Button, EmptyState, ErrorNotice, Field, Input, Modal, PageHeader, Spinner, Table, Textarea,
} from '@/components/ui';
import { errorMessage } from '@/lib/format';
import type { Supplier } from '@/lib/types';
import { useSaveSupplier, useSuppliers } from '../api';

function SupplierForm({ supplier, onDone }: { supplier?: Supplier; onDone: () => void }) {
  const save = useSaveSupplier();
  const [f, setF] = useState({
    name: supplier?.name ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    notes: supplier?.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate(
      {
        ...(supplier ? { id: supplier.id } : {}),
        body: { name: f.name.trim(), phone: f.phone.trim() || null, email: f.email.trim() || null, notes: f.notes.trim() || null },
      },
      { onSuccess: onDone, onError: (err) => setError(errorMessage(err)) },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Name">{(p) => <Input {...p} required maxLength={120} autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone">{(p) => <Input {...p} type="tel" maxLength={40} value={f.phone} onChange={(e) => set('phone', e.target.value)} />}</Field>
        <Field label="Email">{(p) => <Input {...p} type="email" maxLength={254} value={f.email} onChange={(e) => set('email', e.target.value)} />}</Field>
      </div>
      <Field label="Notes">{(p) => <Textarea {...p} maxLength={500} value={f.notes} onChange={(e) => set('notes', e.target.value)} />}</Field>
      {error && <ErrorNotice message={error} />}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={save.isPending}>Save</Button>
      </div>
    </form>
  );
}

export function SuppliersPage() {
  const suppliers = useSuppliers(true);
  const toggle = useSaveSupplier();
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Who you buy stock from."
        actions={<Button onClick={() => setEditing('new')}><Plus /> New supplier</Button>}
      />
      {suppliers.isPending ? (
        <Spinner />
      ) : suppliers.isError ? (
        <ErrorNotice message={errorMessage(suppliers.error)} onRetry={() => void suppliers.refetch()} />
      ) : suppliers.data.length === 0 ? (
        <EmptyState title="No suppliers yet">Add the people you buy from so purchases can be recorded against them.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Email</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {suppliers.data.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.name}</td>
                <td>{s.phone ?? '—'}</td>
                <td>{s.email ?? '—'}</td>
                <td>{s.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</td>
                <td className="flex justify-end gap-2">
                  <Button variant="outline" className="min-h-9" onClick={() => setEditing(s)}>Edit</Button>
                  <Button variant="outline" className="min-h-9" onClick={() => toggle.mutate({ id: s.id, body: { active: !s.active } })}>
                    {s.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New supplier' : 'Edit supplier'}>
        {editing !== null && <SupplierForm key={editing === 'new' ? 'new' : editing.id} {...(editing === 'new' ? {} : { supplier: editing })} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
