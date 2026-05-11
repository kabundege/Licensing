import { auth } from "@/auth";
import { getApiBaseUrl } from "@/lib/api-url";

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) {
    throw new Error(`Unauthorized`);
  }
  const base = getApiBaseUrl();
  const normalized = path.startsWith(`/`) ? path : `/${path}`;
  const url = `${base}${normalized}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": `application/json`,
      ...(init?.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
    cache: `no-store`,
  });
}
