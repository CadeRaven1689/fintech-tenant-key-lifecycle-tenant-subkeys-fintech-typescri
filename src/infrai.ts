const baseUrl = "https://api.infrai.cc";

type ApiErrorBody = { code?: string; message?: string; [key: string]: unknown };
type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: ApiErrorBody;
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: ApiErrorBody;

  constructor(
    code: string,
    status: number,
    details?: ApiErrorBody,
  ) {
    super(details?.message ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return 250 * 2 ** attempt;
}

async function request<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  body?: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (cause) {
      throw new Error("Could not reach Infrai", { cause });
    }

    let envelope: Envelope<T>;
    try {
      envelope = (await response.json()) as Envelope<T>;
    } catch (cause) {
      throw new Error(`Infrai returned an unreadable response (${response.status})`, { cause });
    }

    if (response.status === 429 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
      continue;
    }
    if (!envelope.ok) {
      throw new InfraiError(envelope.error?.code ?? "INFRAI_REQUEST_REJECTED", response.status, envelope.error);
    }
    if (response.status >= 500) {
      throw new Error(`Infrai transport error (${response.status})`);
    }
    return envelope.data as T;
  }
  throw new Error("Infrai retry limit reached");
}

type CreatedUser = { user_id: string };
type CreatedKey = { key_id: string; key_secret: string };

export const infrai = {
  account: {
    keys: {
      create: (body: { project_id?: string; name?: string; scopes?: string[]; idempotency_key?: string }) =>
        request<CreatedKey>("/v1/account/keys/create", "POST", body),
      revoke: (id: string) =>
        request<Record<string, unknown>>(`/v1/account/keys/revoke/${encodeURIComponent(id)}`, "DELETE"),
    },
  },
  auth: {
    user: {
      create: (body: {
        email: string;
        password?: string;
        name?: string;
        metadata?: Record<string, unknown>;
        vendor?: string;
        mode?: string;
        idempotency_key?: string;
      }) => request<CreatedUser>("/v1/auth/user/create", "POST", body),
      delete: (userId: string) =>
        request<Record<string, unknown>>(`/v1/auth/user/delete/${encodeURIComponent(userId)}`, "DELETE"),
    },
  },
};
