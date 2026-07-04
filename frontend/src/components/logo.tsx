export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" role="img" aria-label="Fergie" className={className}>
      <rect x="24" y="18" width="52" height="15" />
      <rect x="24" y="18" width="28" height="64" />
      <rect x="48" y="42" width="24" height="16" />
    </svg>
  );
}
