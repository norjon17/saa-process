import { Button } from '@mantine/core';
import { IconList } from '@tabler/icons-react';
import { createFileRoute, Link } from '@tanstack/react-router';

import { PageHeader } from '@/components/ui/PageHeader';
import { UploadWizard } from '@/features/meancheck/components/UploadWizard';

export const Route = createFileRoute('/_authed/meancheck/new')({
  component: NewVerdictPage,
});

function NewVerdictPage() {
  return (
    <div>
      <PageHeader
        title="New verdict"
        subtitle="Upload the three CSV files of a lot — the 24 checks are computed on the server and nothing is stored until you save."
        actions={
          <Button component={Link} to="/meancheck" variant="default" size="xs" leftSection={<IconList size={14} />}>
            All lots
          </Button>
        }
      />
      <UploadWizard />
    </div>
  );
}
