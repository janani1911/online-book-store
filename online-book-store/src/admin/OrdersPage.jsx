import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "./AdminLayout";
import { OrderFilters, Pagination, statusOptions } from "./OrderFilters";
import StatusBadge from "./StatusBadge";
import useAdminQuery from "./useAdminQuery";
import { STATUSES, formatDate, itemCount, money, shortId, toQuery } from "./api";

export default function OrdersPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ search: "", status: "", from: "", to: "", page: 1 });
  const { data, loading, error, reload } = useAdminQuery(`/api/admin/orders${toQuery(filters)}`);

  return (
    <>
      <PageHeader eyebrow="ORDERS" title="Customer Orders" subtitle="Every order placed from the store. Click a row for full details." />

      <section className="admin-card">
        <OrderFilters
          filters={filters}
          onChange={setFilters}
          selects={[{
            name: "status",
            label: "Status",
            options: [...statusOptions(STATUSES), { value: "In Progress", label: "In progress (not delivered)" }]
          }]}
        />

        {error && <p className="admin-error">{error} <button className="text-link" onClick={reload}>Retry</button></p>}

        <div className={loading ? "admin-table-wrap loading" : "admin-table-wrap"}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Ordered Books</th>
                <th>Qty</th>
                <th>Order Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.orders.map(o => (
                <tr key={o._id} className="clickable" onClick={() => navigate(`/admin/orders/${o._id}`)}>
                  <td><Link to={`/admin/orders/${o._id}`} className="order-link" onClick={e => e.stopPropagation()}>{shortId(o._id)}</Link></td>
                  <td className="strong">{o.customerName}</td>
                  <td>{o.phone}</td>
                  <td>{o.email}</td>
                  <td className="wrap">
                    {o.items.map(i => <div key={i._id} className="book-line">{i.title} <span className="admin-muted">× {i.quantity}</span></div>)}
                  </td>
                  <td>{itemCount(o)}</td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td className="strong">{money(o.totalAmount)}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.orders.length === 0 && (
            <p className="admin-empty">
              {data.total === 0 && !filters.search && !filters.status && !filters.from && !filters.to
                ? "No orders yet. Orders placed from the store will appear here."
                : "No orders match these filters."}
            </p>
          )}
          {!data && loading && <p className="admin-empty">Loading orders…</p>}
        </div>

        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={page => setFilters({ ...filters, page })} />}
      </section>
    </>
  );
}
