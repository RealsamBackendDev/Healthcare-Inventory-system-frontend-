import { useState } from 'react';

export default function BrandMark({ className = 'h-10 w-10', tone = 'light' }) {
  const [failed, setFailed] = useState(false);
  const background = tone === 'light' ? '#FFFFFF' : '#1B6B38';
  const cross = tone === 'light' ? '#1B6B38' : '#FFFFFF';

  if (!failed) {
    return (
      <img
        src="/logo.png"
        alt="Oyo State Primary Health Care Board"
        onError={() => setFailed(true)}
        className={`${className} shrink-0 object-contain`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Healthcare centre emblem"
      className={`${className} shrink-0`}
    >
      <rect width="48" height="48" rx="14" fill={background} />
      <path
        d="M24 12.5c1.38 0 2.5 1.12 2.5 2.5v6.5H33c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5h-6.5V33c0 1.38-1.12 2.5-2.5 2.5S21.5 34.38 21.5 33v-6.5H15c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5h6.5V15c0-1.38 1.12-2.5 2.5-2.5Z"
        fill={cross}
      />
      <circle cx="36" cy="12" r="4" fill="#C8102E" />
    </svg>
  );
}
