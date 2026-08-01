import { useEffect, useMemo, useState } from "react";
import {
	TableExpandableRows,
	type TableColumn,
	type TableFilter,
} from "../components/TableExpandableRows/TableExpandableRows";
import { apiGet } from "../lib/api";
import "./Dashboard.css";

type Achievement = {
	id: string;
	job_id: string;
	title: string;
	description: string | null;
	impact_metric: string | null;
	tags: string | null;
	achieved_at: string | null;
};

type Job = {
	id: string;
	company: string;
	title: string;
	location: string | null;
	employment_type: string;
	start_date: string;
	end_date: string | null;
	is_current: boolean;
	summary: string | null;
	achievements: Achievement[];
};

type Stats = {
	jobs: number;
	achievements: number;
	currentRole: string;
};

const employmentLabels: Record<string, string> = {
	full_time: "Full-time",
	contract: "Contract",
	internship: "Internship",
};

function formatDate(value: string | null): string {
	if (!value) return "Present";
	const date = new Date(`${value}T00:00:00`);
	return date.toLocaleDateString(undefined, {
		month: "short",
		year: "numeric",
	});
}

function LedMark() {
	return (
		<span className="led-glyph" aria-hidden="true">
			<span />
			<span className="off" />
			<span />
			<span className="off" />
			<span />
			<span className="off" />
			<span />
			<span className="off" />
			<span />
		</span>
	);
}

export function Dashboard() {
	const [jobs, setJobs] = useState<Job[]>([]);
	const [stats, setStats] = useState<Stats | null>(null);
	const [activeRowKey, setActiveRowKey] = useState<string | null>(null);
	const [density, setDensity] = useState<"default" | "compact">("default");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const [jobsJson, statsJson] = await Promise.all([
					apiGet<{ jobs: Job[] }>("/api/jobs"),
					apiGet<{ stats: Stats }>("/api/stats"),
				]);
				if (!cancelled) {
					setJobs(jobsJson.jobs);
					setStats(statsJson.stats);
					setError(null);
				}
			} catch {
				if (!cancelled) {
					setError("Could not load career data from the production API.");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		void load();
		return () => {
			cancelled = true;
		};
	}, []);

	const filters = useMemo<TableFilter[]>(
		() => [
			{
				id: "status",
				label: "Status",
				type: "single-pills",
				options: [
					{ value: "current", label: "Current" },
					{ value: "past", label: "Past" },
				],
			},
			{
				id: "type",
				label: "Employment",
				type: "multi",
				options: [
					{ value: "full_time", label: "Full-time" },
					{ value: "contract", label: "Contract" },
					{ value: "internship", label: "Internship" },
				],
			},
		],
		[],
	);

	const columns = useMemo<TableColumn<Job>[]>(
		() => [
			{
				id: "company",
				header: "Company",
				sortable: true,
				sortValue: (row) => row.company,
				cell: (row) => <strong>{row.company}</strong>,
			},
			{
				id: "title",
				header: "Role",
				sortable: true,
				sortValue: (row) => row.title,
				cell: (row) => row.title,
			},
			{
				id: "type",
				header: "Type",
				sortable: true,
				sortValue: (row) => row.employment_type,
				cell: (row) => (
					<span className="tag">
						{employmentLabels[row.employment_type] ?? row.employment_type}
					</span>
				),
			},
			{
				id: "tenure",
				header: "Tenure",
				sortable: true,
				sortValue: (row) => row.start_date,
				cell: (row) => (
					<span>
						{formatDate(row.start_date)} — {formatDate(row.end_date)}
						{row.is_current ? (
							<>
								{" "}
								<span className="tag tag--current">Now</span>
							</>
						) : null}
					</span>
				),
			},
			{
				id: "achievements",
				header: "Wins",
				sortable: true,
				numeric: true,
				sortValue: (row) => row.achievements.length,
				cell: (row) => row.achievements.length,
			},
		],
		[],
	);

	return (
		<div className="dashboard">
			<section className="dashboard__hero">
				<div className="dashboard__eyebrow">
					<LedMark />
					Career operating system
				</div>
				<h1 className="dashboard__title">Build every chapter.</h1>
				<p className="dashboard__lede">
					ProVita keeps jobs, achievements, and narrative proof in one
					high-contrast workspace — sparse, keyboard-clear, and ready for the
					edge.
				</p>
				<div className="dashboard__actions">
					<button type="button" className="btn btn--primary">
						Add achievement
					</button>
					<button type="button" className="btn btn--ghost">
						Export story
					</button>
				</div>
			</section>

			<section className="dashboard__stats" aria-label="Career stats">
				<article className="stat-bubble">
					<div className="stat-bubble__label">Roles</div>
					<div className="stat-bubble__value">
						{loading ? "—" : (stats?.jobs ?? 0)}
					</div>
					<div className="stat-bubble__meta">Tracked across your timeline</div>
				</article>
				<article className="stat-bubble">
					<div className="stat-bubble__label">Achievements</div>
					<div className="stat-bubble__value">
						{loading ? "—" : (stats?.achievements ?? 0)}
					</div>
					<div className="stat-bubble__meta">Proof points ready to reuse</div>
				</article>
				<article className="stat-bubble">
					<div className="stat-bubble__label">Current</div>
					<div className="stat-bubble__value" style={{ fontSize: "1.15rem" }}>
						{loading ? "—" : (stats?.currentRole ?? "—")}
					</div>
					<div className="stat-bubble__meta">Live role from D1</div>
				</article>
			</section>

			<section className="dashboard__section">
				<div className="dashboard__section-head">
					<div>
						<h2 className="dashboard__section-title">Job timeline</h2>
						<p className="dashboard__section-copy">
							Expand any row for achievements. Sort stacks across columns;
							filters stay above the table.
						</p>
					</div>
					<div className="density-toggle" role="group" aria-label="Table density">
						<button
							type="button"
							data-active={density === "default" ? "true" : "false"}
							onClick={() => setDensity("default")}
						>
							Default
						</button>
						<button
							type="button"
							data-active={density === "compact" ? "true" : "false"}
							onClick={() => setDensity("compact")}
						>
							Compact
						</button>
					</div>
				</div>

				{error ? <p className="dashboard__section-copy">{error}</p> : null}

				<TableExpandableRows
					columns={columns}
					data={jobs}
					rowKey={(row) => row.id}
					density={density}
					pageSize={3}
					activeRowKey={activeRowKey}
					onRowActivate={(row) => setActiveRowKey(row.id)}
					filters={filters}
					filterFn={(row, active) => {
						const status = active.status?.[0];
						if (status === "current" && !row.is_current) return false;
						if (status === "past" && row.is_current) return false;
						const types = active.type ?? [];
						if (types.length > 0 && !types.includes(row.employment_type)) {
							return false;
						}
						return true;
					}}
					renderExpanded={(row) => (
						<div className="job-expanded">
							<p className="job-expanded__summary">
								{row.summary ?? "No summary yet."}
							</p>
							<div className="job-expanded__list">
								{row.achievements.length === 0 ? (
									<p className="dashboard__section-copy">
										No achievements logged for this role.
									</p>
								) : (
									row.achievements.map((achievement) => (
										<article key={achievement.id} className="achievement-chip">
											<span className="achievement-chip__glyph">
												<LedMark />
											</span>
											<div>
												<div className="achievement-chip__title">
													{achievement.title}
												</div>
												<div className="achievement-chip__desc">
													{achievement.description}
												</div>
											</div>
											<div className="achievement-chip__metric">
												{achievement.impact_metric}
											</div>
										</article>
									))
								)}
							</div>
						</div>
					)}
					emptyMessage={loading ? "Loading jobs…" : "No jobs match these filters."}
				/>
			</section>
		</div>
	);
}
