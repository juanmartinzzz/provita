import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
	IconChevron,
	IconLogout,
	IconMenu,
} from "../icons/DotIcons";
import "./Sidebar.css";

export type SidebarNavItem = {
	id: string;
	label: string;
	href: string;
	icon: ReactNode;
	created?: string;
};

export type SidebarNavSection = {
	id: string;
	label?: string;
	items?: SidebarNavItem[];
	/** Collapsible nested group under a trigger row */
	group?: {
		id: string;
		label: string;
		icon: ReactNode;
		defaultOpen?: boolean;
		items: SidebarNavItem[];
	};
};

export type SidebarUser = {
	name: string;
	email: string;
	company: string;
	initials?: string;
};

type SidebarProps = {
	sections: SidebarNavSection[];
	user: SidebarUser;
	brand?: string;
	defaultCollapsed?: boolean;
	onLogout?: () => void;
};

const isNew = (created?: string): boolean => {
	if (!created) return false;
	return Date.now() - new Date(created).getTime() < 30 * 24 * 60 * 60 * 1000;
};

export function Sidebar({
	sections,
	user,
	brand = "PROVITA",
	defaultCollapsed = false,
	onLogout,
}: SidebarProps) {
	const [collapsed, setCollapsed] = useState(defaultCollapsed);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
		const initial: Record<string, boolean> = {};
		for (const section of sections) {
			if (section.group) {
				initial[section.group.id] = section.group.defaultOpen ?? true;
			}
		}
		return initial;
	});
	const location = useLocation();

	useEffect(() => {
		setMobileOpen(false);
	}, [location.pathname]);

	useEffect(() => {
		document.body.style.overflow = mobileOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [mobileOpen]);

	const flatItems = useMemo(() => {
		const items: SidebarNavItem[] = [];
		for (const section of sections) {
			if (section.items) items.push(...section.items);
			if (section.group) items.push(...section.group.items);
		}
		return items;
	}, [sections]);

	const initials =
		user.initials ??
		user.name
			.split(" ")
			.map((part) => part[0])
			.join("")
			.slice(0, 2)
			.toUpperCase();

	const isActivePath = (href: string) =>
		location.pathname === href ||
		(href !== "/" && location.pathname.startsWith(`${href}/`));

	const renderItem = (item: SidebarNavItem, opts?: { nested?: boolean }) => (
		<NavLink
			key={item.id}
			to={item.href}
			className="sidebar__item"
			data-active={isActivePath(item.href) ? "true" : "false"}
			data-created={item.created}
			data-nested={opts?.nested ? "true" : "false"}
			title={item.label}
		>
			<span className="sidebar__item-icon">{item.icon}</span>
			<span className="sidebar__item-label">{item.label}</span>
			{isNew(item.created) ? <span className="sidebar__badge">new</span> : null}
		</NavLink>
	);

	return (
		<>
			<aside className="sidebar" data-collapsed={collapsed ? "true" : "false"}>
				<div className="sidebar__header">
					<div className="sidebar__logo">
						<span className="sidebar__logo-mark">PV</span>
						<span className="sidebar__logo-text">{brand}</span>
					</div>
					<button
						type="button"
						className="sidebar__toggle"
						aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
						onClick={() => setCollapsed((value) => !value)}
					>
						<IconChevron direction={collapsed ? "right" : "left"} />
					</button>
				</div>
				<hr className="thin-bar" />

				<nav className="sidebar__nav" aria-label="Primary">
					{sections.map((section, index) => (
						<div key={section.id}>
							{index > 0 ? <div className="sidebar__divider" /> : null}
							{section.label ? (
								<div className="sidebar__section-label">{section.label}</div>
							) : null}
							{section.items?.map((item) => renderItem(item))}
							{section.group ? (
								<div
									className="sidebar__group"
									data-open={openGroups[section.group.id] ? "true" : "false"}
								>
									<button
										type="button"
										className="sidebar__group-trigger"
										onClick={() =>
											setOpenGroups((prev) => ({
												...prev,
												[section.group!.id]: !prev[section.group!.id],
											}))
										}
									>
										<span className="sidebar__item-icon">{section.group.icon}</span>
										<span className="sidebar__group-label">{section.group.label}</span>
										<span className="sidebar__group-chevron">
											<IconChevron direction="down" size={16} />
										</span>
									</button>
									<div className="sidebar__group-items">
										<div className="sidebar__group-items-inner">
											{section.group.items.map((item) =>
												renderItem(item, { nested: true }),
											)}
										</div>
									</div>
								</div>
							) : null}
						</div>
					))}
				</nav>

				<div className="sidebar__divider" />
				<div className="sidebar__footer">
					<div className="sidebar__user">
						<div className="sidebar__avatar" aria-hidden="true">
							{initials}
						</div>
						<div className="sidebar__user-meta">
							<div className="sidebar__user-name">{user.name}</div>
							<div className="sidebar__user-email">{user.email}</div>
							<div className="sidebar__user-company">{user.company}</div>
						</div>
					</div>
					<button type="button" className="sidebar__logout" onClick={onLogout}>
						<IconLogout size={16} />
						<span className="sidebar__logout-label">Log out</span>
					</button>
				</div>
			</aside>

			<header className="mobile-topbar">
				<span className="mobile-topbar__brand">{brand}</span>
				<button
					type="button"
					className="mobile-topbar__menu"
					aria-label="Open navigation"
					onClick={() => setMobileOpen(true)}
				>
					<IconMenu />
				</button>
			</header>

			<div className="mobile-overlay" data-open={mobileOpen ? "true" : "false"}>
				<button
					type="button"
					className="mobile-overlay__backdrop"
					aria-label="Close navigation"
					onClick={() => setMobileOpen(false)}
				/>
				<div className="mobile-overlay__panel" role="dialog" aria-modal="true">
					<div className="mobile-overlay__header">
						<span className="mobile-overlay__title">{brand}</span>
						<button
							type="button"
							className="mobile-overlay__close"
							aria-label="Close"
							onClick={() => setMobileOpen(false)}
						>
							×
						</button>
					</div>
					<div className="mobile-overlay__grid">
						{flatItems.map((item) => (
							<NavLink
								key={item.id}
								to={item.href}
								className="mobile-overlay__card"
								data-active={location.pathname === item.href ? "true" : "false"}
							>
								<span>{item.icon}</span>
								<span className="mobile-overlay__card-label">{item.label}</span>
							</NavLink>
						))}
					</div>
				</div>
			</div>
		</>
	);
}
