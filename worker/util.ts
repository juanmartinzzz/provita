import type { Context } from "hono";
import type { Session, SessionUser } from "./auth.ts";

export type AppEnv = {
	Bindings: Env;
	Variables: {
		user: SessionUser | null;
		session: Session | null;
	};
};

export type AppContext = Context<AppEnv>;

export const SUMMARY_MAX_CHARS = 500;
export const DEFAULT_MAX_BULLETS = 5;

export function requireUser(c: AppContext): SessionUser | null {
	return c.get("user");
}

export function newId(prefix: string): string {
	return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function asBool(value: unknown): boolean {
	return value === true || value === 1 || value === "1";
}

export async function readJson<T>(c: AppContext): Promise<T | null> {
	try {
		return (await c.req.json()) as T;
	} catch {
		return null;
	}
}

export function trimOrNull(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function requiredString(value: unknown, field: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`${field} is required`);
	}
	return value.trim();
}

export async function assertJobOwned(
	db: D1Database,
	profileId: string,
	jobId: string,
): Promise<boolean> {
	const row = await db
		.prepare(`SELECT id FROM jobs WHERE id = ? AND profile_id = ?`)
		.bind(jobId, profileId)
		.first();
	return Boolean(row);
}

export async function assertAchievementOwned(
	db: D1Database,
	profileId: string,
	achievementId: string,
): Promise<{ id: string; job_id: string } | null> {
	const row = await db
		.prepare(
			`SELECT a.id, a.job_id
       FROM achievements a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.profile_id = ?`,
		)
		.bind(achievementId, profileId)
		.first<{ id: string; job_id: string }>();
	return row ?? null;
}

export async function assertResumeOwned(
	db: D1Database,
	profileId: string,
	resumeId: string,
): Promise<boolean> {
	const row = await db
		.prepare(`SELECT id FROM resumes WHERE id = ? AND profile_id = ?`)
		.bind(resumeId, profileId)
		.first();
	return Boolean(row);
}

export async function assertSummaryOwned(
	db: D1Database,
	profileId: string,
	summaryId: string,
): Promise<boolean> {
	const row = await db
		.prepare(`SELECT id FROM professional_summaries WHERE id = ? AND profile_id = ?`)
		.bind(summaryId, profileId)
		.first();
	return Boolean(row);
}

export async function nextSortOrder(
	db: D1Database,
	table: "jobs" | "achievements" | "professional_summaries",
	scopeColumn: "profile_id" | "job_id",
	scopeValue: string,
): Promise<number> {
	const row = await db
		.prepare(
			`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
       FROM ${table}
       WHERE ${scopeColumn} = ?`,
		)
		.bind(scopeValue)
		.first<{ next: number }>();
	return row?.next ?? 0;
}
