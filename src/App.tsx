import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { AppLayout } from "./layouts/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { LoginPage } from "./pages/LoginPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route element={<RequireAuth />}>
					<Route element={<AppLayout />}>
						<Route index element={<Dashboard />} />
						<Route
							path="jobs"
							element={
								<PlaceholderPage
									title="Jobs"
									copy="Full job editor lands next — the expandable timeline on Dashboard is the interaction prototype."
								/>
							}
						/>
						<Route
							path="achievements"
							element={
								<PlaceholderPage
									title="Achievements"
									copy="Achievement library view coming soon. Expand a job row on the dashboard to preview the pattern."
								/>
							}
						/>
						<Route
							path="settings"
							element={
								<PlaceholderPage
									title="Settings"
									copy="Profile, export, and theme preferences will live here."
								/>
							}
						/>
						<Route path="*" element={<Navigate to="/" replace />} />
					</Route>
				</Route>
			</Routes>
		</BrowserRouter>
	);
}
