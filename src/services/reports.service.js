import { BASE_URL, ApiError, get, getStoredSession } from './api.js';

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
              search.set(key, value);
                  }
                    });
                      const query = search.toString();
                        return query ? `?${query}` : '';
                        };

                        export const getReportOptions = () => get('/reports/options');

                        export const runReport = (reportKey, params) =>
                          get(`/reports/${reportKey}${buildQuery(params)}`);

                          export const downloadReport = async (reportKey, params, format) => {
                            const session = getStoredSession();
                              const response = await fetch(
                                  `${BASE_URL}/reports/${reportKey}${buildQuery({ ...params, format })}`,
                                      {
                                            headers: {
                                                    Authorization: session?.token ? `Bearer ${session.token}` : '',
                                                            Accept: '*/*'
                                                                  }
                                                                      }
                                                                        );

                                                                          if (!response.ok) {
                                                                              let message = 'The report could not be downloaded.';
                                                                                  try {
                                                                                        const payload = await response.json();
                                                                                              message = payload?.error?.message || message;
                                                                                                  } catch (error) {
                                                                                                        message = message;
                                                                                                            }
                                                                                                                throw new ApiError(message, { status: response.status, code: 'REPORT_DOWNLOAD_FAILED' });
                                                                                                                  }

                                                                                                                    return response.blob();
                                                                                                                    };

                                                                                                                    export const fileExtension = (format) => (format === 'excel' ? 'xlsx' : format);