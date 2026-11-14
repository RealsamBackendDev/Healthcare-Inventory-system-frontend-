import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function DataPanel({
  title,
    subtitle,
      actionLabel,
        actionTo,
          emptyMessage,
            isEmpty = false,
              children
              }) {
                return (
                    <section className="surface flex h-full flex-col">
                          <header className="flex items-start justify-between gap-3 border-b border-sand-200 px-4 py-3.5 sm:px-5">
                                  <div>
                                            <h2 className="text-sm font-bold tracking-tight text-primary-900">{title}</h2>
                                                      {subtitle ? <p className="mt-0.5 text-xs text-primary-500">{subtitle}</p> : null}
                                                              </div>
                                                                      {actionTo ? (
                                                                                <Link
                                                                                            to={actionTo}
                                                                                                        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary-600 transition hover:bg-primary-50"
                                                                                                                  >
                                                                                                                              {actionLabel || 'All'}
                                                                                                                                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                                                                                                                                    </Link>
                                                                                                                                                            ) : null}
                                                                                                                                                                  </header>

                                                                                                                                                                        {isEmpty ? (
                                                                                                                                                                                <p className="px-4 py-10 text-center text-sm text-primary-500 sm:px-5">
                                                                                                                                                                                          {emptyMessage || 'Nothing to show right now.'}
                                                                                                                                                                                                  </p>
                                                                                                                                                                                                        ) : (
                                                                                                                                                                                                                <div className="flex-1">{children}</div>
                                                                                                                                                                                                                      )}
                                                                                                                                                                                                                          </section>
                                                                                                                                                                                                                            );
                                                                                                                                                                                                                            }