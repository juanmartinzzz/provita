import { Hono } from "hono";
import {
	assertAchievementOwned,
	assertJobOwned,
	newId,
	nextSortOrder,
	readJson,
	requiredString,
	requireUser,
	trimOrNull,
	type AppEnv,
} from "../util.ts";

const achievements = new Hono<AppEnv>();

achievements.get("/achievements", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const { results } = await c.env.DB.prepare(
		`SELECT a.id, a.job_id, a.title, a.description, a.impact_metric, a.tags,
            a.achieved_at, a.sort_order, a.created_at, a.updated_at,
            j.company AS job_company, j.title AS job_title
     FROM achievements a
     JOIN jobs j ON j.id = a.job_id
     WHERE j.profile_id = ?
     ORDER BY a.sort_order ASC, a.achieved_at DESC`,
	)
		.bind(user.id)
		.all();

	return c.json({ achievements: results });
});

achievements.post("/achievements", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const body = await readJson<Record<string, unknown>>(c);
	if (!body) return c.json({ error: "Invalid JSON" }, 400);

	try {
		const jobId = requiredString(body.job_id, "job_id");
		if (!(await assertJobOwned(c.env.DB, user.id, jobId))) {
			return c.json({ error: "Job not found" }, 404);
		}

		const title = requiredString(body.title, "title");
		const description = trimOrNull(body.description);
		const impactMetric = trimOrNull(body.impact_metric);
		const tags = trimOrNull(body.tags);
		const achievedAt = trimOrNull(body.achieved_at);
		const sortOrder = await nextSortOrder(c.env.DB, "achievements", "job_id", jobId);
		const id = newId("ach");

		await c.env.DB.prepare(
			`INSERT INTO achievements (
         id, job_id, title, description, impact_metric, tags, achieved_at, sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(id, jobId, title, description, impactMetric, tags, achievedAt, sortOrder)
			.run();

		const achievement = await c.env.DB.prepare(
			`SELECT a.id, a.job_id, a.title, a.description, a.impact_metric, a.tags,
              a.achieved_at, a.sort_order, a.created_at, a.updated_at,
              j.company AS job_company, j.title AS job_title
       FROM achievements a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ?`,
		)
			.bind(id)
			.first();

		return c.json({ achievement }, 201);
	} catch (error) {
		return c.json(
			{
				error: error instanceof Error ? error.message : "Could not create achievement",
			},
			400,
		);
	}
});

achievements.patch("/achievements/:id", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const achievementId = c.req.param("id");
	const owned = await assertAchievementOwned(c.env.DB, user.id, achievementId);
	if (!owned) return c.json({ error: "Achievement not found" }, 404);

	const body = await readJson<Record<string, unknown>>(c);
	if (!body) return c.json({ error: "Invalid JSON" }, 400);

	const existing = await c.env.DB.prepare(
		`SELECT title, description, impact_metric, tags, achieved_at, sort_order, job_id
     FROM achievements WHERE id = ?`,
	)
		.bind(achievementId)
		.first<{
			title: string;
			description: string | null;
			impact_metric: string | null;
			tags: string | null;
			achieved_at: string | null;
			sort_order: number;
			job_id: string;
		}>();

	if (!existing) return c.json({ error: "Achievement not found" }, 404);

	let jobId = existing.job_id;
	if (body.job_id !== undefined) {
		const nextJobId = requiredString(body.job_id, "job_id");
		if (!(await assertJobOwned(c.env.DB, user.id, nextJobId))) {
			return c.json({ error: "Job not found" }, 404);
		}
		jobId = nextJobId;
	}

	const title =
		body.title !== undefined ? requiredString(body.title, "title") : existing.title;
	const description =
		body.description !== undefined ? trimOrNull(body.description) : existing.description;
	const impactMetric =
		body.impact_metric !== undefined
			? trimOrNull(body.impact_metric)
			: existing.impact_metric;
	const tags = body.tags !== undefined ? trimOrNull(body.tags) : existing.tags;
	const achievedAt =
		body.achieved_at !== undefined ? trimOrNull(body.achieved_at) : existing.achieved_at;
	const sortOrder =
		typeof body.sort_order === "number" ? body.sort_order : existing.sort_order;

	await c.env.DB.prepare(
		`UPDATE achievements SET
       job_id = ?, title = ?, description = ?, impact_metric = ?, tags = ?,
       achieved_at = ?, sort_order = ?, updated_at = datetime('now')
     WHERE id = ?`,
	)
		.bind(
			jobId,
			title,
			description,
			impactMetric,
			tags,
			achievedAt,
			sortOrder,
			achievementId,
		)
		.run();

	const achievement = await c.env.DB.prepare(
		`SELECT a.id, a.job_id, a.title, a.description, a.impact_metric, a.tags,
            a.achieved_at, a.sort_order, a.created_at, a.updated_at,
            j.company AS job_company, j.title AS job_title
     FROM achievements a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.id = ?`,
	)
		.bind(achievementId)
		.first();

	return c.json({ achievement });
});

achievements.put("/achievements/reorder", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const body = await readJson<{ job_id?: string; ordered_ids?: string[] }>(c);
	if (!body?.job_id || !body.ordered_ids || !Array.isArray(body.ordered_ids)) {
		return c.json({ error: "job_id and ordered_ids required" }, 400);
	}

	if (!(await assertJobOwned(c.env.DB, user.id, body.job_id))) {
		return c.json({ error: "Job not found" }, 404);
	}

	const statements = body.ordered_ids.map((id, index) =>
		c.env.DB.prepare(
			`UPDATE achievements SET sort_order = ?, updated_at = datetime('now')
       WHERE id = ? AND job_id = ?`,
		).bind(index, id, body.job_id),
	);

	if (statements.length > 0) {
		await c.env.DB.batch(statements);
	}

	return c.json({ ok: true });
});

achievements.delete("/achievements/:id", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const achievementId = c.req.param("id");
	if (!(await assertAchievementOwned(c.env.DB, user.id, achievementId))) {
		return c.json({ error: "Achievement not found" }, 404);
	}

	await c.env.DB.prepare(`DELETE FROM achievements WHERE id = ?`)
		.bind(achievementId)
		.run();
	return c.json({ ok: true });
});

export default achievements;
