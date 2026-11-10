import { useCallback, useEffect, useRef, useState } from "react";
import { AuthError, adminFetch } from "./api";

// Loads an admin API path and reloads whenever the path changes.
export default function useAdminQuery(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latest.current;
    setLoading(true);
    setError("");
    try {
      const result = await adminFetch(path);
      if (requestId === latest.current) setData(result);
    } catch (err) {
      if (requestId === latest.current && !(err instanceof AuthError)) {
        setError(
          err instanceof TypeError
            ? "Cannot reach the server. Is the backend running?"
            : err.message
        );
      }
    } finally {
      if (requestId === latest.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => { load(); }, [load]);

  return { data, setData, loading, error, reload: load };
}
