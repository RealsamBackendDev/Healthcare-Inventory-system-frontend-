import { X } from 'lucide-react';

export default function Drawer({ open, onClose, title, subtitle, children }) {
  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-primary-900/40 backdrop-blur-sm transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-lift transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-start gap-3 border-b border-sand-200 px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold tracking-tight text-primary-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-primary-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-lg p-1.5 text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      </aside>
    </>
  );
}
