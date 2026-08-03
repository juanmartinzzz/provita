import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PillSelect } from "../components/PillSelect";
import { SortableList } from "../components/SortableList";
import { apiGet, apiSend, ApiError } from "../lib/api";
import { formatDateRange } from "../lib/dates";
import {
	compareJobs,
	JOB_LIBRARY_SORT_OPTIONS,
	readJobLibrarySort,
	writeJobLibrarySort,
	type JobLibrarySort,
} from "../lib/jobSort";
import type { Achievement, Job } from "../lib/types";
import "../styles/workspace.css";

type Draft = {
	title: string;
	description: string;
	impact_metric: string;
	tags: string;
	achieved_at: string;
};

type BulkLine = {
	title: string;
	impact_metric?: string;
	description?: string;
};

function toDraft(item: Achievement): Draft {
	return {
		title: item.title,
		description: item.description ?? "",
		impact_metric: item.impact_metric ?? "",
		tags: item.tags ?? "",
		achieved_at: item.achieved_at ?? "",
	};
}

/** One achievement per line. Optional: `title | metric | description`. */
function parseBulkLines(raw: string): BulkLine[] {
	const lines: BulkLine[] = [];
	for (const rawLine of raw.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;
		const parts = line.split("|").map((part) => part.trim());
		const title = parts[0] ?? "";
		if (!title) continue;
		const item: BulkLine = { title };
		if (parts[1]) item.impact_metric = parts[1];
		if (parts[2]) item.description = parts[2];
		lines.push(item);
	}
	return lines;
}

export function AchievementsPage() {
	const [jobs, setJobs] = useState<Job[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draft, setDraft] = useState<Draft | null>(null);
	const [bulkByJob, setBulkByJob] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [bulkSavingJobId, setBulkSavingJobId] = useState<string | null>(null);
	const [cloningId, setCloningId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [librarySort, setLibrarySort] = useState<JobLibrarySort>(() =>
		readJobLibrarySort(),
	);

	async function load() {
		try {
			const data = await apiGet<{ jobs: Job[] }>("/api/jobs");
			setJobs(data.jobs);
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

	const sortedJobs = useMemo(
		() => [...jobs].sort((a, b) => compareJobs(a, b, librarySort)),
		[jobs, librarySort],
	);

	const totalAchievements = useMemo(
		() => jobs.reduce((count, job) => count + job.achievements.length, 0),
		[jobs],
	);

	function setSort(next: JobLibrarySort) {
		setLibrarySort(next);
		writeJobLibrarySort(next);
	}

	function achievementsFor(job: Job): Achievement[] {
		return [...job.achievements].sort((a, b) => a.sort_order - b.sort_order);
	}

	function setJobAchievements(
		jobId: string,
		updater: (list: Achievement[]) => Achievement[],
	) {
		setJobs((current) =>
			current.map((job) =>
				job.id === jobId
					? { ...job, achievements: updater(job.achievements) }
					: job,
			),
		);
	}

	function startEdit(item: Achievement) {
		setEditingId(item.id);
		setDraft(toDraft(item));
	}

	function cancelEdit() {
		setEditingId(null);
		setDraft(null);
	}

	async function saveEdit(item: Achievement) {
		if (!draft || !draft.title.trim()) return;
		setSavingId(item.id);
		setError(null);
		try {
			const payload = {
				job_id: item.job_id,
				title: draft.title.trim(),
				description: draft.description || null,
				impact_metric: draft.impact_metric || null,
				tags: draft.tags || null,
				achieved_at: draft.achieved_at || null,
			};
			const result = await apiSend<{ achievement: Achievement }>(
				`/api/achievements/${item.id}`,
				"PATCH",
				payload,
			);
			setJobAchievements(item.job_id, (list) =>
				list.map((row) =>
					row.id === item.id ? { ...row, ...result.achievement } : row,
				),
			);
			cancelEdit();
		} catch (err) {
			setError(
				err instanceof ApiError ? err.message : "Could not save achievement.",
			);
		} finally {
			setSavingId(null);
		}
	}

	async function remove(item: Achievement) {
		if (!confirm("Delete this achievement from the master library?")) return;
		setError(null);
		const previous = jobs;
		if (editingId === item.id) cancelEdit();
		setJobAchievements(item.job_id, (list) =>
			list.filter((row) => row.id !== item.id),
		);
		try {
			await apiSend(`/api/achievements/${item.id}`, "DELETE");
		} catch (err) {
			setJobs(previous);
			setError(
				err instanceof ApiError ? err.message : "Could not delete achievement.",
			);
		}
	}

	async function clone(item: Achievement) {
		setCloningId(item.id);
		setError(null);
		try {
			const result = await apiSend<{ achievement: Achievement }>(
				`/api/achievements/${item.id}/duplicate`,
				"POST",
			);
			const created = result.achievement;
			setJobAchievements(item.job_id, (list) => {
				const sorted = [...list].sort((a, b) => a.sort_order - b.sort_order);
				const index = sorted.findIndex((row) => row.id === item.id);
				const next = sorted.map((row) =>
					row.sort_order >= created.sort_order && row.id !== created.id
						? { ...row, sort_order: row.sort_order + 1 }
						: row,
				);
				next.splice(index + 1, 0, created);
				return next;
			});
			startEdit(created);
		} catch (err) {
			setError(
				err instanceof ApiError ? err.message : "Could not clone achievement.",
			);
		} finally {
			setCloningId(null);
		}
	}

	async function reorder(jobId: string, orderedIds: string[]) {
		const previous = jobs;
		setJobAchievements(jobId, (list) => {
			const byId = new Map(list.map((item) => [item.id, item]));
			return orderedIds
				.map((id, index) => {
					const item = byId.get(id);
					return item ? { ...item, sort_order: index } : null;
				})
				.filter((item): item is Achievement => Boolean(item));
		});
		try {
			await apiSend("/api/achievements/reorder", "PUT", {
				job_id: jobId,
				ordered_ids: orderedIds,
			});
		} catch {
			setJobs(previous);
			setError("Could not reorder achievements.");
		}
	}

	async function bulkAdd(jobId: string) {
		const lines = parseBulkLines(bulkByJob[jobId] ?? "");
		if (lines.length === 0) return;
		setBulkSavingJobId(jobId);
		setError(null);
		try {
			const result = await apiSend<{ achievements: Achievement[] }>(
				"/api/achievements/bulk",
				"POST",
				{
					job_id: jobId,
					items: lines.map((line) => ({
						title: line.title,
						impact_metric: line.impact_metric ?? null,
						description: line.description ?? null,
					})),
				},
			);
			setJobAchievements(jobId, (list) => [...list, ...result.achievements]);
			setBulkByJob((prev) => ({ ...prev, [jobId]: "" }));
		} catch (err) {
			setError(
				err instanceof ApiError ? err.message : "Could not add achievements.",
			);
		} finally {
			setBulkSavingJobId(null);
		}
	}

	return (
		<div className="workspace">
			<header className="workspace__header">
				<div>
					<div className="workspace__eyebrow">Master library</div>
					<h1 className="workspace__title">Achievements</h1>
					<p className="workspace__lede">
						Proof points under each job. Add many at once, edit in place, then
						toggle them on per resume.
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

			{error ? <p className="workspace__error">{error}</p> : null}

			{loading ? (
				<p className="workspace__meta">Loading…</p>
			) : jobs.length === 0 ? (
				<section className="workspace__panel">
					<div className="empty-state empty-state--action">
						<p>
							Add a job first, then log achievements against each role.
						</p>
						<Link to="/jobs" className="btn btn--primary">
							Go to Jobs
						</Link>
					</div>
				</section>
			) : (
				<>
					<section className="workspace__panel">
						<div className="stack-item__head">
							<div>
								<p className="workspace__meta" style={{ margin: 0 }}>
									{totalAchievements} achievements across {jobs.length} job
									{jobs.length === 1 ? "" : "s"}. Roles are read-only here —{" "}
									<Link to="/jobs" className="inline-link">
										edit jobs
									</Link>
									.
								</p>
							</div>
						</div>
						<div className="field" style={{ marginTop: "0.85rem" }}>
							<label>Sort jobs</label>
							<PillSelect
								ariaLabel="Job sort"
								options={JOB_LIBRARY_SORT_OPTIONS}
								value={librarySort}
								onChange={(value) => setSort(String(value) as JobLibrarySort)}
							/>
						</div>
					</section>

					{sortedJobs.map((job) => {
						const items = achievementsFor(job);
						const bulkText = bulkByJob[job.id] ?? "";
						const pendingLines = parseBulkLines(bulkText);
						return (
							<section key={job.id} className="workspace__panel">
								<div className="stack-item__head">
									<div>
										<h2 className="stack-item__title">
											{job.title} · {job.company}
										</h2>
										<p className="stack-item__sub">
											{formatDateRange(job.start_date, job.end_date, {
												current: job.is_current,
											})}
											{job.location ? ` · ${job.location}` : ""}
										</p>
									</div>
									<span className="counter-chip">{items.length} items</span>
								</div>

								{items.length > 0 ? (
									<div style={{ marginTop: "0.85rem" }}>
										<SortableList
											animate
											items={items}
											getId={(item) => item.id}
											onReorder={(ids) => void reorder(job.id, ids)}
											renderItem={(item, { dragHandleProps }) => {
												const isEditing =
													editingId === item.id && draft !== null;
												return (
													<>
														<div className="stack-item__head">
															<div>
																<div className="stack-item__title">
																	{item.title}
																</div>
																<div className="stack-item__sub">
																	{item.impact_metric
																		? item.impact_metric
																		: "No metric"}
																	{item.tags ? ` · ${item.tags}` : ""}
																</div>
															</div>
															<div className="stack-item__controls">
																<button type="button" {...dragHandleProps}>
																	⋮⋮
																</button>
																<button
																	type="button"
																	className="btn btn--ghost btn--sm"
																	onClick={() =>
																		isEditing
																			? cancelEdit()
																			: startEdit(item)
																	}
																>
																	{isEditing ? "Close" : "Edit"}
																</button>
																<button
																	type="button"
																	className="btn btn--ghost btn--sm"
																	disabled={cloningId === item.id}
																	onClick={() => void clone(item)}
																>
																	{cloningId === item.id
																		? "Cloning…"
																		: "Clone"}
																</button>
																<button
																	type="button"
																	className="btn btn--danger btn--sm"
																	onClick={() => void remove(item)}
																>
																	Delete
																</button>
															</div>
														</div>

														<AnimatePresence initial={false}>
															{isEditing && draft ? (
																<motion.div
																	key="edit"
																	className="achievement-edit"
																	initial={{ opacity: 0, height: 0 }}
																	animate={{ opacity: 1, height: "auto" }}
																	exit={{ opacity: 0, height: 0 }}
																	transition={{ duration: 0.22 }}
																>
																	<div className="field-grid field-grid--2">
																		<div className="field">
																			<label htmlFor={`ach-title-${item.id}`}>
																				Title
																			</label>
																			<input
																				id={`ach-title-${item.id}`}
																				value={draft.title}
																				onChange={(e) =>
																					setDraft({
																						...draft,
																						title: e.target.value,
																					})
																				}
																			/>
																		</div>
																		<div className="field">
																			<label htmlFor={`ach-metric-${item.id}`}>
																				Impact metric
																			</label>
																			<input
																				id={`ach-metric-${item.id}`}
																				value={draft.impact_metric}
																				onChange={(e) =>
																					setDraft({
																						...draft,
																						impact_metric: e.target.value,
																					})
																				}
																				placeholder="e.g. 3.2x faster"
																			/>
																		</div>
																		<div className="field">
																			<label htmlFor={`ach-date-${item.id}`}>
																				Date
																			</label>
																			<input
																				id={`ach-date-${item.id}`}
																				type="date"
																				value={draft.achieved_at}
																				onChange={(e) =>
																					setDraft({
																						...draft,
																						achieved_at: e.target.value,
																					})
																				}
																			/>
																		</div>
																		<div className="field">
																			<label htmlFor={`ach-tags-${item.id}`}>
																				Tags
																			</label>
																			<input
																				id={`ach-tags-${item.id}`}
																				value={draft.tags}
																				onChange={(e) =>
																					setDraft({
																						...draft,
																						tags: e.target.value,
																					})
																				}
																				placeholder="product,ux"
																			/>
																		</div>
																	</div>
																	<div
																		className="field"
																		style={{ marginTop: "0.85rem" }}
																	>
																		<label htmlFor={`ach-desc-${item.id}`}>
																			Description
																		</label>
																		<textarea
																			id={`ach-desc-${item.id}`}
																			value={draft.description}
																			onChange={(e) =>
																				setDraft({
																					...draft,
																					description: e.target.value,
																				})
																			}
																		/>
																	</div>
																	<div
																		className="workspace__actions"
																		style={{ marginTop: "0.85rem" }}
																	>
																		<button
																			type="button"
																			className="btn btn--primary btn--sm"
																			disabled={
																				savingId === item.id ||
																				!draft.title.trim()
																			}
																			onClick={() => void saveEdit(item)}
																		>
																			{savingId === item.id
																				? "Saving…"
																				: "Save"}
																		</button>
																		<button
																			type="button"
																			className="btn btn--ghost btn--sm"
																			onClick={cancelEdit}
																		>
																			Cancel
																		</button>
																	</div>
																</motion.div>
															) : item.description ? (
																<p className="stack-item__sub">
																	{item.description}
																</p>
															) : null}
														</AnimatePresence>
													</>
												);
											}}
										/>
									</div>
								) : null}

								<div
									className={
										items.length === 0
											? "bulk-add empty-state"
											: "bulk-add"
									}
									style={{ marginTop: items.length === 0 ? "0.85rem" : "1rem" }}
								>
									<div className="field">
										<label htmlFor={`bulk-${job.id}`}>
											{items.length === 0
												? "No achievements yet — paste one per line"
												: "Add achievements (one per line)"}
										</label>
										<textarea
											id={`bulk-${job.id}`}
											className="bulk-add__textarea"
											value={bulkText}
											onChange={(e) =>
												setBulkByJob((prev) => ({
													...prev,
													[job.id]: e.target.value,
												}))
											}
											placeholder={
												"Shipped checkout redesign\nCut load time 40% | 40% faster | Partnered with infra\nGrew NPS 12 pts"
											}
											onKeyDown={(e) => {
												if (
													(e.metaKey || e.ctrlKey) &&
													e.key === "Enter"
												) {
													e.preventDefault();
													void bulkAdd(job.id);
												}
											}}
										/>
										<p className="field__hint">
											Optional format: title | metric | description. ⌘/Ctrl+Enter
											to add.
										</p>
									</div>
									<div
										className="workspace__actions"
										style={{ marginTop: "0.75rem" }}
									>
										<button
											type="button"
											className="btn btn--primary"
											disabled={
												bulkSavingJobId === job.id ||
												pendingLines.length === 0
											}
											onClick={() => void bulkAdd(job.id)}
										>
											{bulkSavingJobId === job.id
												? "Adding…"
												: pendingLines.length > 0
													? `Add ${pendingLines.length} achievement${pendingLines.length === 1 ? "" : "s"}`
													: "Add achievements"}
										</button>
									</div>
								</div>
							</section>
						);
					})}
				</>
			)}
		</div>
	);
}
