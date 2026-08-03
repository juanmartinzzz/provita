import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PillSelect } from "../components/PillSelect";
import {
	SectionsCard,
	type SectionsCardSection,
} from "../components/SectionsCard/SectionsCard";
import {
	SortableList,
	type DragHandleProps,
} from "../components/SortableList";
import { apiGet, apiSend, ApiError } from "../lib/api";
import { formatDateRange } from "../lib/dates";
import {
	compareJobs,
	JOB_LIBRARY_SORT_OPTIONS,
	readJobLibrarySort,
	writeJobLibrarySort,
	type JobLibrarySort,
} from "../lib/jobSort";
import { EMPLOYMENT_OPTIONS, type Job } from "../lib/types";
import "../styles/workspace.css";

type JobForm = {
	company: string;
	title: string;
	location: string;
	employment_type: string;
	start_date: string;
	end_date: string;
	is_current: boolean;
	summary: string;
};

const emptyForm = (): JobForm => ({
	company: "",
	title: "",
	location: "",
	employment_type: "full_time",
	start_date: "",
	end_date: "",
	is_current: false,
	summary: "",
});

function toForm(job: Job): JobForm {
	return {
		company: job.company,
		title: job.title,
		location: job.location ?? "",
		employment_type: job.employment_type,
		start_date: job.start_date,
		end_date: job.end_date ?? "",
		is_current: job.is_current,
		summary: job.summary ?? "",
	};
}

export function JobsPage() {
	const [jobs, setJobs] = useState<Job[]>([]);
	const [form, setForm] = useState<JobForm>(emptyForm);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [librarySort, setLibrarySort] = useState<JobLibrarySort>(() =>
		readJobLibrarySort(),
	);

	const sortedJobs = useMemo(
		() => [...jobs].sort((a, b) => compareJobs(a, b, librarySort)),
		[jobs, librarySort],
	);

	function setSort(next: JobLibrarySort) {
		setLibrarySort(next);
		writeJobLibrarySort(next);
	}

	async function load() {
		try {
			const data = await apiGet<{ jobs: Job[] }>("/api/jobs");
			setJobs(data.jobs);
			setError(null);
		} catch {
			setError("Could not load jobs.");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void load();
	}, []);

	async function save() {
		setSaving(true);
		setError(null);
		try {
			const payload = {
				...form,
				location: form.location || null,
				end_date: form.is_current ? null : form.end_date || null,
				summary: form.summary || null,
			};
			if (editingId) {
				await apiSend(`/api/jobs/${editingId}`, "PATCH", payload);
			} else {
				await apiSend("/api/jobs", "POST", payload);
			}
			setForm(emptyForm());
			setEditingId(null);
			await load();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Could not save job.");
		} finally {
			setSaving(false);
		}
	}

	async function remove(id: string) {
		if (!confirm("Delete this job and its achievements?")) return;
		try {
			await apiSend(`/api/jobs/${id}`, "DELETE");
			if (editingId === id) {
				setEditingId(null);
				setForm(emptyForm());
			}
			await load();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Could not delete job.");
		}
	}

	async function reorder(orderedIds: string[]) {
		const previous = jobs;
		setJobs(
			orderedIds
				.map((id, index) => {
					const job = previous.find((item) => item.id === id);
					return job ? { ...job, sort_order: index } : null;
				})
				.filter((job): job is Job => Boolean(job)),
		);
		try {
			await apiSend("/api/jobs/reorder", "PUT", { ordered_ids: orderedIds });
		} catch {
			setJobs(previous);
			setError("Could not reorder jobs.");
		}
	}

	const formSections: SectionsCardSection[] = [
		{
			id: "role",
			title: "Role",
			description: "Who you worked for and what you were called.",
			columns: [
				<div key="company" className="field">
					<label htmlFor="job-company">Company</label>
					<input
						id="job-company"
						value={form.company}
						onChange={(e) => setForm({ ...form, company: e.target.value })}
					/>
				</div>,
				<div key="title" className="field">
					<label htmlFor="job-title">Title</label>
					<input
						id="job-title"
						value={form.title}
						onChange={(e) => setForm({ ...form, title: e.target.value })}
					/>
				</div>,
			],
		},
		{
			id: "details",
			title: "Details",
			description: "Where and how you were employed.",
			columns: [
				<div key="location" className="field">
					<label htmlFor="job-location">Location</label>
					<input
						id="job-location"
						value={form.location}
						onChange={(e) => setForm({ ...form, location: e.target.value })}
					/>
				</div>,
				<div key="employment" className="field">
					<label>Employment</label>
					<PillSelect
						ariaLabel="Employment type"
						options={EMPLOYMENT_OPTIONS}
						value={form.employment_type}
						onChange={(value) =>
							setForm({ ...form, employment_type: String(value) })
						}
					/>
				</div>,
			],
		},
		{
			id: "tenure",
			title: "Tenure",
			description: "When this role started and ended.",
			columns: [
				<div key="start" className="field">
					<label htmlFor="job-start">Start date</label>
					<input
						id="job-start"
						type="date"
						value={form.start_date}
						onChange={(e) => setForm({ ...form, start_date: e.target.value })}
					/>
				</div>,
				<div key="end" className="sections-card__stack">
					<div className="field">
						<label htmlFor="job-end">End date</label>
						<input
							id="job-end"
							type="date"
							disabled={form.is_current}
							value={form.end_date}
							onChange={(e) => setForm({ ...form, end_date: e.target.value })}
						/>
					</div>
					<button
						type="button"
						className="toggle"
						data-on={form.is_current ? "true" : "false"}
						onClick={() =>
							setForm((prev) => ({
								...prev,
								is_current: !prev.is_current,
								end_date: !prev.is_current ? "" : prev.end_date,
							}))
						}
					>
						Current role
					</button>
				</div>,
			],
		},
		{
			id: "summary",
			title: "Summary",
			description: "Optional short narrative for this role.",
			collapsible: true,
			defaultCollapsed: !form.summary,
			columns: [
				<div key="summary" className="field">
					<label htmlFor="job-summary">Role summary</label>
					<textarea
						id="job-summary"
						value={form.summary}
						onChange={(e) => setForm({ ...form, summary: e.target.value })}
						placeholder="Short narrative for this role"
					/>
				</div>,
			],
		},
	];

	function renderLibraryJob(job: Job, dragHandleProps?: DragHandleProps) {
		return (
			<>
				<div className="stack-item__head">
					<div>
						<div className="stack-item__title">
							{job.title} · {job.company}
						</div>
						<div className="stack-item__sub">
							{formatDateRange(job.start_date, job.end_date, {
								current: job.is_current,
							})}
							{" · "}
							{job.location ?? "No location"}
							{" · "}
							{job.achievements.length} achievements
							{job.is_current ? " · Current" : ""}
						</div>
					</div>
					<div className="stack-item__controls">
						{dragHandleProps ? (
							<button type="button" {...dragHandleProps}>
								⋮⋮
							</button>
						) : null}
						<button
							type="button"
							className="btn btn--ghost btn--sm"
							onClick={() => {
								setEditingId(job.id);
								setForm(toForm(job));
							}}
						>
							Edit
						</button>
						<button
							type="button"
							className="btn btn--danger btn--sm"
							onClick={() => void remove(job.id)}
						>
							Delete
						</button>
					</div>
				</div>
				{job.summary ? <p className="stack-item__sub">{job.summary}</p> : null}
			</>
		);
	}

	return (
		<div className="workspace">
			<header className="workspace__header">
				<div>
					<div className="workspace__eyebrow">Master library</div>
					<h1 className="workspace__title">Jobs</h1>
					<p className="workspace__lede">
						Store every role in one place. Resume versions pick which jobs and
						bullets to show.
					</p>
				</div>
				<div className="workspace__actions">
					<Link to="/achievements" className="btn btn--ghost">
						Achievements
					</Link>
					<Link to="/resumes" className="btn btn--primary">
						Resumes
					</Link>
				</div>
			</header>

			<SectionsCard
				key={editingId ?? "new"}
				id="jobs.form"
				title={editingId ? "Edit job" : "Add job"}
				meta={
					editingId ? (
						<span>Editing an existing role in your master library</span>
					) : (
						<span>New role for your master library</span>
					)
				}
				sections={formSections}
				footer={
					<>
						<button
							type="button"
							className="btn btn--primary"
							disabled={
								saving || !form.company || !form.title || !form.start_date
							}
							onClick={() => void save()}
						>
							{saving ? "Saving…" : editingId ? "Update job" : "Add job"}
						</button>
						{editingId ? (
							<button
								type="button"
								className="btn btn--ghost"
								onClick={() => {
									setEditingId(null);
									setForm(emptyForm());
								}}
							>
								Cancel
							</button>
						) : null}
						{error ? <p className="workspace__error">{error}</p> : null}
					</>
				}
			/>

			<section className="workspace__panel">
				<div className="stack-item__head">
					<div>
						<h2 className="stack-item__title">Library</h2>
						<p className="stack-item__sub">
							{librarySort === "custom"
								? "Drag to set master order used by resumes."
								: "Sorted for browsing — switch to Custom order to rearrange."}
						</p>
					</div>
					<span className="counter-chip">{jobs.length} roles</span>
				</div>

				<div className="field" style={{ marginTop: "0.85rem" }}>
					<label>Sort</label>
					<PillSelect
						ariaLabel="Library sort"
						options={JOB_LIBRARY_SORT_OPTIONS}
						value={librarySort}
						onChange={(value) => setSort(String(value) as JobLibrarySort)}
					/>
				</div>

				{loading ? (
					<p className="workspace__meta" style={{ marginTop: "0.85rem" }}>
						Loading…
					</p>
				) : jobs.length === 0 ? (
					<p className="empty-state" style={{ marginTop: "0.85rem" }}>
						No jobs yet. Add your first role above.
					</p>
				) : librarySort === "custom" ? (
					<div style={{ marginTop: "0.85rem" }}>
						<SortableList
							items={sortedJobs}
							getId={(job) => job.id}
							onReorder={(ids) => void reorder(ids)}
							renderItem={(job, { dragHandleProps }) =>
								renderLibraryJob(job, dragHandleProps)
							}
						/>
					</div>
				) : (
					<div className="stack-list" style={{ marginTop: "0.85rem" }}>
						{sortedJobs.map((job) => (
							<div key={job.id} className="stack-item">
								{renderLibraryJob(job)}
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
