import { Hono } from "hono";
import {
	asBool,
	assertAchievementOwned,
	assertJobOwned,
	assertResumeOwned,
	assertSummaryOwned,
	DEFAULT_MAX_BULLETS,
	newId,
	readJson,
	requiredString,
	requireUser,
	trimOrNull,
	type AppEnv,
} from "../util.ts";

const resumes = new Hono<AppEnv>();

type SelectionJob = { job_id: string; enabled: boolean; sort_order: number };
type SelectionAchievement = {
	achievement_id: string;
	enabled: boolean;
	sort_order: number;
};

async function loadResumeDetail(db: D1Database, profileId: string, resumeId: string) {
	const resume = await db
		.prepare(
			`SELECT id, title, label, summary_id, max_bullets, notes, duplicated_from,
              created_at, updated_at
       FROM resumes
       WHERE id = ? AND profile_id = ?`,
		)
		.bind(resumeId, profileId)
		.first<{
			id: string;
			title: string;
			label: string | null;
			summary_id: string | null;
			max_bullets: number;
			notes: string | null;
			duplicated_from: string | null;
			created_at: string;
			updated_at: string;
		}>();

	if (!resume) return null;

	let summary = null;
	if (resume.summary_id) {
		summary = await db
			.prepare(
				`SELECT id, label, body, sort_order, created_at, updated_at
         FROM professional_summaries WHERE id = ?`,
			)
			.bind(resume.summary_id)
			.first();
	}

	type MasterJob = {
		id: string;
		company: string;
		title: string;
		location: string | null;
		employment_type: string;
		start_date: string;
		end_date: string | null;
		is_current: number;
		summary: string | null;
		sort_order: number;
	};
	type MasterAchievement = {
		id: string;
		job_id: string;
		title: string;
		description: string | null;
		impact_metric: string | null;
		tags: string | null;
		achieved_at: string | null;
		sort_order: number;
	};

	const { results: masterJobs } = await db
		.prepare(
			`SELECT id, company, title, location, employment_type, start_date, end_date,
              is_current, summary, sort_order
       FROM jobs
       WHERE profile_id = ?
       ORDER BY sort_order ASC, is_current DESC, start_date DESC`,
		)
		.bind(profileId)
		.all<MasterJob>();

	const { results: masterAchievements } = await db
		.prepare(
			`SELECT a.id, a.job_id, a.title, a.description, a.impact_metric, a.tags,
              a.achieved_at, a.sort_order
       FROM achievements a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.profile_id = ?
       ORDER BY a.sort_order ASC, a.achieved_at DESC`,
		)
		.bind(profileId)
		.all<MasterAchievement>();

	let { results: resumeJobs } = await db
		.prepare(
			`SELECT job_id, enabled, sort_order FROM resume_jobs WHERE resume_id = ?`,
		)
		.bind(resumeId)
		.all<{ job_id: string; enabled: number; sort_order: number }>();

	let { results: resumeAchievements } = await db
		.prepare(
			`SELECT achievement_id, enabled, sort_order
       FROM resume_achievements WHERE resume_id = ?`,
		)
		.bind(resumeId)
		.all<{ achievement_id: string; enabled: number; sort_order: number }>();

	// Pull newly created master items into this version (off by default).
	const knownJobs = new Set(resumeJobs.map((row) => row.job_id));
	const knownAchievements = new Set(
		resumeAchievements.map((row) => row.achievement_id),
	);
	const maxJobOrder = resumeJobs.reduce(
		(max, row) => Math.max(max, row.sort_order),
		-1,
	);
	const maxAchOrder = resumeAchievements.reduce(
		(max, row) => Math.max(max, row.sort_order),
		-1,
	);
	const coverage: D1PreparedStatement[] = [];
	let jobOrderCursor = maxJobOrder;
	let achOrderCursor = maxAchOrder;

	for (const job of masterJobs) {
		const jobId = String(job.id);
		if (!knownJobs.has(jobId)) {
			jobOrderCursor += 1;
			coverage.push(
				db
					.prepare(
						`INSERT OR IGNORE INTO resume_jobs (resume_id, job_id, enabled, sort_order)
             VALUES (?, ?, 0, ?)`,
					)
					.bind(resumeId, jobId, jobOrderCursor),
			);
		}
	}
	for (const achievement of masterAchievements) {
		const achievementId = String(achievement.id);
		if (!knownAchievements.has(achievementId)) {
			achOrderCursor += 1;
			coverage.push(
				db
					.prepare(
						`INSERT OR IGNORE INTO resume_achievements
             (resume_id, achievement_id, enabled, sort_order)
             VALUES (?, ?, 0, ?)`,
					)
					.bind(resumeId, achievementId, achOrderCursor),
			);
		}
	}
	if (coverage.length > 0) {
		await db.batch(coverage);
		({ results: resumeJobs } = await db
			.prepare(
				`SELECT job_id, enabled, sort_order FROM resume_jobs WHERE resume_id = ?`,
			)
			.bind(resumeId)
			.all<{ job_id: string; enabled: number; sort_order: number }>());
		({ results: resumeAchievements } = await db
			.prepare(
				`SELECT achievement_id, enabled, sort_order
         FROM resume_achievements WHERE resume_id = ?`,
			)
			.bind(resumeId)
			.all<{ achievement_id: string; enabled: number; sort_order: number }>());
	}

	const jobSel = new Map(resumeJobs.map((row) => [row.job_id, row]));
	const achSel = new Map(
		resumeAchievements.map((row) => [row.achievement_id, row]),
	);

	const achievementsByJob = new Map<string, typeof masterAchievements>();
	for (const achievement of masterAchievements) {
		const jobId = String(achievement.job_id);
		const list = achievementsByJob.get(jobId) ?? [];
		list.push(achievement);
		achievementsByJob.set(jobId, list);
	}

	const jobs = masterJobs
		.map((job) => {
			const sel = jobSel.get(String(job.id));
			const achievements = (achievementsByJob.get(String(job.id)) ?? []).map(
				(achievement) => {
					const aSel = achSel.get(String(achievement.id));
					return {
						...achievement,
						enabled: aSel ? asBool(aSel.enabled) : false,
						resume_sort_order: aSel?.sort_order ?? achievement.sort_order,
						in_resume: Boolean(aSel),
					};
				},
			);

			achievements.sort(
				(a, b) =>
					Number(a.resume_sort_order) - Number(b.resume_sort_order) ||
					Number(a.sort_order) - Number(b.sort_order),
			);

			return {
				...job,
				is_current: asBool(job.is_current),
				enabled: sel ? asBool(sel.enabled) : false,
				resume_sort_order: sel?.sort_order ?? job.sort_order,
				in_resume: Boolean(sel),
				achievements,
			};
		})
		.sort(
			(a, b) =>
				Number(a.resume_sort_order) - Number(b.resume_sort_order) ||
				Number(a.sort_order) - Number(b.sort_order),
		);

	const enabledBulletCount = jobs.reduce(
		(count, job) =>
			count + job.achievements.filter((achievement) => achievement.enabled).length,
		0,
	);

	return {
		resume: {
			...resume,
			enabled_bullet_count: enabledBulletCount,
		},
		summary,
		jobs,
	};
}

async function replaceSelections(
	db: D1Database,
	resumeId: string,
	jobs: SelectionJob[],
	achievements: SelectionAchievement[],
	maxBullets: number,
) {
	const enabledCount = achievements.filter((item) => item.enabled).length;
	if (enabledCount > maxBullets) {
		throw new Error(`At most ${maxBullets} achievements can be enabled`);
	}

	await db.batch([
		db.prepare(`DELETE FROM resume_jobs WHERE resume_id = ?`).bind(resumeId),
		db.prepare(`DELETE FROM resume_achievements WHERE resume_id = ?`).bind(resumeId),
	]);

	const statements = [
		...jobs.map((job) =>
			db
				.prepare(
					`INSERT INTO resume_jobs (resume_id, job_id, enabled, sort_order)
           VALUES (?, ?, ?, ?)`,
				)
				.bind(resumeId, job.job_id, job.enabled ? 1 : 0, job.sort_order),
		),
		...achievements.map((achievement) =>
			db
				.prepare(
					`INSERT INTO resume_achievements (resume_id, achievement_id, enabled, sort_order)
           VALUES (?, ?, ?, ?)`,
				)
				.bind(
					resumeId,
					achievement.achievement_id,
					achievement.enabled ? 1 : 0,
					achievement.sort_order,
				),
		),
	];

	if (statements.length > 0) {
		await db.batch(statements);
	}
}

resumes.get("/resumes", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const { results } = await c.env.DB.prepare(
		`SELECT r.id, r.title, r.label, r.summary_id, r.max_bullets, r.notes,
            r.duplicated_from, r.created_at, r.updated_at,
            s.label AS summary_label,
            (SELECT COUNT(*) FROM resume_jobs rj
              WHERE rj.resume_id = r.id AND rj.enabled = 1) AS enabled_jobs,
            (SELECT COUNT(*) FROM resume_achievements ra
              WHERE ra.resume_id = r.id AND ra.enabled = 1) AS enabled_bullets
     FROM resumes r
     LEFT JOIN professional_summaries s ON s.id = r.summary_id
     WHERE r.profile_id = ?
     ORDER BY r.updated_at DESC`,
	)
		.bind(user.id)
		.all();

	return c.json({ resumes: results });
});

resumes.get("/resumes/:id", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const detail = await loadResumeDetail(c.env.DB, user.id, c.req.param("id"));
	if (!detail) return c.json({ error: "Resume not found" }, 404);
	return c.json(detail);
});

resumes.post("/resumes", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const body = await readJson<Record<string, unknown>>(c);
	if (!body) return c.json({ error: "Invalid JSON" }, 400);

	try {
		const title = requiredString(body.title, "title");
		const label = trimOrNull(body.label);
		const notes = trimOrNull(body.notes);
		const maxBullets =
			typeof body.max_bullets === "number" && body.max_bullets > 0
				? Math.floor(body.max_bullets)
				: DEFAULT_MAX_BULLETS;

		let summaryId: string | null = null;
		if (body.summary_id !== undefined && body.summary_id !== null) {
			summaryId = requiredString(body.summary_id, "summary_id");
			if (!(await assertSummaryOwned(c.env.DB, user.id, summaryId))) {
				return c.json({ error: "Summary not found" }, 404);
			}
		}

		const id = newId("res");
		await c.env.DB.prepare(
			`INSERT INTO resumes (
         id, profile_id, title, label, summary_id, max_bullets, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(id, user.id, title, label, summaryId, maxBullets, notes)
			.run();

		// Seed selection rows for every master job (off) so the editor can toggle.
		const { results: masterJobs } = await c.env.DB.prepare(
			`SELECT id, sort_order FROM jobs WHERE profile_id = ? ORDER BY sort_order ASC`,
		)
			.bind(user.id)
			.all<{ id: string; sort_order: number }>();

		const { results: masterAchievements } = await c.env.DB.prepare(
			`SELECT a.id, a.sort_order
       FROM achievements a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.profile_id = ?
       ORDER BY a.sort_order ASC`,
		)
			.bind(user.id)
			.all<{ id: string; sort_order: number }>();

		await replaceSelections(
			c.env.DB,
			id,
			masterJobs.map((job, index) => ({
				job_id: job.id,
				enabled: true,
				sort_order: index,
			})),
			masterAchievements.map((achievement, index) => ({
				achievement_id: achievement.id,
				enabled: false,
				sort_order: index,
			})),
			maxBullets,
		);

		const detail = await loadResumeDetail(c.env.DB, user.id, id);
		return c.json(detail, 201);
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : "Could not create resume" },
			400,
		);
	}
});

resumes.patch("/resumes/:id", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const resumeId = c.req.param("id");
	if (!(await assertResumeOwned(c.env.DB, user.id, resumeId))) {
		return c.json({ error: "Resume not found" }, 404);
	}

	const body = await readJson<Record<string, unknown>>(c);
	if (!body) return c.json({ error: "Invalid JSON" }, 400);

	const existing = await c.env.DB.prepare(
		`SELECT title, label, summary_id, max_bullets, notes FROM resumes WHERE id = ?`,
	)
		.bind(resumeId)
		.first<{
			title: string;
			label: string | null;
			summary_id: string | null;
			max_bullets: number;
			notes: string | null;
		}>();

	if (!existing) return c.json({ error: "Resume not found" }, 404);

	try {
		const title =
			body.title !== undefined ? requiredString(body.title, "title") : existing.title;
		const label = body.label !== undefined ? trimOrNull(body.label) : existing.label;
		const notes = body.notes !== undefined ? trimOrNull(body.notes) : existing.notes;
		const maxBullets =
			typeof body.max_bullets === "number" && body.max_bullets > 0
				? Math.floor(body.max_bullets)
				: existing.max_bullets;

		let summaryId = existing.summary_id;
		if (body.summary_id !== undefined) {
			if (body.summary_id === null || body.summary_id === "") {
				summaryId = null;
			} else {
				summaryId = requiredString(body.summary_id, "summary_id");
				if (!(await assertSummaryOwned(c.env.DB, user.id, summaryId))) {
					return c.json({ error: "Summary not found" }, 404);
				}
			}
		}

		await c.env.DB.prepare(
			`UPDATE resumes SET
         title = ?, label = ?, summary_id = ?, max_bullets = ?, notes = ?,
         updated_at = datetime('now')
       WHERE id = ?`,
		)
			.bind(title, label, summaryId, maxBullets, notes, resumeId)
			.run();

		if (body.jobs || body.achievements) {
			const jobs = Array.isArray(body.jobs)
				? (body.jobs as SelectionJob[])
				: undefined;
			const achievements = Array.isArray(body.achievements)
				? (body.achievements as SelectionAchievement[])
				: undefined;

			if (jobs) {
				for (const job of jobs) {
					if (!(await assertJobOwned(c.env.DB, user.id, job.job_id))) {
						return c.json({ error: `Job not found: ${job.job_id}` }, 404);
					}
				}
			}
			if (achievements) {
				for (const achievement of achievements) {
					if (
						!(await assertAchievementOwned(
							c.env.DB,
							user.id,
							achievement.achievement_id,
						))
					) {
						return c.json(
							{ error: `Achievement not found: ${achievement.achievement_id}` },
							404,
						);
					}
				}
			}

			const currentJobs = jobs
				? jobs
				: (
						await c.env.DB.prepare(
							`SELECT job_id, enabled, sort_order FROM resume_jobs WHERE resume_id = ?`,
						)
							.bind(resumeId)
							.all<{ job_id: string; enabled: number; sort_order: number }>()
					).results.map((row) => ({
						job_id: row.job_id,
						enabled: asBool(row.enabled),
						sort_order: row.sort_order,
					}));

			const currentAchievements = achievements
				? achievements
				: (
						await c.env.DB.prepare(
							`SELECT achievement_id, enabled, sort_order
               FROM resume_achievements WHERE resume_id = ?`,
						)
							.bind(resumeId)
							.all<{
								achievement_id: string;
								enabled: number;
								sort_order: number;
							}>()
					).results.map((row) => ({
						achievement_id: row.achievement_id,
						enabled: asBool(row.enabled),
						sort_order: row.sort_order,
					}));

			await replaceSelections(
				c.env.DB,
				resumeId,
				currentJobs,
				currentAchievements,
				maxBullets,
			);
		} else if (typeof body.max_bullets === "number") {
			const enabled = await c.env.DB.prepare(
				`SELECT COUNT(*) AS count FROM resume_achievements
         WHERE resume_id = ? AND enabled = 1`,
			)
				.bind(resumeId)
				.first<{ count: number }>();
			if ((enabled?.count ?? 0) > maxBullets) {
				return c.json(
					{
						error: `Disable some bullets before lowering max to ${maxBullets}`,
					},
					400,
				);
			}
		}

		const detail = await loadResumeDetail(c.env.DB, user.id, resumeId);
		return c.json(detail);
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : "Could not update resume" },
			400,
		);
	}
});

resumes.post("/resumes/:id/duplicate", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const sourceId = c.req.param("id");
	const source = await c.env.DB.prepare(
		`SELECT id, title, label, summary_id, max_bullets, notes
     FROM resumes WHERE id = ? AND profile_id = ?`,
	)
		.bind(sourceId, user.id)
		.first<{
			id: string;
			title: string;
			label: string | null;
			summary_id: string | null;
			max_bullets: number;
			notes: string | null;
		}>();

	if (!source) return c.json({ error: "Resume not found" }, 404);

	const id = newId("res");
	const title = `${source.title} (copy)`;

	await c.env.DB.prepare(
		`INSERT INTO resumes (
       id, profile_id, title, label, summary_id, max_bullets, notes, duplicated_from
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			id,
			user.id,
			title,
			source.label,
			source.summary_id,
			source.max_bullets,
			source.notes,
			source.id,
		)
		.run();

	const { results: jobs } = await c.env.DB.prepare(
		`SELECT job_id, enabled, sort_order FROM resume_jobs WHERE resume_id = ?`,
	)
		.bind(sourceId)
		.all<{ job_id: string; enabled: number; sort_order: number }>();

	const { results: achievements } = await c.env.DB.prepare(
		`SELECT achievement_id, enabled, sort_order
     FROM resume_achievements WHERE resume_id = ?`,
	)
		.bind(sourceId)
		.all<{ achievement_id: string; enabled: number; sort_order: number }>();

	await replaceSelections(
		c.env.DB,
		id,
		jobs.map((row) => ({
			job_id: row.job_id,
			enabled: asBool(row.enabled),
			sort_order: row.sort_order,
		})),
		achievements.map((row) => ({
			achievement_id: row.achievement_id,
			enabled: asBool(row.enabled),
			sort_order: row.sort_order,
		})),
		source.max_bullets,
	);

	const detail = await loadResumeDetail(c.env.DB, user.id, id);
	return c.json(detail, 201);
});

/**
 * Sync content edits from a resume context back into the master library.
 * Content is shared by reference; this endpoint is the explicit "push to master" write.
 */
resumes.post("/resumes/:id/sync-to-master", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const resumeId = c.req.param("id");
	if (!(await assertResumeOwned(c.env.DB, user.id, resumeId))) {
		return c.json({ error: "Resume not found" }, 404);
	}

	const body = await readJson<{
		target?: "job" | "achievement";
		id?: string;
		fields?: Record<string, unknown>;
	}>(c);

	if (!body?.target || !body.id || !body.fields) {
		return c.json({ error: "target, id, and fields are required" }, 400);
	}

	if (body.target === "job") {
		if (!(await assertJobOwned(c.env.DB, user.id, body.id))) {
			return c.json({ error: "Job not found" }, 404);
		}
		const fields = body.fields;
		const existing = await c.env.DB.prepare(
			`SELECT company, title, location, employment_type, start_date, end_date,
              is_current, summary FROM jobs WHERE id = ?`,
		)
			.bind(body.id)
			.first<{
				company: string;
				title: string;
				location: string | null;
				employment_type: string;
				start_date: string;
				end_date: string | null;
				is_current: number;
				summary: string | null;
			}>();
		if (!existing) return c.json({ error: "Job not found" }, 404);

		await c.env.DB.prepare(
			`UPDATE jobs SET
         company = ?, title = ?, location = ?, employment_type = ?,
         start_date = ?, end_date = ?, is_current = ?, summary = ?,
         updated_at = datetime('now')
       WHERE id = ?`,
		)
			.bind(
				typeof fields.company === "string" ? fields.company.trim() : existing.company,
				typeof fields.title === "string" ? fields.title.trim() : existing.title,
				fields.location !== undefined
					? trimOrNull(fields.location)
					: existing.location,
				typeof fields.employment_type === "string"
					? fields.employment_type
					: existing.employment_type,
				typeof fields.start_date === "string"
					? fields.start_date
					: existing.start_date,
				fields.end_date !== undefined ? trimOrNull(fields.end_date) : existing.end_date,
				fields.is_current !== undefined
					? asBool(fields.is_current)
						? 1
						: 0
					: existing.is_current,
				fields.summary !== undefined ? trimOrNull(fields.summary) : existing.summary,
				body.id,
			)
			.run();
	} else {
		if (!(await assertAchievementOwned(c.env.DB, user.id, body.id))) {
			return c.json({ error: "Achievement not found" }, 404);
		}
		const fields = body.fields;
		const existing = await c.env.DB.prepare(
			`SELECT title, description, impact_metric, tags, achieved_at
       FROM achievements WHERE id = ?`,
		)
			.bind(body.id)
			.first<{
				title: string;
				description: string | null;
				impact_metric: string | null;
				tags: string | null;
				achieved_at: string | null;
			}>();
		if (!existing) return c.json({ error: "Achievement not found" }, 404);

		await c.env.DB.prepare(
			`UPDATE achievements SET
         title = ?, description = ?, impact_metric = ?, tags = ?, achieved_at = ?,
         updated_at = datetime('now')
       WHERE id = ?`,
		)
			.bind(
				typeof fields.title === "string" ? fields.title.trim() : existing.title,
				fields.description !== undefined
					? trimOrNull(fields.description)
					: existing.description,
				fields.impact_metric !== undefined
					? trimOrNull(fields.impact_metric)
					: existing.impact_metric,
				fields.tags !== undefined ? trimOrNull(fields.tags) : existing.tags,
				fields.achieved_at !== undefined
					? trimOrNull(fields.achieved_at)
					: existing.achieved_at,
				body.id,
			)
			.run();
	}

	await c.env.DB.prepare(
		`UPDATE resumes SET updated_at = datetime('now') WHERE id = ?`,
	)
		.bind(resumeId)
		.run();

	const detail = await loadResumeDetail(c.env.DB, user.id, resumeId);
	return c.json({ ok: true, ...detail });
});

resumes.delete("/resumes/:id", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const resumeId = c.req.param("id");
	if (!(await assertResumeOwned(c.env.DB, user.id, resumeId))) {
		return c.json({ error: "Resume not found" }, 404);
	}

	await c.env.DB.prepare(`DELETE FROM resumes WHERE id = ?`).bind(resumeId).run();
	return c.json({ ok: true });
});

export default resumes;
