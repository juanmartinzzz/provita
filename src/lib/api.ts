/**
 * Local Vite hits the production Worker.
 * Deployed SPA uses same-origin `/api` (empty base).
 */
const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function apiUrl(path: string): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return `${base}${normalized}`;
}

export async function apiGet<T>(path: string): Promise<T> {
	const response = await fetch(apiUrl(path));
	if (!response.ok) {
		throw new Error(`API ${response.status}: ${path}`);
	}
	return response.json() as Promise<T>;
}
