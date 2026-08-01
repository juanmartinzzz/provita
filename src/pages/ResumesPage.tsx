import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, apiSend, ApiError } from "../lib/api";
import type { ResumeListItem } from "../lib/types";
import "../styles/workspace.css";

export function ResumesPage() {
	const navigate = useNavigate();
	const [resumes, setResumes] = useState<ResumeListItem[]>([]);
	const [title, setTitle] = useState("");
	const [label, setLabel] = useState("");
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function load() {
		try {
			const data = await apiGet<{ resumes: ResumeListItem[] }>("/api/resumes");
			setResumes(data.resumes);
			setError(null);
		} catch {
			setError("Could not load resumes.");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void load();
	}, []);

	async function create() {
		setCreating(true);
		setError(null);
		try {
			const data = await apiSend<{ resume: { id: string } }>("/api/resumes", "POST", {
				title: title.trim() || "Untitled resume",
				label: label.trim() || null,
			});
			setTitle("");
			setLabel("");
			navigate(`/resumes/${data.resume.id}`);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Could not create resume.");
			setCreating(false);
		}
	}

	async function duplicate(id: string) {
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

	async function remove(id: string) {
		if (!confirm("Delete this resume version?")) return;
		try {
			await apiSend(`/api/resumes/${id}`, "DELETE");
			await load();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Could not delete resume.");
		}
	}

	return (
		<div className="workspace">
			<header className="workspace__header">
				<div>
					<div className="workspace__eyebrow">Versions</div>
					<h1 className="workspace__title">Resumes</h1>
					<p className="workspace__lede">
						Duplicate a base, customize selection and order, keep as many
						versions as you need.
					</p>
				</div>
				<div className="workspace__actions">
					<Link to="/summaries" className="btn btn--ghost">
						Summaries
					</Link>
					<Link to="/jobs" className="btn btn--ghost">
						Library
					</Link>
				</div>
			</header>

			<section className="workspace__panel">
				<h2 className="stack-item__title">New version</h2>
				<div className="field-grid field-grid--2" style={{ marginTop: "0.85rem" }}>
					<div className="field">
						<label htmlFor="res-title">Title</label>
						<input
							id="res-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g. Staff eng — Platform"
						/>
					</div>
					<div className="field">
						<label htmlFor="res-label">Label</label>
						<input
							id="res-label"
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							placeholder="e.g. FAANG, startup"
						/>
					</div>
				</div>
				<div className="workspace__actions" style={{ marginTop: "1rem" }}>
					<button
						type="button"
						className="btn btn--primary"
						disabled={creating}
						onClick={() => void create()}
					>
						{creating ? "Creating…" : "Create resume"}
					</button>
				</div>
				{error ? (
					<p className="workspace__error" style={{ marginTop: "0.75rem" }}>
						{error}
					</p>
				) : null}
			</section>

			<section className="workspace__panel">
				<div className="stack-item__head">
					<div>
						<h2 className="stack-item__title">Your versions</h2>
						<p className="stack-item__sub">
							Open any version to toggle jobs/bullets and reorder.
						</p>
					</div>
					<span className="counter-chip">{resumes.length} versions</span>
				</div>
				{loading ? (
					<p className="workspace__meta" style={{ marginTop: "0.85rem" }}>
						Loading…
					</p>
				) : resumes.length === 0 ? (
					<p className="empty-state" style={{ marginTop: "0.85rem" }}>
						No resume versions yet. Create one above.
					</p>
				) : (
					<div className="stack-list" style={{ marginTop: "0.85rem" }}>
						{resumes.map((resume) => (
							<article key={resume.id} className="stack-item">
								<div className="stack-item__head">
									<div>
										<div className="stack-item__title">{resume.title}</div>
										<div className="stack-item__sub">
											{resume.label ? `${resume.label} · ` : ""}
											{resume.enabled_jobs} jobs · {resume.enabled_bullets}/
											{resume.max_bullets} bullets
											{resume.summary_label
												? ` · ${resume.summary_label}`
												: " · No summary"}
										</div>
									</div>
									<div className="stack-item__controls">
										<Link
											to={`/resumes/${resume.id}`}
											className="btn btn--primary btn--sm"
										>
											Edit
										</Link>
										<button
											type="button"
											className="btn btn--ghost btn--sm"
											onClick={() => void duplicate(resume.id)}
										>
											Duplicate
										</button>
										<button
											type="button"
											className="btn btn--danger btn--sm"
											onClick={() => void remove(resume.id)}
										>
											Delete
										</button>
									</div>
								</div>
							</article>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
