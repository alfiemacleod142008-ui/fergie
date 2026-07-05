export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" role="img" aria-label="Fergie" className={className}>
      <rect x="26" y="16" width="50" height="15" />
      <rect x="26" y="16" width="15" height="52" />
      <rect x="47" y="41" width="24" height="18" />
      <rect x="21" y="68" width="30" height="16" />
    </svg>
  );
}
