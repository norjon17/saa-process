import { Button, Group, Switch } from '@mantine/core';
import { IconPencil, IconPlus, IconTags } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { ID_NO_RE, USER_ROLES } from '@shared/domain';

import { DataTable } from '@/components/table/DataTable';
import type { AppColumn, SortSpec } from '@/components/table/types';
import { FormDrawer, type FieldSpec } from '@/components/ui/CrudTablePage';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pill } from '@/components/ui/StatusPill';
import { useUsers } from '@/features/ref/api';
import type { AuditEntity, User } from '@/lib/api/types';
import { formatDateTime } from '@/lib/time';
import { notify } from '@/lib/notify';
import { useIsMobile } from '@/lib/useIsMobile';

import { useCreateUser, usePatchUser, type UserBody } from '../api';
import { ChangeLogButton } from '../change-logs/ChangeLogButton';
import { activeSwitchColumn, CardTitle } from '../mobileColumns';
import { AliasesModal } from './AliasesModal';
import { UserEditDrawer } from './UserEditDrawer';

const AUDIT_ENTITIES: AuditEntity[] = ['user', 'user_alias'];

const ROLE_STYLE: Record<User['role'], { bg: string; fg: string }> = {
  tech: { bg: '#1565c0', fg: '#fff' },
  ee: { bg: '#00695c', fg: '#fff' },
  admin: { bg: '#e65100', fg: '#fff' },
};

const roleOptions = () => USER_ROLES.map((r) => ({ value: r, label: r.toUpperCase(), ...ROLE_STYLE[r] }));

const createFields: FieldSpec[] = [
  { name: 'idNo', label: 'ID number', kind: 'text', required: true, placeholder: '4 digits', validate: (v) => (ID_NO_RE.test(String(v ?? '')) ? null : 'ID number must be exactly 4 digits') },
  { name: 'name', label: 'Name', kind: 'text', required: true },
  { name: 'role', label: 'Role', kind: 'select', options: USER_ROLES.map((r) => ({ value: r, label: r.toUpperCase() })), required: true, initial: 'tech' },
  { name: 'isActive', label: 'Active', kind: 'checkbox', initial: true },
];

export function UsersPage() {
  const users = useUsers(true);
  const patch = usePatchUser();
  const create = useCreateUser();
  const [showInactive, setShowInactive] = useState(false);
  const [sorting, setSorting] = useState<SortSpec[]>([{ id: 'role', desc: false }]);
  const [drawer, setDrawer] = useState(false);
  const [aliasUser, setAliasUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);

  const rows = useMemo(() => (users.data ?? []).filter((u) => showInactive || u.isActive), [users.data, showInactive]);

  const isMobile = useIsMobile();
  const patchUser = patch.mutate;
  const columns = useMemo<AppColumn<User>[]>(() => {
    const actions = (u: User) => (
      <Group gap={isMobile ? 6 : 4} wrap="nowrap" justify={isMobile ? 'flex-end' : undefined}>
        <Button variant={isMobile ? 'light' : 'subtle'} size={isMobile ? 'xs' : 'compact-xs'} leftSection={<IconPencil size={12} />} onClick={() => setEditUser(u)}>
          Edit
        </Button>
        <Button variant={isMobile ? 'light' : 'subtle'} size={isMobile ? 'xs' : 'compact-xs'} leftSection={<IconTags size={12} />} onClick={() => setAliasUser(u)}>
          Aliases
        </Button>
      </Group>
    );
    if (isMobile) {
      // Phone cards: read-only "ID · name" heading (edited in the Edit drawer), role pill + active switch, actions row.
      return [
        { id: 'name', header: 'Name', accessor: (u) => u.name, mobile: 'title', render: (u) => <CardTitle code={u.idNo} text={u.name} /> },
        { id: 'role', header: 'Role', accessor: (u) => u.role, editor: { kind: 'pill', options: roleOptions } },
        activeSwitchColumn<User>((u) => u.name, (u, isActive) => patchUser({ id: u.id, patch: { isActive } })),
        { id: '__aliases', header: '', accessor: () => null, sortable: false, mobile: 'full', render: actions },
      ];
    }
    return [
      { id: 'idNo', header: 'ID No', accessor: (u) => u.idNo, editor: { kind: 'text' }, width: 90 },
      { id: 'name', header: 'Name', accessor: (u) => u.name, editor: { kind: 'text' }, align: 'left', width: 220 },
      { id: 'role', header: 'Role', accessor: (u) => u.role, editor: { kind: 'pill', options: roleOptions }, width: 100 },
      { id: 'isActive', header: 'Active', accessor: (u) => u.isActive, editor: { kind: 'checkbox' }, width: 70 },
      { id: 'updatedAt', header: 'Updated', accessor: (u) => u.updatedAt, render: (u) => <span style={{ color: 'var(--saa-text3)', fontSize: '0.7rem' }}>{formatDateTime(u.updatedAt)}</span>, width: 150 },
      { id: '__aliases', header: '', accessor: () => null, sortable: false, width: 170, render: actions },
    ];
  }, [isMobile, patchUser]);

  const onCellCommit = (u: User, columnId: string, value: unknown) => {
    if (columnId === 'idNo') {
      const idNo = String(value ?? '').trim();
      if (!ID_NO_RE.test(idNo)) {
        notify.error('ID number must be exactly 4 digits', 'Not saved');
        return;
      }
      patch.mutate({ id: u.id, patch: { idNo } });
      return;
    }
    if (columnId === 'name') {
      const name = String(value ?? '').trim();
      if (!name) {
        notify.error('Name is required', 'Not saved');
        return;
      }
      patch.mutate({ id: u.id, patch: { name } });
      return;
    }
    if (columnId === 'role' && (value === 'tech' || value === 'ee' || value === 'admin')) patch.mutate({ id: u.id, patch: { role: value } });
    if (columnId === 'isActive') patch.mutate({ id: u.id, patch: { isActive: !!value } });
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Accounts sign in with their 4-digit ID number. Deactivate instead of deleting so history keeps its author."
        actions={
          <>
            <ChangeLogButton module="Users" entities={AUDIT_ENTITIES} />
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setDrawer(true)}>
              Add user
            </Button>
          </>
        }
        filters={<Switch size={isMobile ? 'sm' : 'xs'} label="Show inactive" checked={showInactive} onChange={(e) => setShowInactive(e.currentTarget.checked)} />}
      />
      <DataTable<User>
        columns={columns}
        data={rows}
        getRowId={(u) => String(u.id)}
        sorting={sorting}
        onSortingChange={setSorting}
        editable
        onCellCommit={onCellCommit}
        rowProps={(u) => (u.isActive ? undefined : { style: { opacity: 0.55 } })}
        stickyHeader
        minWidth={760}
        loading={users.isFetching}
        emptyMessage="No users"
        footer={
          <span style={{ fontSize: '0.7rem', color: 'var(--saa-text3)' }}>
            {rows.length} shown · roles:{' '}
            {USER_ROLES.map((r) => (
              <Pill key={r} style={{ background: ROLE_STYLE[r].bg, color: ROLE_STYLE[r].fg, marginLeft: 4 }}>
                {r.toUpperCase()}
              </Pill>
            ))}
          </span>
        }
      />
      <FormDrawer opened={drawer} onClose={() => setDrawer(false)} title="Add user" fields={createFields} submitLabel="Add user" onSubmit={(v) => create.mutateAsync(v as UserBody)} />
      <AliasesModal user={aliasUser} onClose={() => setAliasUser(null)} />
      <UserEditDrawer user={editUser} onClose={() => setEditUser(null)} />
    </>
  );
}
