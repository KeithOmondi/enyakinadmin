import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  Badge, Button, Confirm, EmptyState, ErrorNotice, Field, Input, Modal, PageHeader, Spinner, Table,
} from '@/components/ui';
import { errorMessage } from '@/lib/format';
import type { Category } from '@/lib/types';
import { useCategories, useDeleteCategory, useSaveCategory } from '../api';

export function CategoriesPage() {
  const categories = useCategories(true);
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function open(c: Category | 'new') {
    setName(c === 'new' ? '' : c.name);
    setError(null);
    setEditing(c);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const id = editing && editing !== 'new' ? editing.id : undefined;
    save.mutate(
      { ...(id ? { id } : {}), name: name.trim() },
      { onSuccess: () => setEditing(null), onError: (err) => setError(errorMessage(err)) },
    );
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group products so they are easier to find."
        actions={<Button onClick={() => open('new')}><Plus /> New category</Button>}
      />
      {categories.isPending ? (
        <Spinner />
      ) : categories.isError ? (
        <ErrorNotice message={errorMessage(categories.error)} onRetry={() => void categories.refetch()} />
      ) : categories.data.length === 0 ? (
        <EmptyState title="No categories yet">Create one, then assign products to it.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr><th>Name</th><th className="text-right">Products</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {categories.data.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.name}</td>
                <td className="text-right tabular-nums">{c.productCount}</td>
                <td>{c.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</td>
                <td className="flex justify-end gap-2">
                  <Button variant="outline" className="min-h-9" onClick={() => open(c)}>Rename</Button>
                  <Button variant="outline" className="min-h-9" onClick={() => save.mutate({ id: c.id, active: !c.active })}>
                    {c.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="ghost" className="min-h-9 text-destructive" onClick={() => setDeleting(c)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New category' : 'Rename category'}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Name">{(p) => <Input {...p} required maxLength={80} autoFocus value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          {error && <ErrorNotice message={error} />}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={deleting !== null}
        title="Delete category"
        message={`Delete "${deleting?.name}"? A category that has products cannot be deleted; deactivate it instead.`}
        confirmLabel="Delete"
        busy={remove.isPending}
        error={remove.isError ? errorMessage(remove.error) : null}
        onClose={() => { setDeleting(null); remove.reset(); }}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  );
}
