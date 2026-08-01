import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PillSelect } from "../components/PillSelect";
import { SortableList } from "../components/SortableList";
import { apiGet, apiSend, ApiError } from "../lib/api";
import type {
	ProfessionalSummary,
	ResumeDetail,
	ResumeJob,
} from "../lib/types";
import "../styles/workspace.css";

export function ResumeEditorPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [detail, setDetail] = useState<ResumeDetail | null>(null);
	const [summaries, setSummaries] = useState<ProfessionalSummary[]>([]);
	const [title, setTitle] = useState("");
	const [label, setLabel] = useState("");
	const [notes, setNotes] = useState("");
	const [maxBullets, setMaxBullets] = useState(5);
	const [summaryId, setSummaryId] = useState<string | null>(null);
	const [jobs, setJobs] = useState<ResumeJob[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [syncingId, setSyncingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [draftBullets, setDraftBullets] = useState<
		Record<string, { title: string; description: string; impact_metric: string }>
	>({});

	async function load() {
		if (!id) return;
		try {
			const [resumeData, summaryData] = await Promise.all([
				apiGet<ResumeDetail>(`/api/resumes/${id}`),
				apiGet<{ summaries: ProfessionalSummary[] }>("/api/summaries"),
			]);
			setDetail(resumeData);
			setSummaries(summaryData.summaries);
			setTitle(resumeData.resume.title);
			setLabel(resumeData.resume.label ?? "");
			setNotes(resumeData.resume.notes ?? "");
			setMaxBullets(resumeData.resume.max_bullets);
			setSummaryId(resumeData.resume.summary_id);
			setJobs(resumeData.jobs);
			const drafts: typeof draftBullets = {};
			for (const job of resumeData.jobs) {
				for (const achievement of job.achievements) {
					drafts[achievement.id] = {
						title: achievement.title,
						description: achievement.description ?? "",
						impact_metric: achievement.impact_metric ?? "",
					};
				}
			}
			setDraftBullets(drafts);
			setError(null);
		} catch {
			setError("Could not load resume version.");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void load();
	}, [id]);

	const enabledBullets = useMemo(
		() =>
			jobs.reduce(
				(count, job) =>
					count + job.achievements.filter((item) => item.enabled).length,
				0,
			),
		[jobs],
	);

	const orderedJobs = useMemo(
		() =>
			[...jobs].sort(
				(a, b) => a.resume_sort_order - b.resume_sort_order || a.sort_order - b.sort_order,
			),
		[jobs],
	);

	function selectionPayload(nextJobs: ResumeJob[]) {
		const sortedJobs = [...nextJobs].sort(
			(a, b) => a.resume_sort_order - b.resume_sort_order,
		);
		return {
			jobs: sortedJobs.map((job, index) => ({
				job_id: job.id,
				enabled: job.enabled,
				sort_order: index,
			})),
			achievements: sortedJobs.flatMap((job) =>
				[...job.achievements]
					.sort((a, b) => a.resume_sort_order - b.resume_sort_order)
					.map((achievement, index) => ({
						achievement_id: achievement.id,
						enabled: achievement.enabled,
						sort_order: index + job.resume_sort_order * 100,
					})),
			),
		};
	}

	async function persist(
		nextJobs: ResumeJob[],
		overrides?: {
			title?: string;
			label?: string;
			notes?: string;
			max_bullets?: number;
			summary_id?: string | null;
		},
	) {
		if (!id) return;
		setSaving(true);
		setError(null);
		setMessage(null);
		try {
			const data = await apiSend<ResumeDetail>(`/api/resumes/${id}`, "PATCH", {
				title: overrides?.title ?? title,
				label: (overrides?.label ?? label) || null,
				notes: (overrides?.notes ?? notes) || null,
				max_bullets: overrides?.max_bullets ?? maxBullets,
				summary_id:
					overrides && "summary_id" in overrides
						? overrides.summary_id
						: summaryId,
				...selectionPayload(nextJobs),
			});
			setDetail(data);
			setJobs(data.jobs);
			setMessage("Saved.");
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Could not save resume.");
			await load();
		} finally {
			setSaving(false);
		}
	}

	function toggleJob(jobId: string) {
		const next = jobs.map((job) =>
			job.id === jobId ? { ...job, enabled: !job.enabled } : job,
		);
		setJobs(next);
		void persist(next);
	}

	function toggleAchievement(jobId: string, achievementId: string) {
		const target = jobs
			.flatMap((job) => job.achievements)
			.find((item) => item.id === achievementId);
		if (!target) return;

		if (!target.enabled && enabledBullets >= maxBullets) {
			setError(`Max ${maxBullets} bullets. Turn one off first.`);
			return;
		}

		const next = jobs.map((job) =>
			job.id !== jobId
				? job
				: {
						...job,
						achievements: job.achievements.map((item) =>
							item.id === achievementId
								? { ...item, enabled: !item.enabled }
								: item,
						),
					},
		);
		setJobs(next);
		void persist(next);
	}

	function reorderJobs(orderedIds: string[]) {
		const next = orderedIds
			.map((jobId, index) => {
				const job = jobs.find((item) => item.id === jobId);
				return job ? { ...job, resume_sort_order: index } : null;
			})
			.filter((job): job is ResumeJob => Boolean(job));
		setJobs(next);
		void persist(next);
	}

	function reorderAchievements(jobId: string, orderedIds: string[]) {
		const next = jobs.map((job) => {
			if (job.id !== jobId) return job;
			const byId = new Map(job.achievements.map((item) => [item.id, item]));
			return {
				...job,
				achievements: orderedIds
					.map((achievementId, index) => {
						const item = byId.get(achievementId);
						return item ? { ...item, resume_sort_order: index } : null;
					})
					.filter((item): item is ResumeJob["achievements"][number] =>
						Boolean(item),
					),
			};
		});
		setJobs(next);
		void persist(next);
	}

	async function syncAchievement(achievementId: string) {
		if (!id) return;
		const draft = draftBullets[achievementId];
		if (!draft) return;
		setSyncingId(achievementId);
		setError(null);
		try {
			const data = await apiSend<ResumeDetail & { ok: boolean }>(
				`/api/resumes/${id}/sync-to-master`,
				"POST",
				{
					target: "achievement",
					id: achievementId,
					fields: {
						title: draft.title,
						description: draft.description || null,
						impact_metric: draft.impact_metric || null,
					},
				},
			);
			setDetail(data);
			setJobs(data.jobs);
			setMessage("Synced bullet to master library.");
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Sync failed.");
		} finally {
			setSyncingId(null);
		}
	}

	async function duplicate() {
		if (!id) return;
		try {
			const data = await apiSend<{ resume: { id: string } }>(
				`/api/resumes/${id}/duplicate`,
				"POST",
			);
			navigate(`/resumes/${data.resume.id}`);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Could not duplicate.");
		}
	}

	if (loading) {
		return (
			<div className="workspace">
				<p className="workspace__meta">Loading resume…</p>
			</div>
		);
	}

	if (!detail) {
		return (
			<div className="workspace">
				<p className="workspace__error">{error ?? "Resume not found."}</p>
				<Link to="/resumes" className="btn btn--ghost">
					Back to resumes
				</Link>
			</div>
		);
	}

	const summaryOptions = [
		{ value: "", label: "None" },
		...summaries.map((summary) => ({
			value: summary.id,
			label: summary.label,
		})),
	];

	return (
		<div className="workspace">
			<header className="workspace__header">
				<div>
					<div className="workspace__eyebrow">Resume editor</div>
					<h1 className="workspace__title">{title || "Untitled"}</h1>
					<p className="workspace__lede">
						Toggle jobs and bullets, drag to reorder, cap at {maxBullets}{" "}
						bullets. Edits can sync back to the master library.
					</p>
				</div>
				<div className="workspace__actions">
					<Link to="/resumes" className="btn btn--ghost">
						All versions
					</Link>
					<button type="button" className="btn btn--ghost" onClick={() => void duplicate()}>
						Duplicate
					</button>
					<span
						className="counter-chip"
						data-over={enabledBullets > maxBullets ? "true" : "false"}
					>
						{enabledBullets}/{maxBullets} bullets
					</span>
				</div>
			</header>

			{(error || message) && (
				<section className="workspace__panel">
					{error ? <p className="workspace__error">{error}</p> : null}
					{message ? <p className="workspace__meta">{message}</p> : null}
				</section>
			)}

			<section className="workspace__panel">
				<h2 className="stack-item__title">Version details</h2>
				<div className="field-grid field-grid--2" style={{ marginTop: "0.85rem" }}>
					<div className="field">
						<label htmlFor="re-title">Title</label>
						<input
							id="re-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							onBlur={() => void persist(jobs, { title })}
						/>
					</div>
					<div className="field">
						<label htmlFor="re-label">Label</label>
						<input
							id="re-label"
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							onBlur={() => void persist(jobs, { label })}
						/>
					</div>
					<div className="field">
						<label htmlFor="re-max">Max bullets</label>
						<input
							id="re-max"
							type="number"
							min={1}
							max={50}
							value={maxBullets}
							onChange={(e) => setMaxBullets(Number(e.target.value) || 1)}
							onBlur={() => void persist(jobs, { max_bullets: maxBullets })}
						/>
					</div>
					<div className="field">
						<label>Professional summary</label>
						<PillSelect
							ariaLabel="Summary"
							options={summaryOptions}
							value={summaryId ?? ""}
							onChange={(value) => {
								const next = String(value) || null;
								setSummaryId(next);
								void persist(jobs, { summary_id: next });
							}}
						/>
					</div>
				</div>
				<div className="field" style={{ marginTop: "0.85rem" }}>
					<label htmlFor="re-notes">Notes</label>
					<textarea
						id="re-notes"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						onBlur={() => void persist(jobs, { notes })}
						placeholder="Private notes for this version"
					/>
				</div>
				{detail.summary ? (
					<p className="stack-item__sub" style={{ marginTop: "0.75rem" }}>
						Active summary: {detail.summary.body}
					</p>
				) : null}
				{saving ? (
					<p className="workspace__meta" style={{ marginTop: "0.65rem" }}>
						Saving…
					</p>
				) : null}
			</section>

			<section className="workspace__panel">
				<div className="stack-item__head">
					<div>
						<h2 className="stack-item__title">Modular selection</h2>
						<p className="stack-item__sub">
							Turn jobs and bullets on/off. Drag handles reorder this version
							only.
						</p>
					</div>
				</div>

				<div style={{ marginTop: "0.85rem" }}>
					<SortableList
						items={orderedJobs}
						getId={(job) => job.id}
						onReorder={(ids) => reorderJobs(ids)}
						renderItem={(job, { dragHandleProps }) => (
							<>
								<div className="stack-item__head">
									<div>
										<div className="stack-item__title">
											{job.title} · {job.company}
										</div>
										<div className="stack-item__sub">
											{job.achievements.filter((item) => item.enabled).length}{" "}
											bullets on
										</div>
									</div>
									<div className="stack-item__controls">
										<button type="button" {...dragHandleProps}>
											⋮⋮
										</button>
										<button
											type="button"
											className="toggle"
											data-on={job.enabled ? "true" : "false"}
											onClick={() => toggleJob(job.id)}
										>
											{job.enabled ? "Job on" : "Job off"}
										</button>
									</div>
								</div>

								{job.enabled ? (
									<div style={{ marginTop: "0.35rem" }}>
										<SortableList
											items={[...job.achievements].sort(
												(a, b) =>
													a.resume_sort_order - b.resume_sort_order ||
													a.sort_order - b.sort_order,
											)}
											getId={(item) => item.id}
											onReorder={(ids) => reorderAchievements(job.id, ids)}
											renderItem={(achievement, achHandle) => {
												const draft = draftBullets[achievement.id] ?? {
													title: achievement.title,
													description: achievement.description ?? "",
													impact_metric: achievement.impact_metric ?? "",
												};
												return (
													<>
														<div className="stack-item__head">
															<div>
																<div className="stack-item__title">
																	{achievement.title}
																</div>
																<div className="stack-item__sub">
																	{achievement.impact_metric ?? "No metric"}
																</div>
															</div>
															<div className="stack-item__controls">
																<button type="button" {...achHandle.dragHandleProps}>
																	⋮⋮
																</button>
																<button
																	type="button"
																	className="toggle"
																	data-on={
																		achievement.enabled ? "true" : "false"
																	}
																	onClick={() =>
																		toggleAchievement(job.id, achievement.id)
																	}
																>
																	{achievement.enabled
																		? "Bullet on"
																		: "Bullet off"}
																</button>
															</div>
														</div>
														{achievement.enabled ? (
															<div
																className="field-grid"
																style={{ marginTop: "0.55rem" }}
															>
																<div className="field">
																	<label>Bullet title</label>
																	<input
																		value={draft.title}
																		onChange={(e) =>
																			setDraftBullets((prev) => ({
																				...prev,
																				[achievement.id]: {
																					...draft,
																					title: e.target.value,
																				},
																			}))
																		}
																	/>
																</div>
																<div className="field">
																	<label>Description</label>
																	<textarea
																		value={draft.description}
																		onChange={(e) =>
																			setDraftBullets((prev) => ({
																				...prev,
																				[achievement.id]: {
																					...draft,
																					description: e.target.value,
																				},
																			}))
																		}
																	/>
																</div>
																<div className="field">
																	<label>Impact</label>
																	<input
																		value={draft.impact_metric}
																		onChange={(e) =>
																			setDraftBullets((prev) => ({
																				...prev,
																				[achievement.id]: {
																					...draft,
																					impact_metric: e.target.value,
																				},
																			}))
																		}
																	/>
																</div>
																<div>
																	<button
																		type="button"
																		className="btn btn--ghost btn--sm"
																		disabled={syncingId === achievement.id}
																		onClick={() =>
																			void syncAchievement(achievement.id)
																		}
																	>
																		{syncingId === achievement.id
																			? "Syncing…"
																			: "Sync to master"}
																	</button>
																</div>
															</div>
														) : null}
													</>
												);
											}}
										/>
									</div>
								) : null}
							</>
						)}
					/>
				</div>
			</section>
		</div>
	);
}
