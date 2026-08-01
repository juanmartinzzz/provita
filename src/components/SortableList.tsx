import {
	type DragEvent,
	type ReactNode,
	useState,
} from "react";

type SortableListProps<T> = {
	items: T[];
	getId: (item: T) => string;
	onReorder: (orderedIds: string[]) => void;
	renderItem: (item: T, handleProps: { dragHandleProps: DragHandleProps }) => ReactNode;
};

export type DragHandleProps = {
	draggable: boolean;
	onDragStart: (event: DragEvent) => void;
	onDragEnd: () => void;
	className: string;
	title: string;
};

export function SortableList<T>({
	items,
	getId,
	onReorder,
	renderItem,
}: SortableListProps<T>) {
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);

	const reorder = (fromId: string, toId: string) => {
		if (fromId === toId) return;
		const ids = items.map(getId);
		const from = ids.indexOf(fromId);
		const to = ids.indexOf(toId);
		if (from < 0 || to < 0) return;
		const next = [...ids];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		onReorder(next);
	};

	return (
		<div className="stack-list">
			{items.map((item) => {
				const id = getId(item);
				const dragHandleProps: DragHandleProps = {
					draggable: true,
					className: "drag-handle",
					title: "Drag to reorder",
					onDragStart: (event) => {
						setDraggingId(id);
						event.dataTransfer.effectAllowed = "move";
						event.dataTransfer.setData("text/plain", id);
					},
					onDragEnd: () => {
						setDraggingId(null);
						setOverId(null);
					},
				};

				return (
					<div
						key={id}
						className="stack-item"
						data-dragging={draggingId === id ? "true" : "false"}
						data-over={overId === id ? "true" : "false"}
						onDragOver={(event) => {
							event.preventDefault();
							event.stopPropagation();
							setOverId(id);
						}}
						onDrop={(event) => {
							event.preventDefault();
							event.stopPropagation();
							const fromId = event.dataTransfer.getData("text/plain");
							if (fromId) reorder(fromId, id);
							setDraggingId(null);
							setOverId(null);
						}}
					>
						{renderItem(item, { dragHandleProps })}
					</div>
				);
			})}
		</div>
	);
}
