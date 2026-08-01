import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono<{ Bindings: Env }>();

app.use(
	"/api/*",
	cors({
		origin: (origin) => {
			if (!origin) return "*";
			if (
				origin.startsWith("http://localhost:") ||
				origin.startsWith("http://127.0.0.1:") ||
				origin.endsWith(".workers.dev") ||
				origin.endsWith(".provita.app")
			) {
				return origin;
			}
			return "";
		},
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
	}),
);

app.get("/api/health", (c) =>
	c.json({
		ok: true,
		service: "provita-api",
		ts: new Date().toISOString(),
	}),
);

app.get("/api/profile", async (c) => {
	const profile = await c.env.DB.prepare(
		`SELECT id, display_name, email, company, headline, created_at
     FROM profiles
     WHERE id = ?`,
	)
		.bind("profile_demo")
		.first();

	if (!profile) {
		return c.json({ error: "Profile not found" }, 404);
	}

	return c.json({ profile });
});

app.get("/api/jobs", async (c) => {
	const { results: jobs } = await c.env.DB.prepare(
		`SELECT id, company, title, location, employment_type, start_date, end_date,
            is_current, summary, created_at
     FROM jobs
     WHERE profile_id = ?
     ORDER BY is_current DESC, start_date DESC`,
	)
		.bind("profile_demo")
		.all();

	const { results: achievements } = await c.env.DB.prepare(
		`SELECT id, job_id, title, description, impact_metric, tags, achieved_at
     FROM achievements
     ORDER BY achieved_at DESC`,
	).all();

	const byJob = new Map<string, typeof achievements>();
	for (const achievement of achievements) {
		const jobId = String(achievement.job_id);
		const list = byJob.get(jobId) ?? [];
		list.push(achievement);
		byJob.set(jobId, list);
	}

	return c.json({
		jobs: jobs.map((job) => ({
			...job,
			is_current: Boolean(job.is_current),
			achievements: byJob.get(String(job.id)) ?? [],
		})),
	});
});

app.get("/api/stats", async (c) => {
	const jobs = await c.env.DB.prepare(
		`SELECT COUNT(*) AS count FROM jobs WHERE profile_id = ?`,
	)
		.bind("profile_demo")
		.first<{ count: number }>();

	const achievements = await c.env.DB.prepare(
		`SELECT COUNT(*) AS count
     FROM achievements a
     JOIN jobs j ON j.id = a.job_id
     WHERE j.profile_id = ?`,
	)
		.bind("profile_demo")
		.first<{ count: number }>();

	const current = await c.env.DB.prepare(
		`SELECT company, title FROM jobs WHERE profile_id = ? AND is_current = 1 LIMIT 1`,
	)
		.bind("profile_demo")
		.first<{ company: string; title: string }>();

	return c.json({
		stats: {
			jobs: jobs?.count ?? 0,
			achievements: achievements?.count ?? 0,
			currentRole: current
				? `${current.title} · ${current.company}`
				: "No current role",
		},
	});
});

export default app;
