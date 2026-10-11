
import { useState } from "react";
import "./Auth.css";

export default function Auth({ onAuthenticated }) {
    const [mode, setMode] = useState("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                `http://localhost:8080/api/auth/${mode}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...(mode === "signup" ? { name } : {}),
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Authentication failed.");
            }

            onAuthenticated(data.user);
        } catch (err) {
            setError(
                err.message || "Could not connect to the server."
            );
        } finally {
            setLoading(false);
        }
    }

    function switchMode() {
        setMode(mode === "login" ? "signup" : "login");
        setError("");
        setPassword("");
    }

    return (
        <main className="auth-page">
            <section className="auth-card">
                <header className="auth-brand">
                    <div className="auth-logo">&#931;</div>

                    <div className="auth-brand-text">
                        <h1>SIGMA<span>AI</span></h1>
                    </div>
                </header>

                <div className="auth-heading">
                    <h2>
                        {mode === "login"
                            ? "Welcome back"
                            : "Create your account"}
                    </h2>

                    <p>
                        {mode === "login"
                            ? "Sign in to continue to your workspace."
                            : "Join your AI workspace in seconds."}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {mode === "signup" && (
                        <label className="auth-field">
                            <span>Full name</span>

                            <div className="auth-input">
                                <i className="fa-solid fa-user"></i>

                                <input
                                    type="text"
                                    placeholder="Enter your name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoComplete="name"
                                    maxLength={80}
                                    required
                                />
                            </div>
                        </label>
                    )}

                    <label className="auth-field">
                        <span>Email address</span>

                        <div className="auth-input">
                            <i className="fa-solid fa-envelope"></i>

                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>
                    </label>

                    <label className="auth-field">
                        <span>Password</span>

                        <div className="auth-input">
                            <i className="fa-solid fa-lock"></i>

                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="At least 8 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete={
                                    mode === "login"
                                        ? "current-password"
                                        : "new-password"
                                }
                                minLength={8}
                                maxLength={72}
                                required
                            />

                            <button
                                className="password-toggle"
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </label>

                    {error && (
                        <div className="auth-error" role="alert">
                            {error}
                        </div>
                    )}

                    <button
                        className="auth-submit"
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Please wait..."
                            : mode === "login"
                                ? "Sign In"
                                : "Create Account"}
                    </button>
                </form>

                <div className="auth-switch">
                    {mode === "login"
                        ? "Don't have an account?"
                        : "Already have an account?"}

                    <button type="button" onClick={switchMode}>
                        {mode === "login" ? "Create Account" : "Sign In"}
                    </button>
                </div>
            </section>
        </main>
    );
}
