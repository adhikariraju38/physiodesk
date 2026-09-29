// unset means the api shares our origin, which is how it is deployed: one
// project, the backend mounted under /api/v1. locally the two are on separate
// ports and .env.development points at the other one.
const BASE = `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1`;

/**
 * Endpoints that must never trigger a refresh retry.
 *
 * Only the ones that mint or burn tokens. /auth/me deliberately is not here:
 * it is the first call the app makes, and if a 401 there did not refresh, an
 * expired access token would leave the shell spinning forever while the
 * middleware kept waving the user back in on the strength of the session flag.
 */
const NO_REFRESH = ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/logout-all"];

/** Not httpOnly on purpose, so the app can drop it the moment a session dies. */
export function clearSessionFlag(): void {
  document.cookie = "pd_session=; Max-Age=0; path=/";
}

let leaving = false;

/**
 * Give up on the session and send the user to the login page.
 *
 * Any request can be the one that discovers the session is gone, not just
 * /auth/me, so this lives here rather than in the auth context. Returns whether
 * a navigation actually started.
 */
function endSession(): boolean {
  clearSessionFlag();

  if (typeof window === "undefined" || window.location.pathname === "/login") return false;

  if (!leaving) {
    leaving = true;
    // a full navigation, so no stale query cache survives into the next session
    window.location.href = "/login";
  }
  return true;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Only ever one refresh in flight.
 *
 * The api rotates the refresh token on every use and treats a replayed token as
 * a stolen cookie, so two requests refreshing at once would revoke the whole
 * session and bounce the user to the login page for no reason.
 */
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const detail = body?.detail;

    if (typeof detail === "string") return detail;

    // pydantic hands back a list of field errors, the first one is enough
    if (Array.isArray(detail) && detail.length > 0) {
      const [first] = detail;
      const field = Array.isArray(first.loc) ? first.loc.at(-1) : null;
      return field ? `${String(field).replace(/_/g, " ")}: ${first.msg}` : first.msg;
    }
  } catch {
    // no json body, fall through
  }

  return response.status >= 500 ? "Something went wrong on the server" : "Request failed";
}

async function request<T>(path: string, init: RequestInit = {}, canRefresh = true): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    // the tokens live in httponly cookies, so every call has to carry them
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });

  // one silent retry: the access token is short lived, the refresh token is not
  if (response.status === 401 && canRefresh && !NO_REFRESH.includes(path)) {
    if (await refreshSession()) return request<T>(path, init, false);

    // the refresh token is gone too. leave for the login page rather than
    // letting "Not authenticated" surface in whichever table asked.
    if (endSession()) {
      // the browser is already navigating, so never settle. the caller stays on
      // its loading state instead of flashing an error on the way out.
      return new Promise<T>(() => {});
    }
  }

  if (!response.ok) throw new ApiError(response.status, await readError(response));
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

function withBody(method: string) {
  return <T>(path: string, body?: unknown) =>
    request<T>(path, { method, body: JSON.stringify(body ?? {}) });
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: withBody("POST"),
  put: withBody("PUT"),
  patch: withBody("PATCH"),
  delete: <T = void>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function queryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
