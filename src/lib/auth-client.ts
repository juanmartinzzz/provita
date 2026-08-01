import { createAuthClient } from "better-auth/react";

const baseURL =
	(import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
	undefined;

export const authClient = createAuthClient({
	baseURL,
	fetchOptions: {
		credentials: "include",
	},
});

export const { signIn, signUp, signOut, useSession } = authClient;
