import type { Job } from "./types";

export const JOB_LIBRARY_SORT_STORAGE_KEY = "provita.jobs.library-sort";

export const JOB_LIBRARY_SORT_OPTIONS = [
	{ value: "newest", label: "End date · newest" },
	{ value: "oldest", label: "End date · oldest" },
	{ value: "company", label: "Company A–Z" },
	{ value: "custom", label: "Custom order" },
] as const;

export type JobLibrarySort = (typeof JOB_LIBRARY_SORT_OPTIONS)[number]["value"];

/** Current / open-ended roles sort as the most recent end date. */
export function jobEndSortKey(job: Job): string {
	if (job.is_current || !job.end_date) return "9999-12-31";
	return job.end_date;
}

export function readJobLibrarySort(): JobLibrarySort {
	try {
		const raw = window.localStorage.getItem(JOB_LIBRARY_SORT_STORAGE_KEY);
		if (JOB_LIBRARY_SORT_OPTIONS.some((option) => option.value === raw)) {
			return raw as JobLibrarySort;
		}
	} catch {
		// ignore
	}
	return "newest";
}

export function writeJobLibrarySort(next: JobLibrarySort) {
	try {
		window.localStorage.setItem(JOB_LIBRARY_SORT_STORAGE_KEY, next);
	} catch {
		// ignore
	}
}

export function compareJobs(a: Job, b: Job, mode: JobLibrarySort): number {
	switch (mode) {
		case "oldest":
			return (
				jobEndSortKey(a).localeCompare(jobEndSortKey(b)) ||
				a.start_date.localeCompare(b.start_date) ||
				a.sort_order - b.sort_order
			);
		case "company":
			return (
				a.company.localeCompare(b.company, undefined, { sensitivity: "base" }) ||
				jobEndSortKey(b).localeCompare(jobEndSortKey(a)) ||
				a.sort_order - b.sort_order
			);
		case "custom":
			return a.sort_order - b.sort_order;
		case "newest":
		default:
			return (
				jobEndSortKey(b).localeCompare(jobEndSortKey(a)) ||
				b.start_date.localeCompare(a.start_date) ||
				a.sort_order - b.sort_order
			);
	}
}
