type PlaceholderPageProps = {
	title: string;
	copy: string;
};

export function PlaceholderPage({ title, copy }: PlaceholderPageProps) {
	return (
		<section className="placeholder-page">
			<h1>{title}</h1>
			<p>{copy}</p>
		</section>
	);
}
