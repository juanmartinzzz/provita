import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PillSelect } from "../components/PillSelect";
import { SortableList } from "../components/SortableList";
import { apiGet, apiSend, ApiError } from "../lib/api";
import type { Achievement, Job } from "../lib/types";
import "../styles/workspace.css";

type AchievementForm = {
	job_id: string;
	title: string;
	description: string;
	impact_metric: string;
	tags: string;
	achieved_at: string;
};

const emptyForm = (jobId = ""): AchievementForm => ({
	job_id: jobId,
	title: "",
	description: "",
	impact_metric: "",
	tags: "",
	achieved_at: "",
});

export function AchievementsPage() {
	const [jobs, setJobs] = useState<Job[]>([]);
	const [achievements, setAchievements] = useState<Achievement[]>([]);
	const [filterJobId, setFilterJobId] = useState<string>("all");
	const [form, setForm] = useState<AchievementForm>(emptyForm());
	const [editingId, setEditingId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function load() {
		try {
			const [jobsData, achData] = await Promise.all([
				apiGet<{ jobs: Job[] }>("/api/jobs"),
				apiGet<{ achievements: Achievement[] }>("/api/achievements"),
			]);
			setJobs(jobsData.jobs);
			setAchievements(achData.achievements);
			setForm((prev) =>
				prev.job_id
					? prev
					: emptyForm(jobsData.jobs[0]?.id ?? ""),
			);
			setError(null);
		} catch {
			setError("Could not load achievements.");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void load();
	}, []);

	const jobOptions = useMemo(
		() => [
			{ value: "all", label: "All jobs" },
			...jobs.map((job) => ({
				value: job.id,
				label: `${job.company}`,
			})),
		],
		[jobs],
	);

	const visible = useMemo(() => {
		const list =
			filterJobId === "all"
				? achievements
				: achievements.filter((item) => item.job_id === filterJobId);
		return [...list].sort((a, b) => a.sort_order - b.sort_order);
	}, [achievements, filterJobId]);

	async function save() {
		setSaving(true);
		setError(null);
		try {
			const payload = {
				job_id: form.job_id,
				title: form.title,
				description: form.description || null,
				impact_metric: form.impact_metric || null,
				tags: form.tags || null,
				achieved_at: form.achieved_at || null,
			};
			if (editingId) {
				await apiSend(`/api/achievements/${editingId}`, "PATCH", payload);
			} else {
				await apiSend("/api/achievements", "POST", payload);
			}
			setForm(emptyForm(form.job_id));
			setEditingId(null);
			await load();
		} catch (err) {
			setError(
				err instanceof ApiError ? err.message : "Could not save achievement.",
			);
		} finally {
			setSaving(false);
		}
	}

	async function remove(id: string) {
		if (!confirm("Delete this achievement from the master library?")) return;
		try {
			await apiSend(`/api/achievements/${id}`, "DELETE");
			if (editingId === id) {
				setEditingId(null);
				setForm(emptyForm(form.job_id));
			}
			await load();
		} catch (err) {
			setError(
				err instanceof ApiError ? err.message : "Could not delete achievement.",
			);
		}
	}

	async function reorder(orderedIds: string[]) {
		const jobId =
			filterJobId === "all" ? visible[0]?.job_id : filterJobId;
		if (!jobId || filterJobId === "all") {
			setError("Filter to a single job to reorder its bullets.");
			return;
		}
		const previous = achievements;
		setAchievements((current) => {
			const byId = new Map(current.map((item) => [item.id, item]));
			return orderedIds
				.map((id, index) => {
					const item = byId.get(id);
					return item ? { ...item, sort_order: index } : null;
				})
				.filter((item): item is Achievement => Boolean(item))
				.concat(current.filter((item) => item.job_id !== jobId));
		});
		try {
			await apiSend("/api/achievements/reorder", "PUT", {
				job_id: jobId,
				ordered_ids: orderedIds,
			});
		} catch {
			setAchievements(previous);
			setError("Could not reorder achievements.");
		}
	}

	return (
		<div className="workspace">
			<header className="workspace__header">
				<div>
					<div className="workspace__eyebrow">Master library</div>
					<h1 className="workspace__title">Achievements</h1>
					<p className="workspace__lede">
						Unlimited proof points under each job. Resume versions toggle
						individual bullets on or off.
					</p>
				</div>
				<div className="workspace__actions">
					<Link to="/jobs" className="btn btn--ghost">
						Jobs
					</Link>
					<Link to="/resumes" className="btn btn--primary">
						Build resume
					</Link>
				</div>
			</header>

			<section className="workspace__panel">
				<h2 className="stack-item__title">
					{editingId ? "Edit achievement" : "Add achievement"}
				</h2>
				{jobs.length === 0 ? (
					<p className="empty-state" style={{ marginTop: "0.85rem" }}>
						Add a job first, then log achievements against it.
					</p>
				) : (
					<>
						<div className="field" style={{ marginTop: "0.85rem" }}>
							<label>Job</label>
							<PillSelect
								ariaLabel="Job"
								options={jobs.map((job) => ({
									value: job.id,
									label: job.company,
								}))}
								value={form.job_id}
								onChange={(value) =>
									setForm({ ...form, job_id: String(value) })
								}
							/>
						</div>
						<div
							className="field-grid field-grid--2"
							style={{ marginTop: "0.85rem" }}
						>
							<div className="field">
								<label htmlFor="ach-title">Title</label>
								<input
									id="ach-title"
									value={form.title}
									onChange={(e) => setForm({ ...form, title: e.target.value })}
								/>
							</div>
							<div className="field">
								<label htmlFor="ach-metric">Impact metric</label>
								<input
									id="ach-metric"
									value={form.impact_metric}
									onChange={(e) =>
										setForm({ ...form, impact_metric: e.target.value })
									}
									placeholder="e.g. 3.2x faster"
								/>
							</div>
							<div className="field">
								<label htmlFor="ach-date">Date</label>
								<input
									id="ach-date"
									type="date"
									value={form.achieved_at}
									onChange={(e) =>
										setForm({ ...form, achieved_at: e.target.value })
									}
								/>
							</div>
							<div className="field">
								<label htmlFor="ach-tags">Tags</label>
								<input
									id="ach-tags"
									value={form.tags}
									onChange={(e) => setForm({ ...form, tags: e.target.value })}
									placeholder="product,ux"
								/>
							</div>
						</div>
						<div className="field" style={{ marginTop: "0.85rem" }}>
							<label htmlFor="ach-desc">Description</label>
							<textarea
								id="ach-desc"
								value={form.description}
								onChange={(e) =>
									setForm({ ...form, description: e.target.value })
								}
							/>
						</div>
						<div className="workspace__actions" style={{ marginTop: "1rem" }}>
							<button
								type="button"
								className="btn btn--primary"
								disabled={saving || !form.job_id || !form.title}
								onClick={() => void save()}
							>
								{saving
									? "Saving…"
									: editingId
										? "Update achievement"
										: "Add achievement"}
							</button>
							{editingId ? (
								<button
									type="button"
									className="btn btn--ghost"
									onClick={() => {
										setEditingId(null);
										setForm(emptyForm(form.job_id));
									}}
								>
									Cancel
								</button>
							) : null}
						</div>
					</>
				)}
				{error ? (
					<p className="workspace__error" style={{ marginTop: "0.75rem" }}>
						{error}
					</p>
				) : null}
			</section>

			<section className="workspace__panel">
				<div className="stack-item__head">
					<div>
						<h2 className="stack-item__title">Library</h2>
						<p className="stack-item__sub">
							Filter to one job to drag-reorder its bullets.
						</p>
					</div>
					<span className="counter-chip">{achievements.length} items</span>
				</div>
				<div className="field" style={{ marginTop: "0.85rem" }}>
					<label>Filter</label>
					<PillSelect
						ariaLabel="Filter by job"
						options={jobOptions}
						value={filterJobId}
						onChange={(value) => setFilterJobId(String(value))}
					/>
				</div>
				{loading ? (
					<p className="workspace__meta" style={{ marginTop: "0.85rem" }}>
						Loading…
					</p>
				) : visible.length === 0 ? (
					<p className="empty-state" style={{ marginTop: "0.85rem" }}>
						No achievements yet.
					</p>
				) : (
					<div style={{ marginTop: "0.85rem" }}>
						<SortableList
							items={visible}
							getId={(item) => item.id}
							onReorder={(ids) => void reorder(ids)}
							renderItem={(item, { dragHandleProps }) => (
								<>
									<div className="stack-item__head">
										<div>
											<div className="stack-item__title">{item.title}</div>
											<div className="stack-item__sub">
												{item.job_company ?? "Job"} · {item.job_title}
												{item.impact_metric ? ` · ${item.impact_metric}` : ""}
											</div>
										</div>
										<div className="stack-item__controls">
											{filterJobId !== "all" ? (
												<button type="button" {...dragHandleProps}>
													⋮⋮
												</button>
											) : null}
											<button
												type="button"
												className="btn btn--ghost btn--sm"
												onClick={() => {
													setEditingId(item.id);
													setForm({
														job_id: item.job_id,
														title: item.title,
														description: item.description ?? "",
														impact_metric: item.impact_metric ?? "",
														tags: item.tags ?? "",
														achieved_at: item.achieved_at ?? "",
													});
												}}
											>
												Edit
											</button>
											<button
												type="button"
												className="btn btn--danger btn--sm"
												onClick={() => void remove(item.id)}
											>
												Delete
											</button>
										</div>
									</div>
									{item.description ? (
										<p className="stack-item__sub">{item.description}</p>
									) : null}
								</>
							)}
						/>
					</div>
				)}
			</section>
		</div>
	);
}
