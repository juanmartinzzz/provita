import { betterAuth } from "better-auth";

const trustedOrigins = [
	"http://localhost:47391",
	"http://127.0.0.1:47391",
	"http://localhost:47392",
	"http://127.0.0.1:47392",
];

function isTrustedOrigin(origin: string): boolean {
	if (trustedOrigins.includes(origin)) return true;
	try {
		const { hostname } = new URL(origin);
		return hostname.endsWith(".workers.dev") || hostname.endsWith(".provita.app");
	} catch {
		return false;
	}
}

export function createAuth(env: Env) {
	return betterAuth({
		appName: "ProVita",
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		database: env.DB,
		emailAndPassword: {
			enabled: true,
		},
		trustedOrigins: async (request) => {
			const origin = request?.headers.get("origin");
			if (origin && isTrustedOrigin(origin)) return [origin];
			return trustedOrigins;
		},
		// Local Vite hits the production Worker cross-origin, so cookies must
		// be SameSite=None + Secure. Same-origin production still works.
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				partitioned: true,
			},
		},
		databaseHooks: {
			user: {
				create: {
					after: async (user) => {
						await env.DB.prepare(
							`INSERT INTO profiles (id, display_name, email, company, headline)
               VALUES (?, ?, ?, NULL, NULL)
               ON CONFLICT(id) DO NOTHING`,
						)
							.bind(user.id, user.name, user.email)
							.run();
					},
				},
			},
		},
	});
}

export type Auth = ReturnType<typeof createAuth>;
export type SessionUser = Auth["$Infer"]["Session"]["user"];
export type Session = Auth["$Infer"]["Session"]["session"];
