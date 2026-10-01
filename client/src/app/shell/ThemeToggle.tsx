import { useMantineColorScheme } from '@mantine/core';

import classes from './shell.module.css';

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const night = colorScheme === 'dark';
  return (
    <div
      className={classes.pill}
      role="switch"
      aria-checked={night}
      aria-label="Day / Night theme"
      tabIndex={0}
      onClick={() => setColorScheme(night ? 'light' : 'dark')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setColorScheme(night ? 'light' : 'dark');
        }
      }}
    >
      <div className={`${classes.pillSeg} ${night ? '' : classes.pillSegOn}`}>☀️</div>
      <div className={classes.pillDiv} />
      <div className={`${classes.pillSeg} ${night ? classes.pillSegOn : ''}`}>🌙</div>
    </div>
  );
}
