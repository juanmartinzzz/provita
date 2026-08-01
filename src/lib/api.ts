/**
 * Local Vite hits the production Worker.
 * Deployed SPA uses same-origin `/api` (empty base).
 */
const base =
	(import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
	"";

export function apiUrl(path: string): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return `${base}${normalized}`;
}

export class ApiError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

async function parseError(response: Response, path: string): Promise<ApiError> {
	try {
		const data = (await response.json()) as { error?: string };
		return new ApiError(
			response.status,
			data.error ?? `API ${response.status}: ${path}`,
		);
	} catch {
		return new ApiError(response.status, `API ${response.status}: ${path}`);
	}
}

export async function apiGet<T>(path: string): Promise<T> {
	const response = await fetch(apiUrl(path), {
		credentials: "include",
	});
	if (!response.ok) throw await parseError(response, path);
	return response.json() as Promise<T>;
}

export async function apiSend<T>(
	path: string,
	method: "POST" | "PUT" | "PATCH" | "DELETE",
	body?: unknown,
): Promise<T> {
	const response = await fetch(apiUrl(path), {
		method,
		credentials: "include",
		headers: body === undefined ? undefined : { "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (!response.ok) throw await parseError(response, path);
	if (response.status === 204) return undefined as T;
	return response.json() as Promise<T>;
}
