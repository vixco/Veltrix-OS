// Veltrix OS logo. Rendered from the favicon pack in /public so the same
// mark is used in the app UI, the browser tab, and the install manifest.
export function ClaudeLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/android-chrome-192x192.png"
      alt="Veltrix OS"
      className={className}
      draggable={false}
    />
  );
}
