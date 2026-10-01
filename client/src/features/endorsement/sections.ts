import { IconActivity, IconAlertCircle, IconBolt, IconRefresh, IconSettings, IconTool, type Icon } from '@tabler/icons-react';

import type { SectionKey } from '@shared/domain';
import { SECTION_KEYS } from '@shared/domain';

/** Tabler icon per board section, in the order the original dashboard rendered them. */
export const SECTION_ICONS: Record<SectionKey, Icon> = {
  s1: IconActivity,
  s2: IconSettings,
  s3: IconRefresh,
  s4: IconBolt,
  s5: IconTool,
  s6: IconAlertCircle,
};

export const asSectionKey = (value: string): SectionKey => ((SECTION_KEYS as readonly string[]).includes(value) ? (value as SectionKey) : 's6');
