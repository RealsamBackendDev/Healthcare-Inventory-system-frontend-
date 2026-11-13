const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');

const SESSION_KEY = 'hcis.session';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'REQUEST_FAILED', details = null } = {}) {
      super(message);
          this.name = 'ApiError';
              this.status = status;
                  this.code = code;
                      this.details = details;
                        }
                        }

                        export const getStoredSession = () => {
                          try {
                              const raw = window.localStorage.getItem(SESSION_KEY);
                                  return raw ? JSON.parse(raw) : null;
                                    } catch (error) {
                                        return null;
                                          }
                                          };

                                          export const storeSession = (session) => {
                                            window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
                                            };

                                            export const clearStoredSession = () => {
                                              window.localStorage.removeItem(SESSION_KEY);
                                              };

                                              const parseBody = async (response) => {
                                                const contentType = response.headers.get('content-type') || '';
                                                  if (!contentType.includes('application/json')) {
                                                      return null;
                                                        }
                                                          try {
                                                              return await response.json();
                                                                } catch (error) {
                                                                    return null;
                                                                      }
                                                                      };

                                                                      export const request = async (path, { method = 'GET', body, headers = {}, signal } = {}) => {
                                                                        const session = getStoredSession();
                                                                          const requestHeaders = { Accept: 'application/json', ...headers };
                                                                            const options = { method, headers: requestHeaders, signal };

                                                                              if (body !== undefined) {
                                                                                  requestHeaders['Content-Type'] = 'application/json';
                                                                                      options.body = JSON.stringify(body);
                                                                                        }

                                                                                          if (session?.token) {
                                                                                              requestHeaders.Authorization = `Bearer ${session.token}`;
                                                                                                }

                                                                                                  let response;
                                                                                                    try {
                                                                                                        response = await fetch(`${BASE_URL}${path}`, options);
                                                                                                          } catch (error) {
                                                                                                              if (error.name === 'AbortError') {
                                                                                                                    throw error;
                                                                                                                        }
                                                                                                                            throw new ApiError('Cannot reach the server. Check that the API is running and try again.', {
                                                                                                                                  code: 'NETWORK_ERROR'
                                                                                                                                      });
                                                                                                                                        }

                                                                                                                                          const payload = await parseBody(response);

                                                                                                                                            if (!response.ok || payload?.success === false) {
                                                                                                                                                const details = payload?.error || {};
                                                                                                                                                    if (response.status === 401 && session?.token) {
                                                                                                                                                          clearStoredSession();
                                                                                                                                                                window.dispatchEvent(new Event('hcis:session-expired'));
                                                                                                                                                                    }
                                                                                                                                                                        throw new ApiError(details.message || 'The request could not be completed.', {
                                                                                                                                                                              status: response.status,
                                                                                                                                                                                    code: details.code || 'REQUEST_FAILED',
                                                                                                                                                                                          details: details.details || null
                                                                                                                                                                                              });
                                                                                                                                                                                                }

                                                                                                                                                                                                  return payload?.data ?? null;
                                                                                                                                                                                                  };

                                                                                                                                                                                                  export const get = (path, options) => request(path, { ...options, method: 'GET' });

                                                                                                                                                                                                  export const post = (path, body, options) => request(path, { ...options, method: 'POST', body });

                                                                                                                                                                                                  export const patch = (path, body, options) => request(path, { ...options, method: 'PATCH', body });

                                                                                                                                                                                                  export const put = (path, body, options) => request(path, { ...options, method: 'PUT', body });

                                                                                                                                                                                                  export const remove = (path, options) => request(path, { ...options, method: 'DELETE' });

                                                                                                                                                                                                  export { BASE_URL, SESSION_KEY };