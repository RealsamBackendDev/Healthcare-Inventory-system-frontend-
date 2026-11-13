const styles = {
      in_stock: 'border-leaf-200 bg-leaf-50 text-primary-700',
        low_stock: 'border-amber-200 bg-amber-50 text-amber-700',
          out_of_stock: 'border-maroon-200 bg-maroon-50 text-maroon-600'
          };

          const labels = {
            in_stock: 'In stock',
              low_stock: 'Low stock',
                out_of_stock: 'Out of stock'
                };

                export default function StockStatusBadge({ status }) {
                  return (
                      <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                                    styles[status] || 'border-sand-200 bg-sand-100 text-primary-600'
                                          }`}
                                              >
                                                    {labels[status] || status || 'Unknown'}
                                                        </span>
                                                          );
                                                          }
}