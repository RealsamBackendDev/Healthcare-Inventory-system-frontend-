import { useId } from 'react';

export default function Input({
  label,
    name,
      type = 'text',
        error,
          hint,
            rightSlot,
              className = '',
                ...props
                }) {
                  const generatedId = useId();
                    const inputId = name || generatedId;

                      return (
                          <div className={className}>
                                {label ? (
                                        <label className="field-label" htmlFor={inputId}>
                                                  {label}
                                                          </label>
                                                                ) : null}
                                                                      <div className="relative">
                                                                              <input
                                                                                        id={inputId}
                                                                                                  name={name}
                                                                                                            type={type}
                                                                                                                      aria-invalid={error ? 'true' : 'false'}
                                                                                                                                className={`field ${error ? 'border-maroon-400 focus:border-maroon-500 focus:ring-maroon-100' : ''} ${
                                                                                                                                            rightSlot ? 'pr-12' : ''
                                                                                                                                                      }`}
                                                                                                                                                                {...props}
                                                                                                                                                                        />
                                                                                                                                                                                {rightSlot ? (
                                                                                                                                                                                          <div className="absolute inset-y-0 right-1.5 flex items-center">{rightSlot}</div>
                                                                                                                                                                                                  ) : null}
                                                                                                                                                                                                        </div>
                                                                                                                                                                                                              {error ? (
                                                                                                                                                                                                                      <p className="mt-1.5 text-xs font-medium text-maroon-600">{error}</p>
                                                                                                                                                                                                                            ) : hint ? (
                                                                                                                                                                                                                                    <p className="mt-1.5 text-xs text-primary-500">{hint}</p>
                                                                                                                                                                                                                                          ) : null}
                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                );
                                                                                                                                                                                                                                                }