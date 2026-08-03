import type { SVGProps } from "react";

type Dot = {
	cx: number;
	cy: number;
	r?: number;
};

export type IconProps = SVGProps<SVGSVGElement> & {
	size?: number;
	/** When true, one accent-colored dot marks the icon as active/selected. */
	active?: boolean;
};

type DotIconProps = IconProps & {
	dots: Dot[];
	/** Index of the accent dot when `active` is true. Defaults to 0. */
	activeDot?: number;
};

function DotIcon({
	size = 20,
	active = false,
	activeDot = 0,
	dots,
	...props
}: DotIconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 20 20"
			fill="none"
			aria-hidden="true"
			{...props}
		>
			{dots.map((dot, index) => (
				<circle
					key={`${dot.cx}-${dot.cy}-${index}`}
					cx={dot.cx}
					cy={dot.cy}
					r={dot.r ?? 1.4}
					fill={
						active && index === activeDot
							? "var(--color-accent)"
							: "currentColor"
					}
				/>
			))}
		</svg>
	);
}

export function IconDashboard({ active, ...props }: IconProps) {
	return (
		<DotIcon
			active={active}
			activeDot={4}
			dots={[
				{ cx: 4, cy: 4, r: 1.6 },
				{ cx: 10, cy: 4, r: 1.6 },
				{ cx: 16, cy: 4, r: 1.6 },
				{ cx: 4, cy: 10, r: 1.6 },
				{ cx: 10, cy: 10, r: 1.6 },
				{ cx: 16, cy: 10, r: 1.6 },
				{ cx: 4, cy: 16, r: 1.6 },
				{ cx: 10, cy: 16, r: 1.6 },
				{ cx: 16, cy: 16, r: 1.6 },
			]}
			{...props}
		/>
	);
}

export function IconBriefcase({ active, ...props }: IconProps) {
	return (
		<DotIcon
			active={active}
			activeDot={4}
			dots={[
				{ cx: 6, cy: 7 },
				{ cx: 10, cy: 7 },
				{ cx: 14, cy: 7 },
				{ cx: 4, cy: 11 },
				{ cx: 8, cy: 11 },
				{ cx: 12, cy: 11 },
				{ cx: 16, cy: 11 },
				{ cx: 6, cy: 15 },
				{ cx: 10, cy: 15 },
				{ cx: 14, cy: 15 },
			]}
			{...props}
		/>
	);
}

export function IconTrophy({ active, ...props }: IconProps) {
	return (
		<DotIcon
			active={active}
			activeDot={0}
			dots={[
				{ cx: 10, cy: 3.5 },
				{ cx: 6, cy: 7 },
				{ cx: 10, cy: 7 },
				{ cx: 14, cy: 7 },
				{ cx: 7, cy: 11 },
				{ cx: 13, cy: 11 },
				{ cx: 10, cy: 14 },
				{ cx: 10, cy: 17.2, r: 1.3 },
			]}
			{...props}
		/>
	);
}

export function IconStory({ active, ...props }: IconProps) {
	return (
		<DotIcon
			active={active}
			activeDot={4}
			dots={[
				{ cx: 5, cy: 5, r: 1.3 },
				{ cx: 9, cy: 5, r: 1.3 },
				{ cx: 13, cy: 5, r: 1.3 },
				{ cx: 5, cy: 10, r: 1.3 },
				{ cx: 9, cy: 10, r: 1.3 },
				{ cx: 13, cy: 10, r: 1.3 },
				{ cx: 17, cy: 10, r: 1.3 },
				{ cx: 5, cy: 15, r: 1.3 },
				{ cx: 9, cy: 15, r: 1.3 },
			]}
			{...props}
		/>
	);
}

export function IconSettings({ active, ...props }: IconProps) {
	return (
		<DotIcon
			active={active}
			activeDot={6}
			dots={[
				{ cx: 10, cy: 4, r: 1.3 },
				{ cx: 15, cy: 7, r: 1.3 },
				{ cx: 15, cy: 13, r: 1.3 },
				{ cx: 10, cy: 16, r: 1.3 },
				{ cx: 5, cy: 13, r: 1.3 },
				{ cx: 5, cy: 7, r: 1.3 },
				{ cx: 10, cy: 10, r: 1.6 },
			]}
			{...props}
		/>
	);
}

export function IconChevron(
	props: IconProps & { direction?: "left" | "right" | "up" | "down" },
) {
	const { direction = "right", active, ...rest } = props;
	const rotation =
		direction === "down" ? 90 : direction === "left" ? 180 : direction === "up" ? 270 : 0;
	return (
		<DotIcon
			active={active}
			activeDot={1}
			dots={[
				{ cx: 8, cy: 5, r: 1.35 },
				{ cx: 12, cy: 10, r: 1.35 },
				{ cx: 8, cy: 15, r: 1.35 },
			]}
			style={{ transform: `rotate(${rotation}deg)`, ...rest.style }}
			{...rest}
		/>
	);
}

export function IconDoubleChevron(props: IconProps & { direction?: "left" | "right" }) {
	const { direction = "right", active, ...rest } = props;
	const rotation = direction === "left" ? 180 : 0;
	return (
		<DotIcon
			active={active}
			activeDot={4}
			dots={[
				{ cx: 5, cy: 5, r: 1.2 },
				{ cx: 9, cy: 10, r: 1.2 },
				{ cx: 5, cy: 15, r: 1.2 },
				{ cx: 10, cy: 5, r: 1.2 },
				{ cx: 14, cy: 10, r: 1.2 },
				{ cx: 10, cy: 15, r: 1.2 },
			]}
			style={{ transform: `rotate(${rotation}deg)`, ...rest.style }}
			{...rest}
		/>
	);
}

export function IconSortNeutral({ active, size = 14, ...props }: IconProps) {
	return (
		<DotIcon
			active={active}
			size={size}
			activeDot={0}
			dots={[
				{ cx: 10, cy: 3.5, r: 1.2 },
				{ cx: 10, cy: 7.5, r: 1.2 },
				{ cx: 10, cy: 12.5, r: 1.2 },
				{ cx: 10, cy: 16.5, r: 1.2 },
			]}
			{...props}
		/>
	);
}

export function IconSortAsc({ active, size = 14, ...props }: IconProps) {
	return (
		<DotIcon
			active={active}
			size={size}
			activeDot={0}
			dots={[
				{ cx: 10, cy: 4, r: 1.3 },
				{ cx: 7, cy: 9, r: 1.2 },
				{ cx: 13, cy: 9, r: 1.2 },
				{ cx: 10, cy: 15.5, r: 1.2 },
			]}
			{...props}
		/>
	);
}

export function IconSortDesc({ active, size = 14, ...props }: IconProps) {
	return (
		<DotIcon
			active={active}
			size={size}
			activeDot={3}
			dots={[
				{ cx: 10, cy: 4.5, r: 1.2 },
				{ cx: 7, cy: 11, r: 1.2 },
				{ cx: 13, cy: 11, r: 1.2 },
				{ cx: 10, cy: 16, r: 1.3 },
			]}
			{...props}
		/>
	);
}

export function IconLogout({ active, ...props }: IconProps) {
	return (
		<DotIcon
			active={active}
			activeDot={4}
			dots={[
				{ cx: 5, cy: 10 },
				{ cx: 9, cy: 10 },
				{ cx: 13, cy: 6, r: 1.3 },
				{ cx: 13, cy: 14, r: 1.3 },
				{ cx: 16.5, cy: 10 },
			]}
			{...props}
		/>
	);
}

export function IconMenu({ active, ...props }: IconProps) {
	return (
		<DotIcon
			active={active}
			activeDot={0}
			dots={[
				{ cx: 4, cy: 6, r: 1.35 },
				{ cx: 10, cy: 6, r: 1.35 },
				{ cx: 16, cy: 6, r: 1.35 },
				{ cx: 4, cy: 14, r: 1.35 },
				{ cx: 10, cy: 14, r: 1.35 },
				{ cx: 16, cy: 14, r: 1.35 },
			]}
			{...props}
		/>
	);
}

export function IconResume({ active, ...props }: IconProps) {
	return (
		<DotIcon
			active={active}
			activeDot={1}
			dots={[
				{ cx: 6, cy: 4, r: 1.3 },
				{ cx: 10, cy: 4, r: 1.3 },
				{ cx: 14, cy: 4, r: 1.3 },
				{ cx: 6, cy: 8.5, r: 1.3 },
				{ cx: 10, cy: 8.5, r: 1.3 },
				{ cx: 14, cy: 8.5, r: 1.3 },
				{ cx: 6, cy: 13, r: 1.3 },
				{ cx: 10, cy: 13, r: 1.3 },
				{ cx: 6, cy: 17, r: 1.3 },
				{ cx: 10, cy: 17, r: 1.3 },
				{ cx: 14, cy: 17, r: 1.3 },
			]}
			{...props}
		/>
	);
}

export function IconSummary({ active, ...props }: IconProps) {
	return (
		<DotIcon
			active={active}
			activeDot={0}
			dots={[
				{ cx: 4, cy: 5, r: 1.3 },
				{ cx: 8, cy: 5, r: 1.3 },
				{ cx: 12, cy: 5, r: 1.3 },
				{ cx: 16, cy: 5, r: 1.3 },
				{ cx: 4, cy: 10, r: 1.3 },
				{ cx: 8, cy: 10, r: 1.3 },
				{ cx: 12, cy: 10, r: 1.3 },
				{ cx: 4, cy: 15, r: 1.3 },
				{ cx: 8, cy: 15, r: 1.3 },
			]}
			{...props}
		/>
	);
}
