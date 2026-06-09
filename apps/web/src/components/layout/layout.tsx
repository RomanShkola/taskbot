import type { ReactNode } from 'react';

interface LayoutProps {
  title?: string;
  children: ReactNode;
  onBack?: () => void;
  fab?: ReactNode;
}

export function Layout({ title, children, onBack, fab }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--tg-theme-bg-color)]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--tg-theme-secondary-bg-color)] bg-[var(--tg-theme-bg-color)] px-4 py-3">
        {onBack && (
          <button onClick={onBack} className="text-[var(--tg-theme-link-color)] text-lg">
            ←
          </button>
        )}
        {title && (
          <h1 className="text-lg font-semibold text-[var(--tg-theme-text-color)] truncate">
            {title}
          </h1>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">{children}</main>

      {/* FAB */}
      {fab && (
        <div className="fixed bottom-6 right-6 z-40">
          {fab}
        </div>
      )}
    </div>
  );
}
