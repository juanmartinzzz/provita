import { useState } from "react";

type Option = { value: string; label: string };

type PillSelectProps = {
	options: readonly Option[] | Option[];
	value: string | string[];
	onChange: (value: string | string[]) => void;
	multiple?: boolean;
	initialVisible?: number;
	ariaLabel?: string;
};

export function PillSelect({
	options,
	value,
	onChange,
	multiple = false,
	initialVisible = 4,
	ariaLabel,
}: PillSelectProps) {
	const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
	const needsMore = options.length > initialVisible;
	const [expanded, setExpanded] = useState(!needsMore);
	const visible = expanded ? options : options.slice(0, initialVisible);

	return (
		<div className="pill-list" role="group" aria-label={ariaLabel}>
			{visible.map((option) => {
				const active = selected.has(option.value);
				return (
					<button
						key={option.value}
						type="button"
						className="pill"
						data-active={active ? "true" : "false"}
						aria-pressed={active}
						onClick={() => {
							if (multiple) {
								const next = new Set(selected);
								if (next.has(option.value)) next.delete(option.value);
								else next.add(option.value);
								onChange([...next]);
							} else {
								onChange(option.value);
							}
						}}
					>
						{option.label}
					</button>
				);
			})}
			{needsMore ? (
				<button
					type="button"
					className="pill pill--more"
					onClick={() => setExpanded((prev) => !prev)}
				>
					{expanded ? "Show less" : "Show more"}
				</button>
			) : null}
		</div>
	);
}
