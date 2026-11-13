export const formatCurrency = (value) => {
      const amount = Number(value ?? 0);
        if (!Number.isFinite(amount)) {
            return '₦0.00';
              }
                return `₦${amount.toLocaleString('en-NG', {
                    minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                          })}`;
                          };

                          export const formatQuantity = (value) => {
                            const quantity = Number(value ?? 0);
                              if (!Number.isFinite(quantity)) {
                                  return '0';
                                    }
                                      return quantity.toLocaleString('en-NG', { maximumFractionDigits: 3 });
                                      };

                                      export const formatDate = (value) => {
                                        if (!value) {
                                            return '—';
                                              }
                                                const date = new Date(value);
                                                  if (Number.isNaN(date.getTime())) {
                                                      return '—';
                                                        }
                                                          return date.toLocaleDateString('en-GB', {
                                                              day: '2-digit',
                                                                  month: 'short',
                                                                      year: 'numeric'
                                                                        });
                                                                        };

                                                                        export const formatDateTime = (value) => {
                                                                          if (!value) {
                                                                              return '—';
                                                                                }
                                                                                  const date = new Date(value);
                                                                                    if (Number.isNaN(date.getTime())) {
                                                                                        return '—';
                                                                                          }
                                                                                            return `${formatDate(date)} · ${date.toLocaleTimeString('en-GB', {
                                                                                                hour: '2-digit',
                                                                                                    minute: '2-digit'
                                                                                                      })}`;
                                                                                                      };

                                                                                                      export const titleCase = (value) => {
                                                                                                        if (!value) {
                                                                                                            return '';
                                                                                                              }
                                                                                                                return String(value)
                                                                                                                    .replace(/[_-]+/g, ' ')
                                                                                                                        .replace(/\b\w/g, (character) => character.toUpperCase());
                                                                                                                        };

                                                                                                                        export const initialsOf = (name) => {
                                                                                                                          if (!name) {
                                                                                                                              return '?';
                                                                                                                                }
                                                                                                                                  return name
                                                                                                                                      .trim()
                                                                                                                                          .split(/\s+/)
                                                                                                                                              .slice(0, 2)
                                                                                                                                                  .map((part) => part.charAt(0).toUpperCase())
                                                                                                                                                      .join('');
                                                                                                                                                      };
}