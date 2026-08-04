import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PillSelect } from "../components/PillSelect";
import { SortableList } from "../components/SortableList";
import { TitleAndMetadataBar } from "../components/TitleAndMetadataBar/TitleAndMetadataBar";
import { apiGet, apiSend, ApiError } from "../lib/api";
import { formatDateHuman } from "../lib/dates";
import {
	compareJobs,
	JOB_LIBRARY_SORT_OPTIONS,
	readJobLibrarySort,
	writeJobLibrarySort,
	type JobLibrarySort,
} from "../lib/jobSort";
import type { Achievement, Job } from "../lib/types";
import "../styles/workspace.css";

type BulkLine = {
	body: string;
	tags?: string;
};

/** Normalize `a, b,, c` → `a, b, c`. */
function normalizeTags(raw: string): string | undefined {
	const tags = raw
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
	return tags.length > 0 ? tags.join(", ") : undefined;
}

function splitTags(tags: string | null | undefined): string[] {
	if (!tags) return [];
	return tags
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
}

/** Frontend body: one long string. Legacy metric/description folded in for display. */
function achievementBody(item: Achievement): string {
	return [item.title, item.impact_metric, item.description]
		.map((part) => part?.trim())
		.filter((part): part is string => Boolean(part))
		.join(" · ");
}

/** One per line. Optional labels: `achievement text | label1, label2`. */
function parseBulkLines(raw: string): BulkLine[] {
	const lines: BulkLine[] = [];
	for (const rawLine of raw.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;
		const separator = line.indexOf("|");
		const body =
			separator === -1
				? line
				: line.slice(0, separator).trim();
		if (!body) continue;
		const item: BulkLine = { body };
		if (separator !== -1) {
			const tags = normalizeTags(line.slice(separator + 1));
			if (tags) item.tags = tags;
		}
		lines.push(item);
	}
	return lines;
}

export function AchievementsPage() {
	const [jobs, setJobs] = useState<Job[]>([]);
	const [bulkByJob, setBulkByJob] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [bulkSavingJobId, setBulkSavingJobId] = useState<string | null>(null);
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

	async function remove(item: Achievement) {
		if (!confirm("Delete this achievement from the master library?")) return;
		setError(null);
		const previous = jobs;
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
						title: line.body,
						impact_metric: null,
						description: null,
						tags: line.tags ?? null,
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
						Proof points under each job. Paste many at once, reorder, and toggle
						them on per resume.
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
							<section
								key={job.id}
								className="workspace__panel workspace__panel--barred"
							>
								<TitleAndMetadataBar
									leftElements={[
										<h2 key="title" className="title-meta-bar__title">
											{job.title} · {job.company}
										</h2>,
										<span key="start" className="title-meta-bar__meta">
											{formatDateHuman(job.start_date, { fallback: "—" })}
										</span>,
										<span key="end" className="title-meta-bar__meta">
											{job.is_current || !job.end_date
												? "Present"
												: formatDateHuman(job.end_date, { fallback: "—" })}
										</span>,
										job.location ? (
											<span key="location" className="title-meta-bar__meta">
												{job.location}
											</span>
										) : null,
									]}
									rightElements={[
										<span key="count" className="counter-chip">
											{items.length}{" "}
											{items.length === 1 ? "item" : "items"}
										</span>,
									]}
								/>

								<div className="workspace__panel__body">
								<div className="achievement-stack">
									{items.length > 0 ? (
										<SortableList
											animate
											items={items}
											getId={(item) => item.id}
											onReorder={(ids) => void reorder(job.id, ids)}
											renderItem={(item, { dragHandleProps }) => {
												const labels = splitTags(item.tags);
												return (
													<div className="stack-item__head achievement-row">
														<div className="achievement-main">
															<p className="achievement-body">
																{achievementBody(item)}
															</p>
															{labels.length > 0 ? (
																<ul
																	className="achievement-labels"
																	aria-label="Labels"
																>
																	{labels.map((label) => (
																		<li
																			key={label}
																			className="achievement-label"
																		>
																			{label}
																		</li>
																	))}
																</ul>
															) : null}
														</div>
														<div className="stack-item__controls">
															<button type="button" {...dragHandleProps}>
																⋮⋮
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
												);
											}}
										/>
									) : null}

									<div className="bulk-add">
										<label className="sr-only" htmlFor={`bulk-${job.id}`}>
											Add achievements, one per line
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
												items.length === 0
													? "Paste achievements — one per line\nShipped checkout redesign that lifted conversion 12%\nCut p95 load time 40% across checkout | performance, ux"
													: "Add more — one per line\nAchievement text | label1, label2"
											}
											rows={items.length === 0 ? 4 : 2}
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
										<div className="bulk-add__footer">
											<span className="field__hint">
												text | label1, label2 · ⌘/Ctrl+Enter
											</span>
											{pendingLines.length > 0 ||
											bulkSavingJobId === job.id ? (
												<button
													type="button"
													className="btn btn--primary btn--sm"
													disabled={
														bulkSavingJobId === job.id ||
														pendingLines.length === 0
													}
													onClick={() => void bulkAdd(job.id)}
												>
													{bulkSavingJobId === job.id
														? "Adding…"
														: `Add ${pendingLines.length}`}
												</button>
											) : null}
										</div>
									</div>
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
