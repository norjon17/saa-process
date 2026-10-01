import { Link } from '@tanstack/react-router';

import classes from './shell.module.css';

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="saaLogoTop" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2168FD" />
          <stop offset="100%" stopColor="#3AE4C9" />
        </linearGradient>
        <linearGradient id="saaLogoDot" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2168FD" />
          <stop offset="100%" stopColor="#3AE4C9" />
        </linearGradient>
        <linearGradient id="saaLogoText" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#003da5" />
          <stop offset="100%" stopColor="#0057c2" />
        </linearGradient>
      </defs>
      <rect width="52" height="52" rx="11" fill="white" />
      <rect x="0" y="0" width="52" height="4" rx="2" fill="url(#saaLogoTop)" />
      <text x="4" y="26" fontFamily="Manrope,Arial,sans-serif" fontWeight="900" fontSize="16" fill="url(#saaLogoText)" letterSpacing="-0.8">
        WD
      </text>
      <line x1="4" y1="29" x2="48" y2="29" stroke="#e2e8f0" strokeWidth=".9" />
      <text x="5" y="41" fontFamily="Manrope,Arial,sans-serif" fontWeight="800" fontSize="8.5" fill="#0057c2" letterSpacing="1.8">
        SAA
      </text>
      <circle cx="44" cy="15" r="4.5" fill="url(#saaLogoDot)" />
      <circle cx="44" cy="15" r="2" fill="rgba(255,255,255,.6)" />
    </svg>
  );
}

export function BrandGroup({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/endorsement" className={classes.brandGroup}>
      <div className={classes.logoWrap}>
        <Logo />
      </div>
      {!compact && (
        <>
          <div className={classes.divider} />
          <div>
            <div className={`${classes.title} saa-gradient-text`}>SAA Process Endorsement</div>
            <div className={classes.subtitle}>Western Digital Corporation · HDD Components</div>
          </div>
        </>
      )}
    </Link>
  );
}
