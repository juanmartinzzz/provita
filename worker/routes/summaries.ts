import { Hono } from "hono";
import {
	assertSummaryOwned,
	newId,
	nextSortOrder,
	readJson,
	requiredString,
	requireUser,
	SUMMARY_MAX_CHARS,
	type AppEnv,
} from "../util.ts";

const summaries = new Hono<AppEnv>();

summaries.get("/summaries", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const { results } = await c.env.DB.prepare(
		`SELECT id, label, body, sort_order, created_at, updated_at
     FROM professional_summaries
     WHERE profile_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
	)
		.bind(user.id)
		.all();

	return c.json({ summaries: results, max_chars: SUMMARY_MAX_CHARS });
});

summaries.post("/summaries", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const body = await readJson<Record<string, unknown>>(c);
	if (!body) return c.json({ error: "Invalid JSON" }, 400);

	try {
		const label = requiredString(body.label, "label");
		const text = requiredString(body.body, "body");
		if (text.length > SUMMARY_MAX_CHARS) {
			return c.json(
				{ error: `Summary must be ${SUMMARY_MAX_CHARS} characters or fewer` },
				400,
			);
		}

		const sortOrder = await nextSortOrder(
			c.env.DB,
			"professional_summaries",
			"profile_id",
			user.id,
		);
		const id = newId("sum");

		await c.env.DB.prepare(
			`INSERT INTO professional_summaries (id, profile_id, label, body, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
		)
			.bind(id, user.id, label, text, sortOrder)
			.run();

		const summary = await c.env.DB.prepare(
			`SELECT id, label, body, sort_order, created_at, updated_at
       FROM professional_summaries WHERE id = ?`,
		)
			.bind(id)
			.first();

		return c.json({ summary }, 201);
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : "Could not create summary" },
			400,
		);
	}
});

summaries.patch("/summaries/:id", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const summaryId = c.req.param("id");
	if (!(await assertSummaryOwned(c.env.DB, user.id, summaryId))) {
		return c.json({ error: "Summary not found" }, 404);
	}

	const body = await readJson<Record<string, unknown>>(c);
	if (!body) return c.json({ error: "Invalid JSON" }, 400);

	const existing = await c.env.DB.prepare(
		`SELECT label, body, sort_order FROM professional_summaries WHERE id = ?`,
	)
		.bind(summaryId)
		.first<{ label: string; body: string; sort_order: number }>();

	if (!existing) return c.json({ error: "Summary not found" }, 404);

	try {
		const label =
			body.label !== undefined ? requiredString(body.label, "label") : existing.label;
		const text =
			body.body !== undefined ? requiredString(body.body, "body") : existing.body;
		if (text.length > SUMMARY_MAX_CHARS) {
			return c.json(
				{ error: `Summary must be ${SUMMARY_MAX_CHARS} characters or fewer` },
				400,
			);
		}
		const sortOrder =
			typeof body.sort_order === "number" ? body.sort_order : existing.sort_order;

		await c.env.DB.prepare(
			`UPDATE professional_summaries SET
         label = ?, body = ?, sort_order = ?, updated_at = datetime('now')
       WHERE id = ?`,
		)
			.bind(label, text, sortOrder, summaryId)
			.run();

		const summary = await c.env.DB.prepare(
			`SELECT id, label, body, sort_order, created_at, updated_at
       FROM professional_summaries WHERE id = ?`,
		)
			.bind(summaryId)
			.first();

		return c.json({ summary });
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : "Could not update summary" },
			400,
		);
	}
});

summaries.put("/summaries/reorder", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const body = await readJson<{ ordered_ids?: string[] }>(c);
	if (!body?.ordered_ids || !Array.isArray(body.ordered_ids)) {
		return c.json({ error: "ordered_ids required" }, 400);
	}

	const statements = body.ordered_ids.map((id, index) =>
		c.env.DB.prepare(
			`UPDATE professional_summaries SET sort_order = ?, updated_at = datetime('now')
       WHERE id = ? AND profile_id = ?`,
		).bind(index, id, user.id),
	);

	if (statements.length > 0) {
		await c.env.DB.batch(statements);
	}

	return c.json({ ok: true });
});

summaries.delete("/summaries/:id", async (c) => {
	const user = requireUser(c);
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const summaryId = c.req.param("id");
	if (!(await assertSummaryOwned(c.env.DB, user.id, summaryId))) {
		return c.json({ error: "Summary not found" }, 404);
	}

	await c.env.DB.prepare(`DELETE FROM professional_summaries WHERE id = ?`)
		.bind(summaryId)
		.run();
	return c.json({ ok: true });
});

export default summaries;
