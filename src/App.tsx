import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { AppLayout } from "./layouts/AppLayout";
import { AchievementsPage } from "./pages/AchievementsPage";
import { Dashboard } from "./pages/Dashboard";
import { JobsPage } from "./pages/JobsPage";
import { LoginPage } from "./pages/LoginPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ResumeEditorPage } from "./pages/ResumeEditorPage";
import { ResumesPage } from "./pages/ResumesPage";
import { SummariesPage } from "./pages/SummariesPage";

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route element={<RequireAuth />}>
					<Route element={<AppLayout />}>
						<Route index element={<Dashboard />} />
						<Route path="jobs" element={<JobsPage />} />
						<Route path="achievements" element={<AchievementsPage />} />
						<Route path="summaries" element={<SummariesPage />} />
						<Route path="resumes" element={<ResumesPage />} />
						<Route path="resumes/:id" element={<ResumeEditorPage />} />
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
