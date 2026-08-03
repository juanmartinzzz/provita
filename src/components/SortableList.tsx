import {
	type DragEvent,
	type ReactNode,
	useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

type SortableListProps<T> = {
	items: T[];
	getId: (item: T) => string;
	onReorder: (orderedIds: string[]) => void;
	renderItem: (item: T, handleProps: { dragHandleProps: DragHandleProps }) => ReactNode;
	/** Animate enter/exit (clone, delete). Off by default for other pages. */
	animate?: boolean;
};

export type DragHandleProps = {
	draggable: boolean;
	onDragStart: (event: DragEvent) => void;
	onDragEnd: () => void;
	className: string;
	title: string;
};

const enterExit = {
	initial: { opacity: 0, y: -10, scale: 0.97 },
	animate: { opacity: 1, y: 0, scale: 1 },
	exit: { opacity: 0, x: 28, scale: 0.96 },
	transition: { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.8 },
};

export function SortableList<T>({
	items,
	getId,
	onReorder,
	renderItem,
	animate = false,
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

	const nodes = items.map((item) => {
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

		const dragProps = {
			onDragOver: (event: DragEvent) => {
				event.preventDefault();
				event.stopPropagation();
				setOverId(id);
			},
			onDrop: (event: DragEvent) => {
				event.preventDefault();
				event.stopPropagation();
				const fromId = event.dataTransfer.getData("text/plain");
				if (fromId) reorder(fromId, id);
				setDraggingId(null);
				setOverId(null);
			},
		};

		if (animate) {
			return (
				<motion.div
					key={id}
					layout
					className="stack-item"
					data-dragging={draggingId === id ? "true" : "false"}
					data-over={overId === id ? "true" : "false"}
					initial={enterExit.initial}
					animate={enterExit.animate}
					exit={enterExit.exit}
					transition={enterExit.transition}
					{...dragProps}
				>
					{renderItem(item, { dragHandleProps })}
				</motion.div>
			);
		}

		return (
			<div
				key={id}
				className="stack-item"
				data-dragging={draggingId === id ? "true" : "false"}
				data-over={overId === id ? "true" : "false"}
				{...dragProps}
			>
				{renderItem(item, { dragHandleProps })}
			</div>
		);
	});

	return (
		<div className="stack-list">
			{animate ? (
				<AnimatePresence initial={false}>{nodes}</AnimatePresence>
			) : (
				nodes
			)}
		</div>
	);
}
