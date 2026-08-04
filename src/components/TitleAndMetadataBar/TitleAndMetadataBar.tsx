import type { ReactNode } from "react";
import "./TitleAndMetadataBar.css";

export type TitleAndMetadataBarProps = {
	leftElements: ReactNode[];
	rightElements?: ReactNode[];
	className?: string;
};

function filterNodes(nodes: ReactNode[] | undefined): ReactNode[] {
	if (!nodes) return [];
	return nodes.filter((node) => {
		if (node === null || node === undefined || node === false || node === true) {
			return false;
		}
		if (typeof node === "string" && node.trim() === "") return false;
		return true;
	});
}

function renderGroup(
	nodes: ReactNode[],
	side: "left" | "right",
): ReactNode | null {
	if (nodes.length === 0) return null;
	return (
		<div
			className={
				side === "left"
					? "title-meta-bar__group title-meta-bar__group--left"
					: "title-meta-bar__group title-meta-bar__group--right"
			}
		>
			{nodes.map((node, index) => (
				<div key={index} className="title-meta-bar__item">
					{node}
				</div>
			))}
		</div>
	);
}

export function TitleAndMetadataBar({
	leftElements,
	rightElements,
	className = "",
}: TitleAndMetadataBarProps) {
	const left = filterNodes(leftElements);
	const right = filterNodes(rightElements);

	return (
		<div className={["title-meta-bar", className].filter(Boolean).join(" ")}>
			{renderGroup(left, "left")}
			{renderGroup(right, "right")}
		</div>
	);
}
