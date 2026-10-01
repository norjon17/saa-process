import { Button, Drawer, Select, Stack, Switch, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';

import { ID_NO_RE, USER_ROLES, type UserRole } from '@shared/domain';

import fd from '@/components/ui/formDrawer.module.css';
import type { User } from '@/lib/api/types';
import { useIsMobile } from '@/lib/useIsMobile';

import { usePatchUser } from '../api';

const roleData = USER_ROLES.map((r) => ({ value: r, label: r.toUpperCase() }));

/** Right-hand drawer editing one user (full-screen on phones); sends only the fields that changed. */
export function UserEditDrawer({ user, onClose }: { user: User | null; onClose: () => void }) {
  const isMobile = useIsMobile();
  return (
    <Drawer opened={user !== null} onClose={onClose} title={user ? `Edit user · ${user.name}` : 'Edit user'} position="right" size={isMobile ? '100%' : 'md'} padding="md">
      {user && <UserEditForm key={user.id} user={user} onClose={onClose} size={isMobile ? 'md' : 'sm'} />}
    </Drawer>
  );
}

interface Values {
  idNo: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

function UserEditForm({ user, onClose, size }: { user: User; onClose: () => void; size: 'sm' | 'md' }) {
  const patch = usePatchUser();
  const form = useForm<Values>({
    initialValues: { idNo: user.idNo, name: user.name, role: user.role, isActive: user.isActive },
    validate: {
      idNo: (v) => (ID_NO_RE.test(v.trim()) ? null : 'ID number must be exactly 4 digits'),
      name: (v) => (v.trim() ? null : 'Name is required'),
    },
    transformValues: (v) => ({ ...v, idNo: v.idNo.trim(), name: v.name.trim() }),
  });

  const submit = form.onSubmit((values) => {
    const changed: Partial<Values> = {};
    if (values.idNo !== user.idNo) changed.idNo = values.idNo;
    if (values.name !== user.name) changed.name = values.name;
    if (values.role !== user.role) changed.role = values.role;
    if (values.isActive !== user.isActive) changed.isActive = values.isActive;
    if (Object.keys(changed).length === 0) {
      onClose();
      return;
    }
    patch.mutate({ id: user.id, patch: changed }, { onSuccess: onClose });
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="sm">
        <TextInput size={size} label="ID number" placeholder="4 digits" maxLength={4} inputMode="numeric" pattern="[0-9]*" withAsterisk data-autofocus {...form.getInputProps('idNo')} />
        <TextInput size={size} label="Name" withAsterisk {...form.getInputProps('name')} />
        <Select size={size} label="Role" data={roleData} allowDeselect={false} withAsterisk comboboxProps={{ withinPortal: true }} {...form.getInputProps('role')} />
        <Switch size={size} label="Active" {...form.getInputProps('isActive', { type: 'checkbox' })} />
        <div className={fd.footer}>
          <Button variant="default" onClick={onClose} disabled={patch.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={patch.isPending}>
            Save
          </Button>
        </div>
      </Stack>
    </form>
  );
}
