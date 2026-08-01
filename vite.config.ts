import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// Local `vite` / `npm run dev` = frontend only → production API (VITE_API_BASE_URL).
// `vite build` / deploy keeps the Cloudflare plugin so assets + Worker ship together.
export default defineConfig(({ command }) => ({
	plugins: [react(), ...(command === "serve" ? [] : [cloudflare()])],
	// Unusual high port to avoid clashing with other local apps.
	server: {
		port: 47391,
		strictPort: true,
	},
	preview: {
		port: 47392,
		strictPort: true,
	},
}));
