import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../lib/auth-client";

export function RequireAuth() {
	const { data: session, isPending } = useSession();

	if (isPending) {
		return (
			<div className="auth-loading" role="status" aria-live="polite">
				Checking session…
			</div>
		);
	}

	if (!session) {
		return <Navigate to="/login" replace />;
	}

	return <Outlet />;
}
