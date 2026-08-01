import { Hono } from "hono";
import {
	asBool,
	assertJobOwned,
	newId,
	nextSortOrder,
	readJson,
	requiredString,
	requireUser,
	trimOrNull,
	type AppEnv,
} from "../util.ts";

const jobs = new Hono<AppEnv>();

const EMPLOYMENT_TYPES = new Set(["full_time", "contract", "internship", "part_time"]);

jobs.get("/jobs", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const { results: jobRows } = await c.env.DB.prepare(
		`SELECT id, company, title, location, employment_type, start_date, end_date,
            is_current, summary, sort_order, created_at, updated_at
     FROM jobs
     WHERE profile_id = ?
     ORDER BY sort_order ASC, is_current DESC, start_date DESC`,
	)
		.bind(user.id)
		.all();

	const { results: achievements } = await c.env.DB.prepare(
		`SELECT a.id, a.job_id, a.title, a.description, a.impact_metric, a.tags,
            a.achieved_at, a.sort_order, a.created_at, a.updated_at
     FROM achievements a
     JOIN jobs j ON j.id = a.job_id
     WHERE j.profile_id = ?
     ORDER BY a.sort_order ASC, a.achieved_at DESC`,
	)
		.bind(user.id)
		.all();

	const byJob = new Map<string, typeof achievements>();
	for (const achievement of achievements) {
		const jobId = String(achievement.job_id);
		const list = byJob.get(jobId) ?? [];
		list.push(achievement);
		byJob.set(jobId, list);
	}

	return c.json({
		jobs: jobRows.map((job) => ({
			...job,
			is_current: asBool(job.is_current),
			achievements: byJob.get(String(job.id)) ?? [],
		})),
	});
});

jobs.post("/jobs", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const body = await readJson<Record<string, unknown>>(c);
	if (!body) return c.json({ error: "Invalid JSON" }, 400);

	try {
		const company = requiredString(body.company, "company");
		const title = requiredString(body.title, "title");
		const startDate = requiredString(body.start_date, "start_date");
		const employmentType =
			typeof body.employment_type === "string" && EMPLOYMENT_TYPES.has(body.employment_type)
				? body.employment_type
				: "full_time";
		const location = trimOrNull(body.location);
		const endDate = trimOrNull(body.end_date);
		const summary = trimOrNull(body.summary);
		const isCurrent = asBool(body.is_current);
		const sortOrder = await nextSortOrder(c.env.DB, "jobs", "profile_id", user.id);
		const id = newId("job");

		await c.env.DB.prepare(
			`INSERT INTO jobs (
         id, profile_id, company, title, location, employment_type,
         start_date, end_date, is_current, summary, sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				id,
				user.id,
				company,
				title,
				location,
				employmentType,
				startDate,
				isCurrent ? null : endDate,
				isCurrent ? 1 : 0,
				summary,
				sortOrder,
			)
			.run();

		const job = await c.env.DB.prepare(
			`SELECT id, company, title, location, employment_type, start_date, end_date,
              is_current, summary, sort_order, created_at, updated_at
       FROM jobs WHERE id = ?`,
		)
			.bind(id)
			.first();

		return c.json(
			{ job: { ...job, is_current: asBool(job?.is_current), achievements: [] } },
			201,
		);
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : "Could not create job" },
			400,
		);
	}
});

jobs.patch("/jobs/:id", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const jobId = c.req.param("id");
	if (!(await assertJobOwned(c.env.DB, user.id, jobId))) {
		return c.json({ error: "Job not found" }, 404);
	}

	const body = await readJson<Record<string, unknown>>(c);
	if (!body) return c.json({ error: "Invalid JSON" }, 400);

	try {
		const existing = await c.env.DB.prepare(
			`SELECT company, title, location, employment_type, start_date, end_date,
              is_current, summary, sort_order
       FROM jobs WHERE id = ?`,
		)
			.bind(jobId)
			.first<{
				company: string;
				title: string;
				location: string | null;
				employment_type: string;
				start_date: string;
				end_date: string | null;
				is_current: number;
				summary: string | null;
				sort_order: number;
			}>();

		if (!existing) return c.json({ error: "Job not found" }, 404);

		const company =
			body.company !== undefined
				? requiredString(body.company, "company")
				: existing.company;
		const title =
			body.title !== undefined ? requiredString(body.title, "title") : existing.title;
		const startDate =
			body.start_date !== undefined
				? requiredString(body.start_date, "start_date")
				: existing.start_date;
		const employmentType =
			body.employment_type !== undefined
				? EMPLOYMENT_TYPES.has(String(body.employment_type))
					? String(body.employment_type)
					: existing.employment_type
				: existing.employment_type;
		const location =
			body.location !== undefined ? trimOrNull(body.location) : existing.location;
		const isCurrent =
			body.is_current !== undefined
				? asBool(body.is_current)
				: asBool(existing.is_current);
		const endDate = isCurrent
			? null
			: body.end_date !== undefined
				? trimOrNull(body.end_date)
				: existing.end_date;
		const summary =
			body.summary !== undefined ? trimOrNull(body.summary) : existing.summary;
		const sortOrder =
			typeof body.sort_order === "number" ? body.sort_order : existing.sort_order;

		await c.env.DB.prepare(
			`UPDATE jobs SET
         company = ?, title = ?, location = ?, employment_type = ?,
         start_date = ?, end_date = ?, is_current = ?, summary = ?,
         sort_order = ?, updated_at = datetime('now')
       WHERE id = ?`,
		)
			.bind(
				company,
				title,
				location,
				employmentType,
				startDate,
				endDate,
				isCurrent ? 1 : 0,
				summary,
				sortOrder,
				jobId,
			)
			.run();

		const job = await c.env.DB.prepare(
			`SELECT id, company, title, location, employment_type, start_date, end_date,
              is_current, summary, sort_order, created_at, updated_at
       FROM jobs WHERE id = ?`,
		)
			.bind(jobId)
			.first();

		return c.json({ job: { ...job, is_current: asBool(job?.is_current) } });
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : "Could not update job" },
			400,
		);
	}
});

jobs.put("/jobs/reorder", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const body = await readJson<{ ordered_ids?: string[] }>(c);
	if (!body?.ordered_ids || !Array.isArray(body.ordered_ids)) {
		return c.json({ error: "ordered_ids required" }, 400);
	}

	const statements = body.ordered_ids.map((id, index) =>
		c.env.DB.prepare(
			`UPDATE jobs SET sort_order = ?, updated_at = datetime('now')
       WHERE id = ? AND profile_id = ?`,
		).bind(index, id, user.id),
	);

	if (statements.length > 0) {
		await c.env.DB.batch(statements);
	}

	return c.json({ ok: true });
});

jobs.delete("/jobs/:id", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const jobId = c.req.param("id");
	if (!(await assertJobOwned(c.env.DB, user.id, jobId))) {
		return c.json({ error: "Job not found" }, 404);
	}

	await c.env.DB.prepare(`DELETE FROM jobs WHERE id = ?`).bind(jobId).run();
	return c.json({ ok: true });
});

export default jobs;
