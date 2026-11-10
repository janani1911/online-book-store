import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

// Filter bar used by the Orders, Delivery and Payments pages.
// selects: [{ name, label, options: [{ value, label }] }]
export function OrderFilters({ filters, onChange, selects = [], showDates = true }) {
  // Search box is debounced so we don't call the API on every key press
  const [search, setSearch] = useState(filters.search || "");
  const latest = useRef(filters);
  latest.current = filters;

  useEffect(() => {
    const t = setTimeout(() => {
      const current = latest.current;
      if (search !== (current.search || "")) onChange({ ...current, search, page: 1 });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const set = (name, value) => onChange({ ...filters, [name]: value, page: 1 });

  const hasFilters = search || selects.some(s => filters[s.name]) || filters.from || filters.to;

  return (
    <div className="admin-filters">
      <label className="admin-search">
        <Search size={16} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search order ID, name, phone, email, book…"
          aria-label="Search orders"
        />
      </label>

      {selects.map(s => (
        <label key={s.name} className="admin-field">
          <span>{s.label}</span>
          <select className="admin-select" value={filters[s.name] || ""} onChange={e => set(s.name, e.target.value)}>
            {s.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      ))}

      {showDates && (
        <>
          <label className="admin-field">
            <span>From</span>
            <input type="date" className="admin-select" value={filters.from || ""} max={filters.to || undefined}
              onChange={e => set("from", e.target.value)} />
          </label>
          <label className="admin-field">
            <span>To</span>
            <input type="date" className="admin-select" value={filters.to || ""} min={filters.from || undefined}
              onChange={e => set("to", e.target.value)} />
          </label>
        </>
      )}

      {hasFilters && (
        <button
          className="admin-ghost-button"
          onClick={() => {
            setSearch("");
            onChange(Object.fromEntries(Object.keys(filters).map(k => [k, k === "page" ? 1 : ""])));
          }}
        >
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
}

export function Pagination({ page, pages, total, onPage }) {
  if (!total) return null;
  return (
    <div className="admin-pagination">
      <span className="admin-muted">{total} order{total === 1 ? "" : "s"}</span>
      <div>
        <button className="admin-icon-button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        <span>Page {page} of {pages}</span>
        <button className="admin-icon-button" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export const statusOptions = (statuses, allLabel = "All statuses") => [
  { value: "", label: allLabel },
  ...statuses.map(s => ({ value: s, label: s }))
];
