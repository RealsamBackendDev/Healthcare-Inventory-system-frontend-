const styleFor = (days) => {
  if (days === null || days === undefined) {
    return 'border-sand-300 bg-white text-primary-500';
  }
  if (days < 0) {
    return 'border-maroon-200 bg-maroon-50 text-maroon-600';
  }
  if (days <= 7) {
    return 'border-maroon-200 bg-maroon-50 text-maroon-600';
  }
  if (days <= 30) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  return 'border-leaf-200 bg-leaf-50 text-primary-700';
};

const labelFor = (days) => {
  if (days === null || days === undefined) {
    return 'No expiry';
  }
  if (days < 0) {
    return `${Math.abs(days)}d ago`;
  }
  if (days === 0) {
    return 'Today';
  }
  return `${days}d left`;
};

export default function ExpiryBadge({ days }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styleFor(
        days
      )}`}
    >
      {labelFor(days)}
    </span>
  );
}
