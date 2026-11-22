import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  Badge, Button, Confirm, EmptyState, ErrorNotice, Field, Input, Modal, PageHeader, Select, Spinner, Table,
} from '@/components/ui';
import { categoryTree } from '@/lib/categories';
import { errorMessage } from '@/lib/format';
import type { Category } from '@/lib/types';
import { useCategories, useDeleteCategory, useSaveCategory } from '../api';

type Editing = { mode: 'rename'; category: Category } | { mode: 'new'; parentId: string };

export function CategoriesPage() {
  const categories = useCategories(true);
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const tree = categoryTree(categories.data ?? []);

  function open(e: Editing) {
    setName(e.mode === 'rename' ? e.category.name : '');
    setParentId(e.mode === 'new' ? e.parentId : '');
    setError(null);
    setEditing(e);
  }

  function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!editing) return;
    save.mutate(
      editing.mode === 'rename'
        ? { id: editing.category.id, name: name.trim() }
        : { name: name.trim(), ...(parentId ? { parentId } : {}) },
      { onSuccess: () => setEditing(null), onError: (err) => setError(errorMessage(err)) },
    );
  }

  const row = (c: Category, sub: boolean) => (
    <tr key={c.id}>
      <td className={sub ? 'pl-8' : 'font-medium'}>{sub ? `↳ ${c.name}` : c.name}</td>
      <td className="text-right tabular-nums">{c.productCount}</td>
      <td>{c.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</td>
      <td className="flex flex-wrap justify-end gap-2">
        {!sub && (
          <Button variant="outline" className="min-h-9" onClick={() => open({ mode: 'new', parentId: c.id })}>
            <Plus /> Sub-category
          </Button>
        )}
        <Button variant="outline" className="min-h-9" onClick={() => open({ mode: 'rename', category: c })}>Rename</Button>
        <Button variant="outline" className="min-h-9" onClick={() => save.mutate({ id: c.id, active: !c.active })}>
          {c.active ? 'Deactivate' : 'Activate'}
        </Button>
        <Button variant="ghost" className="min-h-9 text-destructive" onClick={() => setDeleting(c)}>Delete</Button>
      </td>
    </tr>
  );

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group products so they are easier to find. Add sub-categories inside a category, for example T-shirts inside Adults."
        actions={<Button onClick={() => open({ mode: 'new', parentId: '' })}><Plus /> New category</Button>}
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
          <tbody>{tree.flatMap((t) => [row(t, false), ...t.children.map((k) => row(k, true))])}</tbody>
        </Table>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.mode === 'rename' ? 'Rename category' : parentId ? 'New sub-category' : 'New category'}
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Name">{(p) => <Input {...p} required maxLength={80} autoFocus value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          {editing?.mode === 'new' && (
            <Field label="Inside" hint="Leave as 'Top level' for a main category, or pick the category it belongs to.">
              {(p) => (
                <Select {...p} value={parentId} onChange={(e) => setParentId(e.target.value)}>
                  <option value="">Top level</option>
                  {tree.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
            </Field>
          )}
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
        message={`Delete "${deleting?.name}"? A category that has products or sub-categories cannot be deleted; deactivate it instead.`}
        confirmLabel="Delete"
        busy={remove.isPending}
        error={remove.isError ? errorMessage(remove.error) : null}
        onClose={() => { setDeleting(null); remove.reset(); }}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  );
}
