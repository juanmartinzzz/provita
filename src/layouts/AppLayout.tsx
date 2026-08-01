import { Outlet } from "react-router-dom";
import { Sidebar, type SidebarNavSection } from "../components/Sidebar/Sidebar";
import {
	IconBriefcase,
	IconDashboard,
	IconSettings,
	IconStory,
	IconTrophy,
} from "../components/icons/DotIcons";
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
	return (
		<div className="app-shell">
			<Sidebar
				sections={sections}
				user={{
					name: "Alex Rivera",
					email: "alex@provita.app",
					company: "ProVita",
				}}
				onLogout={() => {
					window.alert("Logout wired later.");
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
