import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function DotIcon({ size = 20, ...props }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
			{...props}
		/>
	);
}

export function IconDashboard(props: IconProps) {
	return (
		<DotIcon {...props}>
			<circle cx="4" cy="4" r="1.6" />
			<circle cx="10" cy="4" r="1.6" />
			<circle cx="16" cy="4" r="1.6" />
			<circle cx="4" cy="10" r="1.6" />
			<circle cx="10" cy="10" r="1.6" />
			<circle cx="16" cy="10" r="1.6" />
			<circle cx="4" cy="16" r="1.6" />
			<circle cx="10" cy="16" r="1.6" />
			<circle cx="16" cy="16" r="1.6" />
		</DotIcon>
	);
}

export function IconBriefcase(props: IconProps) {
	return (
		<DotIcon {...props}>
			<circle cx="6" cy="7" r="1.4" />
			<circle cx="10" cy="7" r="1.4" />
			<circle cx="14" cy="7" r="1.4" />
			<circle cx="4" cy="11" r="1.4" />
			<circle cx="8" cy="11" r="1.4" />
			<circle cx="12" cy="11" r="1.4" />
			<circle cx="16" cy="11" r="1.4" />
			<circle cx="6" cy="15" r="1.4" />
			<circle cx="10" cy="15" r="1.4" />
			<circle cx="14" cy="15" r="1.4" />
		</DotIcon>
	);
}

export function IconTrophy(props: IconProps) {
	return (
		<DotIcon {...props}>
			<circle cx="10" cy="3.5" r="1.4" />
			<circle cx="6" cy="7" r="1.4" />
			<circle cx="10" cy="7" r="1.4" />
			<circle cx="14" cy="7" r="1.4" />
			<circle cx="7" cy="11" r="1.4" />
			<circle cx="13" cy="11" r="1.4" />
			<circle cx="10" cy="14" r="1.4" />
			<circle cx="10" cy="17.2" r="1.3" />
		</DotIcon>
	);
}

export function IconStory(props: IconProps) {
	return (
		<DotIcon {...props}>
			<circle cx="5" cy="5" r="1.3" />
			<circle cx="9" cy="5" r="1.3" />
			<circle cx="13" cy="5" r="1.3" />
			<circle cx="5" cy="10" r="1.3" />
			<circle cx="9" cy="10" r="1.3" />
			<circle cx="13" cy="10" r="1.3" />
			<circle cx="17" cy="10" r="1.3" />
			<circle cx="5" cy="15" r="1.3" />
			<circle cx="9" cy="15" r="1.3" />
		</DotIcon>
	);
}

export function IconSettings(props: IconProps) {
	return (
		<DotIcon {...props}>
			<circle cx="10" cy="4" r="1.3" />
			<circle cx="15" cy="7" r="1.3" />
			<circle cx="15" cy="13" r="1.3" />
			<circle cx="10" cy="16" r="1.3" />
			<circle cx="5" cy="13" r="1.3" />
			<circle cx="5" cy="7" r="1.3" />
			<circle cx="10" cy="10" r="1.6" />
		</DotIcon>
	);
}

export function IconChevron(props: IconProps & { direction?: "left" | "right" | "up" | "down" }) {
	const { direction = "right", ...rest } = props;
	const rotation =
		direction === "down" ? 90 : direction === "left" ? 180 : direction === "up" ? 270 : 0;
	return (
		<DotIcon {...rest} style={{ transform: `rotate(${rotation}deg)`, ...rest.style }}>
			<circle cx="8" cy="5" r="1.35" />
			<circle cx="12" cy="10" r="1.35" />
			<circle cx="8" cy="15" r="1.35" />
		</DotIcon>
	);
}

export function IconDoubleChevron(props: IconProps & { direction?: "left" | "right" }) {
	const { direction = "right", ...rest } = props;
	const rotation = direction === "left" ? 180 : 0;
	return (
		<DotIcon {...rest} style={{ transform: `rotate(${rotation}deg)`, ...rest.style }}>
			<circle cx="5" cy="5" r="1.2" />
			<circle cx="9" cy="10" r="1.2" />
			<circle cx="5" cy="15" r="1.2" />
			<circle cx="10" cy="5" r="1.2" />
			<circle cx="14" cy="10" r="1.2" />
			<circle cx="10" cy="15" r="1.2" />
		</DotIcon>
	);
}

export function IconSortNeutral(props: IconProps) {
	return (
		<DotIcon {...props} size={props.size ?? 14}>
			<circle cx="10" cy="3.5" r="1.2" />
			<circle cx="10" cy="7.5" r="1.2" />
			<circle cx="10" cy="12.5" r="1.2" />
			<circle cx="10" cy="16.5" r="1.2" />
		</DotIcon>
	);
}

export function IconSortAsc(props: IconProps) {
	return (
		<DotIcon {...props} size={props.size ?? 14}>
			<circle cx="10" cy="4" r="1.3" />
			<circle cx="7" cy="9" r="1.2" />
			<circle cx="13" cy="9" r="1.2" />
			<circle cx="10" cy="15.5" r="1.2" />
		</DotIcon>
	);
}

export function IconSortDesc(props: IconProps) {
	return (
		<DotIcon {...props} size={props.size ?? 14}>
			<circle cx="10" cy="4.5" r="1.2" />
			<circle cx="7" cy="11" r="1.2" />
			<circle cx="13" cy="11" r="1.2" />
			<circle cx="10" cy="16" r="1.3" />
		</DotIcon>
	);
}

export function IconLogout(props: IconProps) {
	return (
		<DotIcon {...props}>
			<circle cx="5" cy="10" r="1.4" />
			<circle cx="9" cy="10" r="1.4" />
			<circle cx="13" cy="6" r="1.3" />
			<circle cx="13" cy="14" r="1.3" />
			<circle cx="16.5" cy="10" r="1.4" />
		</DotIcon>
	);
}

export function IconMenu(props: IconProps) {
	return (
		<DotIcon {...props}>
			<circle cx="4" cy="6" r="1.35" />
			<circle cx="10" cy="6" r="1.35" />
			<circle cx="16" cy="6" r="1.35" />
			<circle cx="4" cy="14" r="1.35" />
			<circle cx="10" cy="14" r="1.35" />
			<circle cx="16" cy="14" r="1.35" />
		</DotIcon>
	);
}
