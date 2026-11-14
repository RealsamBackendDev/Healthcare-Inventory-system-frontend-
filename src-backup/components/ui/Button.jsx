import { Loader2 } from 'lucide-react';

const variants = {
  primary:
      'bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus-visible:ring-primary-300',
        accent:
            'bg-leaf-500 text-white shadow-sm hover:bg-leaf-600 focus-visible:ring-leaf-300',
              danger:
                  'bg-maroon-600 text-white shadow-sm hover:bg-maroon-700 focus-visible:ring-maroon-300',
                    outline:
                        'border border-sand-300 bg-white text-primary-800 hover:border-primary-300 hover:bg-primary-50 focus-visible:ring-leaf-200',
                          ghost: 'text-primary-700 hover:bg-primary-50 focus-visible:ring-leaf-200'
                          };

                          const sizes = {
                            sm: 'h-9 gap-1.5 px-3 text-sm',
                              md: 'h-11 gap-2 px-4 text-sm',
                                lg: 'h-12 gap-2 px-5 text-base'
                                };

                                export default function Button({
                                  variant = 'primary',
                                    size = 'md',
                                      type = 'button',
                                        loading = false,
                                          disabled = false,
                                            className = '',
                                              children,
                                                ...props
                                                }) {
                                                  return (
                                                      <button
                                                            type={type}
                                                                  disabled={disabled || loading}
                                                                        className={`inline-flex items-center justify-center rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
                                                                              {...props}
                                                                                  >
                                                                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                                                                              {children}
                                                                                                  </button>
                                                                                                    );
                                                                                                    }