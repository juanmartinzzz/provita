import {
	Fragment,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
	type ReactNode,
} from "react";
import {
	IconChevron,
	IconDoubleChevron,
	IconSortAsc,
	IconSortDesc,
	IconSortNeutral,
} from "../icons/DotIcons";
import "./TableExpandableRows.css";

export type SortDirection = "asc" | "desc";

export type SortKey = {
	columnId: string;
	direction: SortDirection;
};

export type TableColumn<T> = {
	id: string;
	header: string;
	cell: (row: T) => ReactNode;
	sortable?: boolean;
	sortValue?: (row: T) => string | number | boolean | null | undefined;
	numeric?: boolean;
	width?: string;
};

export type FilterOption = {
	value: string;
	label: string;
};

export type TableFilter =
	| {
			id: string;
			label: string;
			type: "multi";
			options: FilterOption[];
	  }
	| {
			id: string;
			label: string;
			type: "single-pills";
			options: FilterOption[];
	  };

export type TableExpandableRowsProps<T> = {
	columns: TableColumn<T>[];
	data: T[];
	rowKey: (row: T) => string;
	renderExpanded: (row: T) => ReactNode;
	filters?: TableFilter[];
	filterFn?: (row: T, activeFilters: Record<string, string[]>) => boolean;
	pageSize?: number;
	density?: "default" | "compact";
	activeRowKey?: string | null;
	onRowActivate?: (row: T) => void;
	emptyMessage?: string;
};

function getPageList(current: number, total: number): Array<number | "ellipsis"> {
	if (total <= 7) {
		return Array.from({ length: total }, (_, i) => i + 1);
	}

	const pages = new Set<number>([1, total, current, current - 1, current + 1]);
	if (current <= 3) {
		pages.add(2);
		pages.add(3);
		pages.add(4);
	}
	if (current >= total - 2) {
		pages.add(total - 1);
		pages.add(total - 2);
		pages.add(total - 3);
	}

	const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
	const result: Array<number | "ellipsis"> = [];
	for (let i = 0; i < sorted.length; i += 1) {
		const page = sorted[i]!;
		const prev = sorted[i - 1];
		if (prev && page - prev > 1) result.push("ellipsis");
		result.push(page);
	}
	return result;
}

function MultiFilterDropdown({
	filter,
	selected,
	onChange,
}: {
	filter: Extract<TableFilter, { type: "multi" }>;
	selected: string[];
	onChange: (next: string[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const rootRef = useRef<HTMLDivElement>(null);
	const showSearch = filter.options.length > 8;

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		window.addEventListener("mousedown", onPointerDown);
		return () => window.removeEventListener("mousedown", onPointerDown);
	}, [open]);

	const options = filter.options.filter((option) =>
		option.label.toLowerCase().includes(query.toLowerCase()),
	);

	const label =
		selected.length === 0
			? filter.label
			: `${selected.length} selected`;

	return (
		<div className="ter__filter-control" ref={rootRef}>
			<button
				type="button"
				className="ter__filter-trigger"
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => setOpen((value) => !value)}
			>
				{label}
				<IconChevron direction={open ? "up" : "down"} size={14} />
			</button>
			{open ? (
				<div className="ter__dropdown" role="listbox" aria-multiselectable="true">
					{showSearch ? (
						<input
							className="ter__dropdown-search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search…"
							aria-label={`Search ${filter.label}`}
						/>
					) : null}
					{options.map((option) => {
						const isSelected = selected.includes(option.value);
						return (
							<button
								key={option.value}
								type="button"
								className="ter__option"
								role="option"
								aria-selected={isSelected}
								data-selected={isSelected ? "true" : "false"}
								onClick={() => {
									onChange(
										isSelected
											? selected.filter((value) => value !== option.value)
											: [...selected, option.value],
									);
								}}
							>
								<span className="ter__option-dot" />
								{option.label}
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

export function TableExpandableRows<T>({
	columns,
	data,
	rowKey,
	renderExpanded,
	filters = [],
	filterFn,
	pageSize = 5,
	density = "default",
	activeRowKey = null,
	onRowActivate,
	emptyMessage = "No results.",
}: TableExpandableRowsProps<T>) {
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});
	const [sortStack, setSortStack] = useState<SortKey[]>([]);
	const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
	const [page, setPage] = useState(1);
	const [gotoValue, setGotoValue] = useState("");

	const filtered = useMemo(() => {
		if (!filterFn) return data;
		return data.filter((row) => filterFn(row, activeFilters));
	}, [activeFilters, data, filterFn]);

	const sorted = useMemo(() => {
		if (sortStack.length === 0) return filtered;
		const columnsById = new Map(columns.map((column) => [column.id, column]));
		return [...filtered].sort((a, b) => {
			for (const key of sortStack) {
				const column = columnsById.get(key.columnId);
				if (!column) continue;
				const getter =
					column.sortValue ??
					((row: T) => {
						const value = column.cell(row);
						return typeof value === "string" || typeof value === "number" ? value : "";
					});
				const av = getter(a);
				const bv = getter(b);
				if (av == null && bv == null) continue;
				if (av == null) return 1;
				if (bv == null) return -1;
				let cmp = 0;
				if (typeof av === "number" && typeof bv === "number") {
					cmp = av - bv;
				} else {
					cmp = String(av).localeCompare(String(bv), undefined, {
						numeric: true,
						sensitivity: "base",
					});
				}
				if (cmp !== 0) return key.direction === "asc" ? cmp : -cmp;
			}
			return 0;
		});
	}, [columns, filtered, sortStack]);

	const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
	const currentPage = Math.min(page, totalPages);

	useEffect(() => {
		setPage(1);
	}, [activeFilters, pageSize, sortStack]);

	const pageRows = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return sorted.slice(start, start + pageSize);
	}, [currentPage, pageSize, sorted]);

	const rangeStart = sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
	const rangeEnd = Math.min(currentPage * pageSize, sorted.length);

	const cycleSort = (columnId: string) => {
		setSortStack((prev) => {
			const existingIndex = prev.findIndex((item) => item.columnId === columnId);
			if (existingIndex === -1) {
				return [...prev, { columnId, direction: "asc" }];
			}
			const existing = prev[existingIndex]!;
			if (existing.direction === "asc") {
				const next = [...prev];
				next[existingIndex] = { columnId, direction: "desc" };
				return next;
			}
			return prev.filter((item) => item.columnId !== columnId);
		});
	};

	const toggleExpanded = (key: string) => {
		setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const goToPage = (next: number) => {
		if (Number.isNaN(next)) return;
		setPage(Math.min(Math.max(1, next), totalPages));
	};

	const onGotoKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			goToPage(Number(gotoValue));
		}
	};

	return (
		<div className="ter" data-density={density === "compact" ? "compact" : "default"}>
			{filters.length > 0 ? (
				<div className="ter__filters">
					{filters.map((filter) => {
						if (filter.type === "single-pills") {
							const selected = activeFilters[filter.id]?.[0] ?? "";
							return (
								<div key={filter.id} className="ter__pills">
									<span className="ter__pills-label">{filter.label}</span>
									{filter.options.map((option) => (
										<button
											key={option.value}
											type="button"
											className="ter__pill"
											data-active={selected === option.value ? "true" : "false"}
											onClick={() =>
												setActiveFilters((prev) => ({
													...prev,
													[filter.id]:
														selected === option.value ? [] : [option.value],
												}))
											}
										>
											{option.label}
										</button>
									))}
								</div>
							);
						}

						return (
							<MultiFilterDropdown
								key={filter.id}
								filter={filter}
								selected={activeFilters[filter.id] ?? []}
								onChange={(next) =>
									setActiveFilters((prev) => ({ ...prev, [filter.id]: next }))
								}
							/>
						);
					})}
				</div>
			) : null}

			<div className="ter__shell">
				<div className="ter__scroll">
					<table className="ter__table">
						<thead>
							<tr>
								<th className="ter__th" style={{ width: 48 }} aria-label="Expand" />
								{columns.map((column) => {
									const sortIndex = sortStack.findIndex(
										(item) => item.columnId === column.id,
									);
									const sortKey = sortIndex >= 0 ? sortStack[sortIndex] : null;
									return (
										<th
											key={column.id}
											className={[
												"ter__th",
												column.sortable ? "ter__th--sortable" : "",
												column.numeric ? "ter__th--numeric" : "",
											]
												.filter(Boolean)
												.join(" ")}
											style={column.width ? { width: column.width } : undefined}
											onClick={
												column.sortable ? () => cycleSort(column.id) : undefined
											}
											scope="col"
										>
											<span className="ter__th-inner">
												{column.header}
												{column.sortable ? (
													sortKey ? (
														<>
															<span className="ter__sort-badge">{sortIndex + 1}</span>
															{sortKey.direction === "asc" ? (
																<IconSortAsc />
															) : (
																<IconSortDesc />
															)}
														</>
													) : (
														<IconSortNeutral />
													)
												) : null}
											</span>
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody>
							{pageRows.length === 0 ? (
								<tr>
									<td className="ter__empty" colSpan={columns.length + 1}>
										{emptyMessage}
									</td>
								</tr>
							) : (
								pageRows.map((row) => {
									const key = rowKey(row);
									const isExpanded = Boolean(expanded[key]);
									const isActive = activeRowKey === key;
									return (
										<Fragment key={key}>
											<tr
												className="ter__row"
												data-expanded={isExpanded ? "true" : "false"}
												data-active={isActive ? "true" : "false"}
												onClick={() => {
													toggleExpanded(key);
													onRowActivate?.(row);
												}}
											>
												<td className="ter__td">
													<button
														type="button"
														className="ter__expand-btn"
														data-open={isExpanded ? "true" : "false"}
														aria-expanded={isExpanded}
														aria-label={isExpanded ? "Collapse row" : "Expand row"}
														onClick={(event) => {
															event.stopPropagation();
															toggleExpanded(key);
															onRowActivate?.(row);
														}}
													>
														<IconChevron
															direction="right"
															size={density === "compact" ? 14 : 16}
														/>
													</button>
												</td>
												{columns.map((column) => (
													<td
														key={column.id}
														className={[
															"ter__td",
															column.numeric ? "ter__td--numeric" : "",
														]
															.filter(Boolean)
															.join(" ")}
													>
														{column.cell(row)}
													</td>
												))}
											</tr>
											<tr className="ter__expanded-row">
												<td colSpan={columns.length + 1}>
													<div
														className="ter__expanded-panel"
														data-open={isExpanded ? "true" : "false"}
														aria-hidden={!isExpanded}
													>
														<div className="ter__expanded-inner">
															<div className="ter__expanded-content">
																{renderExpanded(row)}
															</div>
														</div>
													</div>
												</td>
											</tr>
										</Fragment>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>

			<div className="ter__pagination">
				<div className="ter__results">
					Showing {rangeStart}–{rangeEnd} of {sorted.length} results.
				</div>

				<div className="ter__pages">
					<button
						type="button"
						className="ter__jump-btn"
						aria-label="First page"
						disabled={currentPage <= 1}
						onClick={() => goToPage(1)}
					>
						<IconDoubleChevron direction="left" size={14} />
					</button>
					<button
						type="button"
						className="ter__jump-btn"
						aria-label="Previous page"
						disabled={currentPage <= 1}
						onClick={() => goToPage(currentPage - 1)}
					>
						<IconChevron direction="left" size={14} />
					</button>

					{getPageList(currentPage, totalPages).map((item, index) =>
						item === "ellipsis" ? (
							<span key={`e-${index}`} className="ter__ellipsis">
								…
							</span>
						) : (
							<button
								key={item}
								type="button"
								className="ter__page-btn"
								data-active={item === currentPage ? "true" : "false"}
								onClick={() => goToPage(item)}
							>
								{item}
							</button>
						),
					)}

					<button
						type="button"
						className="ter__jump-btn"
						aria-label="Next page"
						disabled={currentPage >= totalPages}
						onClick={() => goToPage(currentPage + 1)}
					>
						<IconChevron direction="right" size={14} />
					</button>
					<button
						type="button"
						className="ter__jump-btn"
						aria-label="Last page"
						disabled={currentPage >= totalPages}
						onClick={() => goToPage(totalPages)}
					>
						<IconDoubleChevron direction="right" size={14} />
					</button>
				</div>

				<div className="ter__goto">
					<input
						className="ter__goto-input"
						inputMode="numeric"
						pattern="[0-9]*"
						value={gotoValue}
						onChange={(event) =>
							setGotoValue(event.target.value.replace(/[^\d]/g, ""))
						}
						onKeyDown={onGotoKeyDown}
						aria-label="Go to page"
						placeholder="#"
					/>
					<button
						type="button"
						className="ter__go-btn"
						onClick={() => goToPage(Number(gotoValue))}
					>
						Go
					</button>
				</div>
			</div>
		</div>
	);
}
