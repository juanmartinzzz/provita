import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar, type SidebarNavSection } from "../components/Sidebar/Sidebar";
import {
	IconBriefcase,
	IconDashboard,
	IconResume,
	IconSettings,
	IconStory,
	IconSummary,
	IconTrophy,
} from "../components/icons/DotIcons";
import { signOut, useSession } from "../lib/auth-client";
import "./AppLayout.css";

const sections: SidebarNavSection[] = [
	{
		id: "primary",
		label: "Workspace",
		items: [
			{
				id: "dashboard",
				label: "Dashboard",
				href: "/",
				icon: <IconDashboard />,
			},
			{
				id: "jobs",
				label: "Jobs",
				href: "/jobs",
				icon: <IconBriefcase />,
			},
			{
				id: "resumes",
				label: "Resumes",
				href: "/resumes",
				icon: <IconResume />,
				created: new Date().toISOString().slice(0, 10),
			},
		],
	},
	{
		id: "story",
		label: "Career story",
		group: {
			id: "story-group",
			label: "Story tools",
			icon: <IconStory />,
			defaultOpen: true,
			items: [
				{
					id: "achievements",
					label: "Achievements",
					href: "/achievements",
					icon: <IconTrophy />,
				},
				{
					id: "summaries",
					label: "Summaries",
					href: "/summaries",
					icon: <IconSummary />,
					created: new Date().toISOString().slice(0, 10),
				},
				{
					id: "settings",
					label: "Settings",
					href: "/settings",
					icon: <IconSettings />,
				},
			],
		},
	},
];

export function AppLayout() {
	const navigate = useNavigate();
	const { data: session } = useSession();
	const user = session?.user;

	return (
		<div className="app-shell">
			<Sidebar
				sections={sections}
				user={{
					name: user?.name ?? "Account",
					email: user?.email ?? "",
					company: "ProVita",
				}}
				onLogout={() => {
					void signOut({
						fetchOptions: {
							onSuccess: () => {
								navigate("/login", { replace: true });
							},
						},
					});
				}}
			/>
			<main className="app-shell__main">
				<div className="app-shell__content">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
