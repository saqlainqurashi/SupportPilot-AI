import { useState } from "react";
import { loginUser, registerUser, getCurrentUser } from "./api";
import "./Auth.css";

export default function Auth({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        await registerUser({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        });
      }

      await loginUser(email.trim().toLowerCase(), password);
      const user = await getCurrentUser();
      onLogin(user); 
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">S</div>
          <h1>SupportPilot <span>AI</span></h1>
        </div>

        <p className="auth-eyebrow">CUSTOMER SUPPORT PLATFORM</p>
        <h2>{isRegistering ? "Create your account" : "Welcome back"}</h2>
        <p className="auth-description">
          {isRegistering
            ? "Register to submit and track your support tickets."
            : "Sign in to continue to your support workspace."}
        </p>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegistering && (
            <label>
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                minLength={2}
                maxLength={100}
                autoComplete="name"
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              autoComplete={isRegistering ? "new-password" : "current-password"}
              required
            />
          </label>

          <button className="auth-submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isRegistering
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegistering ? "Already have an account?" : "New customer?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError("");
            }}
          >
            {isRegistering ? "Sign in" : "Create an account"}
          </button>
        </p>

        <p className="auth-note">
          Staff accounts are created by an administrator.
        </p>
      </section>
    </main>
  );
}
