import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SortableList } from "../components/SortableList";
import { apiGet, apiSend, ApiError } from "../lib/api";
import {
	SUMMARY_MAX_CHARS,
	type ProfessionalSummary,
} from "../lib/types";
import "../styles/workspace.css";

type SummaryForm = { label: string; body: string };

const emptyForm = (): SummaryForm => ({ label: "", body: "" });

export function SummariesPage() {
	const [summaries, setSummaries] = useState<ProfessionalSummary[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [form, setForm] = useState<SummaryForm>(emptyForm);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function load() {
		try {
			const data = await apiGet<{ summaries: ProfessionalSummary[] }>(
				"/api/summaries",
			);
			setSummaries(data.summaries);
			setActiveId((current) => current ?? data.summaries[0]?.id ?? null);
			setError(null);
		} catch {
			setError("Could not load summaries.");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void load();
	}, []);

	const active = summaries.find((item) => item.id === activeId) ?? null;

	async function save() {
		setSaving(true);
		setError(null);
		try {
			if (form.body.length > SUMMARY_MAX_CHARS) {
				throw new ApiError(400, `Max ${SUMMARY_MAX_CHARS} characters`);
			}
			if (editingId) {
				const data = await apiSend<{ summary: ProfessionalSummary }>(
					`/api/summaries/${editingId}`,
					"PATCH",
					form,
				);
				setActiveId(data.summary.id);
			} else {
				const data = await apiSend<{ summary: ProfessionalSummary }>(
					"/api/summaries",
					"POST",
					form,
				);
				setActiveId(data.summary.id);
			}
			setForm(emptyForm());
			setEditingId(null);
			await load();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Could not save summary.");
		} finally {
			setSaving(false);
		}
	}

	async function remove(id: string) {
		if (!confirm("Delete this professional summary?")) return;
		try {
			await apiSend(`/api/summaries/${id}`, "DELETE");
			if (activeId === id) setActiveId(null);
			if (editingId === id) {
				setEditingId(null);
				setForm(emptyForm());
			}
			await load();
		} catch (err) {
			setError(
				err instanceof ApiError ? err.message : "Could not delete summary.",
			);
		}
	}

	async function reorder(orderedIds: string[]) {
		const previous = summaries;
		setSummaries(
			orderedIds
				.map((id, index) => {
					const item = previous.find((row) => row.id === id);
					return item ? { ...item, sort_order: index } : null;
				})
				.filter((item): item is ProfessionalSummary => Boolean(item)),
		);
		try {
			await apiSend("/api/summaries/reorder", "PUT", {
				ordered_ids: orderedIds,
			});
		} catch {
			setSummaries(previous);
			setError("Could not reorder summaries.");
		}
	}

	return (
		<div className="workspace">
			<header className="workspace__header">
				<div>
					<div className="workspace__eyebrow">Profiles</div>
					<h1 className="workspace__title">Summaries</h1>
					<p className="workspace__lede">
						Create labeled {SUMMARY_MAX_CHARS}-character profiles and switch
						between them on any resume version.
					</p>
				</div>
				<div className="workspace__actions">
					<Link to="/resumes" className="btn btn--primary">
						Attach to resume
					</Link>
				</div>
			</header>

			<section className="workspace__panel">
				<div className="stack-item__head">
					<div>
						<h2 className="stack-item__title">Switch profile</h2>
						<p className="stack-item__sub">
							Select a labeled summary to preview it.
						</p>
					</div>
				</div>
				{loading ? (
					<p className="workspace__meta" style={{ marginTop: "0.85rem" }}>
						Loading…
					</p>
				) : summaries.length === 0 ? (
					<p className="empty-state" style={{ marginTop: "0.85rem" }}>
						No summaries yet. Create your first profile below.
					</p>
				) : (
					<>
						<div className="pill-list" style={{ marginTop: "0.85rem" }}>
							{summaries.map((summary) => (
								<button
									key={summary.id}
									type="button"
									className="pill"
									data-active={activeId === summary.id ? "true" : "false"}
									onClick={() => setActiveId(summary.id)}
								>
									{summary.label}
								</button>
							))}
						</div>
						{active ? (
							<div className="workspace__panel" style={{ marginTop: "0.85rem", boxShadow: "none" }}>
								<div className="stack-item__title">{active.label}</div>
								<p className="stack-item__sub" style={{ marginTop: "0.55rem", whiteSpace: "pre-wrap" }}>
									{active.body}
								</p>
								<p className="field__hint" style={{ marginTop: "0.65rem" }}>
									{active.body.length}/{SUMMARY_MAX_CHARS}
								</p>
							</div>
						) : null}
					</>
				)}
			</section>

			<section className="workspace__panel">
				<h2 className="stack-item__title">
					{editingId ? "Edit summary" : "New summary"}
				</h2>
				<div className="field" style={{ marginTop: "0.85rem" }}>
					<label htmlFor="sum-label">Label</label>
					<input
						id="sum-label"
						value={form.label}
						onChange={(e) => setForm({ ...form, label: e.target.value })}
						placeholder="e.g. Product eng, Leadership, Startup"
					/>
				</div>
				<div className="field" style={{ marginTop: "0.85rem" }}>
					<label htmlFor="sum-body">Body</label>
					<textarea
						id="sum-body"
						value={form.body}
						maxLength={SUMMARY_MAX_CHARS}
						onChange={(e) => setForm({ ...form, body: e.target.value })}
						placeholder="Short professional profile"
					/>
					<p className="field__hint">
						{form.body.length}/{SUMMARY_MAX_CHARS}
					</p>
				</div>
				<div className="workspace__actions" style={{ marginTop: "1rem" }}>
					<button
						type="button"
						className="btn btn--primary"
						disabled={saving || !form.label || !form.body}
						onClick={() => void save()}
					>
						{saving ? "Saving…" : editingId ? "Update summary" : "Add summary"}
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
						<h2 className="stack-item__title">All summaries</h2>
						<p className="stack-item__sub">Drag to reorder your library.</p>
					</div>
				</div>
				{summaries.length === 0 ? (
					<p className="empty-state" style={{ marginTop: "0.85rem" }}>
						Nothing here yet.
					</p>
				) : (
					<div style={{ marginTop: "0.85rem" }}>
						<SortableList
							items={summaries}
							getId={(item) => item.id}
							onReorder={(ids) => void reorder(ids)}
							renderItem={(item, { dragHandleProps }) => (
								<div className="stack-item__head">
									<div>
										<div className="stack-item__title">{item.label}</div>
										<div className="stack-item__sub">
											{item.body.slice(0, 120)}
											{item.body.length > 120 ? "…" : ""}
										</div>
									</div>
									<div className="stack-item__controls">
										<button type="button" {...dragHandleProps}>
											⋮⋮
										</button>
										<button
											type="button"
											className="btn btn--ghost btn--sm"
											onClick={() => {
												setEditingId(item.id);
												setForm({ label: item.label, body: item.body });
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
							)}
						/>
					</div>
				)}
			</section>
		</div>
	);
}
