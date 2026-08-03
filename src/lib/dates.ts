const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

/**
 * Human-readable calendar date: `2026-Jan-08`.
 * Accepts `YYYY-MM-DD` (preferred) or other Date-parseable strings.
 */
export function formatDateHuman(
	value: string | null | undefined,
	options?: { fallback?: string },
): string {
	if (!value) return options?.fallback ?? "";

	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
	if (match) {
		const year = match[1];
		const monthIndex = Number(match[2]) - 1;
		const day = match[3];
		const month = MONTHS[monthIndex];
		if (!month) return options?.fallback ?? value;
		return `${year}-${month}-${day}`;
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return options?.fallback ?? value;

	const month = MONTHS[date.getMonth()];
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

/** Range like `2024-Mar-01 – 2026-Jan-08` or `2024-Mar-01 – Present`. */
export function formatDateRange(
	start: string | null | undefined,
	end: string | null | undefined,
	options?: { current?: boolean; presentLabel?: string },
): string {
	const presentLabel = options?.presentLabel ?? "Present";
	const startLabel = formatDateHuman(start) || "—";
	const endLabel =
		options?.current || !end ? presentLabel : formatDateHuman(end) || presentLabel;
	return `${startLabel} – ${endLabel}`;
}
