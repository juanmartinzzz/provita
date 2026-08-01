import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth, type Session, type SessionUser } from "./auth.ts";
import achievements from "./routes/achievements.ts";
import jobs from "./routes/jobs.ts";
import resumes from "./routes/resumes.ts";
import summaries from "./routes/summaries.ts";
import { requireUser, type AppEnv } from "./util.ts";

const app = new Hono<AppEnv>();

app.use(
	"/api/*",
	cors({
		origin: (origin) => {
			if (!origin) return "";
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
		credentials: true,
	}),
);

app.use("/api/*", async (c, next) => {
	const auth = createAuth(c.env);
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	c.set("user", session?.user ?? null);
	c.set("session", session?.session ?? null);
	await next();
});

app.on(["GET", "POST"], "/api/auth/*", (c) => {
	return createAuth(c.env).handler(c.req.raw);
});

app.get("/api/health", (c) =>
	c.json({
		ok: true,
		service: "provita-api",
		ts: new Date().toISOString(),
	}),
);

app.get("/api/me", (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);
	return c.json({ user });
});

app.get("/api/profile", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const profile = await c.env.DB.prepare(
		`SELECT id, display_name, email, company, headline, created_at
     FROM profiles
     WHERE id = ?`,
	)
		.bind(user.id)
		.first();

	if (!profile) {
		return c.json({ error: "Profile not found" }, 404);
	}

	return c.json({ profile });
});

app.get("/api/stats", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const jobsCount = await c.env.DB.prepare(
		`SELECT COUNT(*) AS count FROM jobs WHERE profile_id = ?`,
	)
		.bind(user.id)
		.first<{ count: number }>();

	const achievementsCount = await c.env.DB.prepare(
		`SELECT COUNT(*) AS count
     FROM achievements a
     JOIN jobs j ON j.id = a.job_id
     WHERE j.profile_id = ?`,
	)
		.bind(user.id)
		.first<{ count: number }>();

	const resumesCount = await c.env.DB.prepare(
		`SELECT COUNT(*) AS count FROM resumes WHERE profile_id = ?`,
	)
		.bind(user.id)
		.first<{ count: number }>();

	const summariesCount = await c.env.DB.prepare(
		`SELECT COUNT(*) AS count FROM professional_summaries WHERE profile_id = ?`,
	)
		.bind(user.id)
		.first<{ count: number }>();

	const current = await c.env.DB.prepare(
		`SELECT company, title FROM jobs WHERE profile_id = ? AND is_current = 1 LIMIT 1`,
	)
		.bind(user.id)
		.first<{ company: string; title: string }>();

	return c.json({
		stats: {
			jobs: jobsCount?.count ?? 0,
			achievements: achievementsCount?.count ?? 0,
			resumes: resumesCount?.count ?? 0,
			summaries: summariesCount?.count ?? 0,
			currentRole: current
				? `${current.title} · ${current.company}`
				: "No current role",
		},
	});
});

app.route("/api", jobs);
app.route("/api", achievements);
app.route("/api", summaries);
app.route("/api", resumes);

export default app;

// Keep Session types referenced for Env variable typing clarity
export type { Session, SessionUser };
