import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { BookOpen, Eye, EyeOff, Lock, User } from "lucide-react";
import { API_URL, getToken, setToken } from "./api";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Already logged in -> straight to the dashboard
  if (getToken()) return <Navigate to="/admin/dashboard" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Invalid login details");
      }

      setToken(data.token);
      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      setError(
        error instanceof TypeError
          ? "Cannot reach the server. Is the backend running on port 5000?"
          : error.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-logo"><BookOpen size={26} /></div>
        <span className="eyebrow">JS BOOK STORE</span>
        <h1>Admin Login</h1>
        <p>Login to manage orders, deliveries and payments.</p>

        <form onSubmit={handleLogin}>
          <label htmlFor="admin-username">Username</label>
          <div className="admin-input">
            <User size={17} />
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <label htmlFor="admin-password">Password</label>
          <div className="admin-input">
            <Lock size={17} />
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && <p className="admin-error" role="alert">{error}</p>}

          <button className="admin-login-button" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <button type="button" className="admin-back-button" onClick={() => navigate("/")}>
          ← Back to Store
        </button>
      </div>
    </div>
  );
}
