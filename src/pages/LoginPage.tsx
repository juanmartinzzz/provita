import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { signIn, signUp, useSession } from "../lib/auth-client";
import "./LoginPage.css";

type Mode = "signin" | "signup";

export function LoginPage() {
	const { data: session, isPending } = useSession();
	const [mode, setMode] = useState<Mode>("signin");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	if (!isPending && session) {
		return <Navigate to="/" replace />;
	}

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);
		setBusy(true);

		try {
			if (mode === "signup") {
				const { error: signUpError } = await signUp.email({
					name: name.trim(),
					email: email.trim(),
					password,
				});
				if (signUpError) {
					setError(signUpError.message ?? "Could not create account.");
					return;
				}
			} else {
				const { error: signInError } = await signIn.email({
					email: email.trim(),
					password,
				});
				if (signInError) {
					setError(signInError.message ?? "Could not sign in.");
					return;
				}
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="login-page">
			<div className="login-page__panel">
				<p className="login-page__brand font-ndot">PROVITA</p>
				<h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
				<p className="login-page__copy">
					{mode === "signin"
						? "Sign in to manage your career story."
						: "Start a living record of jobs and achievements."}
				</p>

				<div className="login-page__modes" role="tablist" aria-label="Auth mode">
					<button
						type="button"
						role="tab"
						aria-selected={mode === "signin"}
						className={mode === "signin" ? "is-active" : undefined}
						onClick={() => {
							setMode("signin");
							setError(null);
						}}
					>
						Sign in
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={mode === "signup"}
						className={mode === "signup" ? "is-active" : undefined}
						onClick={() => {
							setMode("signup");
							setError(null);
						}}
					>
						Sign up
					</button>
				</div>

				<form className="login-page__form" onSubmit={onSubmit}>
					{mode === "signup" ? (
						<label>
							<span>Name</span>
							<input
								name="name"
								autoComplete="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								minLength={1}
							/>
						</label>
					) : null}

					<label>
						<span>Email</span>
						<input
							name="email"
							type="email"
							autoComplete="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</label>

					<label>
						<span>Password</span>
						<input
							name="password"
							type="password"
							autoComplete={mode === "signup" ? "new-password" : "current-password"}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={8}
						/>
					</label>

					{error ? <p className="login-page__error">{error}</p> : null}

					<button type="submit" className="login-page__submit" disabled={busy || isPending}>
						{busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
					</button>
				</form>
			</div>
		</div>
	);
}
