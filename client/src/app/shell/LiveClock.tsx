import { useEffect, useState } from 'react';

import { SHIFT_COLORS } from '@/theme/colors';
import { currentShift, formatLongDate, pad2, plantClock, weekdayOf } from '@/lib/time';

import classes from './shell.module.css';

export function LiveClock() {
  const [now, setNow] = useState(() => plantClock());
  useEffect(() => {
    const id = setInterval(() => setNow(plantClock()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={classes.clock} title="Asia/Manila">
      <div className={`${classes.clockTime} saa-gradient-text`}>
        {pad2(now.hour)}:{pad2(now.minute)}:{pad2(now.second)}
      </div>
      <div>
        <div className={classes.clockDate}>{formatLongDate(now.date)}</div>
        <div className={classes.clockDay}>{weekdayOf(now.date)}</div>
      </div>
    </div>
  );
}

export function ShiftBadge() {
  const [shift, setShift] = useState(() => currentShift());
  useEffect(() => {
    const id = setInterval(() => setShift(currentShift()), 15_000);
    return () => clearInterval(id);
  }, []);
  const c = SHIFT_COLORS[shift];
  return (
    <div className={classes.shift}>
      <span className={classes.shiftDot} style={{ background: c.dot, boxShadow: `0 0 8px ${c.dot}, 0 0 18px ${c.bg}` }} />
      <span className={classes.shiftBadge} style={{ background: c.bg, color: c.text, borderColor: c.border }}>
        {shift === 'DS' ? 'Day Shift' : 'Night Shift'}
      </span>
    </div>
  );
}
