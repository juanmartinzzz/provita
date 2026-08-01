export type Achievement = {
	id: string;
	job_id: string;
	title: string;
	description: string | null;
	impact_metric: string | null;
	tags: string | null;
	achieved_at: string | null;
	sort_order: number;
	created_at?: string;
	updated_at?: string;
	job_company?: string;
	job_title?: string;
};

export type Job = {
	id: string;
	company: string;
	title: string;
	location: string | null;
	employment_type: string;
	start_date: string;
	end_date: string | null;
	is_current: boolean;
	summary: string | null;
	sort_order: number;
	created_at?: string;
	updated_at?: string;
	achievements: Achievement[];
};

export type ProfessionalSummary = {
	id: string;
	label: string;
	body: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

export type ResumeListItem = {
	id: string;
	title: string;
	label: string | null;
	summary_id: string | null;
	summary_label: string | null;
	max_bullets: number;
	notes: string | null;
	duplicated_from: string | null;
	created_at: string;
	updated_at: string;
	enabled_jobs: number;
	enabled_bullets: number;
};

export type ResumeAchievement = Achievement & {
	enabled: boolean;
	resume_sort_order: number;
	in_resume: boolean;
};

export type ResumeJob = Omit<Job, "achievements"> & {
	enabled: boolean;
	resume_sort_order: number;
	in_resume: boolean;
	achievements: ResumeAchievement[];
};

export type ResumeDetail = {
	resume: {
		id: string;
		title: string;
		label: string | null;
		summary_id: string | null;
		max_bullets: number;
		notes: string | null;
		duplicated_from: string | null;
		created_at: string;
		updated_at: string;
		enabled_bullet_count: number;
	};
	summary: ProfessionalSummary | null;
	jobs: ResumeJob[];
};

export type Stats = {
	jobs: number;
	achievements: number;
	resumes: number;
	summaries: number;
	currentRole: string;
};

export const EMPLOYMENT_OPTIONS = [
	{ value: "full_time", label: "Full-time" },
	{ value: "part_time", label: "Part-time" },
	{ value: "contract", label: "Contract" },
	{ value: "internship", label: "Internship" },
] as const;

export const SUMMARY_MAX_CHARS = 500;
export const DEFAULT_MAX_BULLETS = 5;
