export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const TOKEN_KEY = "jsbs-admin-token";

// sessionStorage: the admin is logged out when the browser tab is closed
export const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = token => {
  try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
};
export const clearToken = () => {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};

export class AuthError extends Error {}

// fetch wrapper that adds the admin token and turns errors into exceptions
export async function adminFetch(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    clearToken();
    // Tells AdminLayout to send the admin back to the login page
    window.dispatchEvent(new Event("admin-auth-expired"));
    throw new AuthError(data.message || "Please log in again.");
  }
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}

export const patchJSON = (path, body) =>
  adminFetch(path, { method: "PATCH", body: JSON.stringify(body) });

// Must match ORDER_STATUSES in backend/models/Order.js
export const STATUSES = [
  "Order Placed",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled"
];

export const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"];
export const PAYMENT_METHODS = ["Cash on Delivery", "Online"];

export const money = n =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const shortId = id => `#${String(id).slice(-6).toUpperCase()}`;

export const formatDate = date =>
  date
    ? new Date(date).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "numeric", minute: "2-digit"
      })
    : "—";

export const formatDay = date =>
  date
    ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

export const itemCount = order =>
  (order.items || []).reduce((n, item) => n + item.quantity, 0);

export const toQuery = params => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined) q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : "";
};
