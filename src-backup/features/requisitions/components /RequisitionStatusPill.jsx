const styles = {
      draft: 'border-sand-300 bg-sand-100 text-primary-600',
        pending_approval: 'border-amber-200 bg-amber-50 text-amber-700',
          approved: 'border-leaf-200 bg-leaf-50 text-primary-700',
            rejected: 'border-maroon-200 bg-maroon-50 text-maroon-600',
              cancelled: 'border-sand-300 bg-white text-primary-500',
                closed: 'border-primary-200 bg-primary-50 text-primary-700'
                };

                const labels = {
                  draft: 'Draft',
                    pending_approval: 'Pending approval',
                      approved: 'Approved',
                        rejected: 'Rejected',
                          cancelled: 'Cancelled',
                            closed: 'Closed'
                            };

                            export default function RequisitionStatusPill({ status }) {
                              return (
                                  <span
                                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                                                styles[status] || 'border-sand-200 bg-sand-50 text-primary-600'
                                                      }`}
                                                          >
                                                                {labels[status] || status}
                                                                    </span>
                                                                      );
                                                                      }
}