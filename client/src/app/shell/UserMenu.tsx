import { Avatar, Badge, Group, Menu, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconLogout } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';

import { useLogout } from '@/features/auth/api';
import { initials } from '@/lib/format';
import { useCurrentUser } from '@/stores/session.store';

const roleColor = { tech: 'blue', ee: 'teal', admin: 'orange' } as const;

/** `compact` (phones): avatar only; the name and ID stay in the dropdown label. */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const user = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <Menu shadow="md" width={220} position="bottom-end">
      <Menu.Target>
        <UnstyledButton style={{ color: '#fff' }} aria-label={`Account: ${user.name}`}>
          <Group gap={8} wrap="nowrap">
            <Avatar radius="xl" size={30} variant="gradient" gradient={{ from: 'brand', to: 'aqua' }}>
              {initials(user.name)}
            </Avatar>
            {!compact && (
              <div style={{ lineHeight: 1.1 }}>
                <Text size="xs" fw={800} c="white">
                  {user.name}
                </Text>
                <Text size="xs" c="rgba(255,255,255,.55)" style={{ fontSize: '0.58rem' }}>
                  ID {user.idNo}
                </Text>
              </div>
            )}
            {!compact && <IconChevronDown size={14} style={{ opacity: 0.7 }} />}
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          <Group justify="space-between">
            <span>
              {user.name} · ID {user.idNo}
            </span>
            <Badge size="xs" color={roleColor[user.role]}>
              {user.role}
            </Badge>
          </Group>
        </Menu.Label>
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconLogout size={14} />}
          onClick={() => logout.mutate(undefined, { onSettled: () => void navigate({ to: '/login', search: { redirect: undefined } }) })}
        >
          Log out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
