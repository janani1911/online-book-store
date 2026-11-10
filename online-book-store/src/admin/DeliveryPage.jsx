import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "./AdminLayout";
import { OrderFilters, Pagination, statusOptions } from "./OrderFilters";
import StatusBadge from "./StatusBadge";
import useAdminQuery from "./useAdminQuery";
import { STATUSES, patchJSON, shortId, toQuery } from "./api";

export default function DeliveryPage() {
  // Opens on orders still to be delivered
  const [filters, setFilters] = useState({ search: "", status: "In Progress", from: "", to: "", page: 1 });
  const { data, setData, loading, error, reload } = useAdminQuery(`/api/admin/orders${toQuery(filters)}`);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState(null);

  const updateStatus = async (order, status) => {
    if (status === "Cancelled" && !window.confirm(`Cancel order ${shortId(order._id)} for ${order.customerName}?`)) return;
    setSaving(order._id);
    setMessage(null);
    try {
      const { order: updated } = await patchJSON(`/api/admin/orders/${order._id}/status`, { status });
      setData(d => ({ ...d, orders: d.orders.map(o => (o._id === updated._id ? updated : o)) }));
      setMessage({ ok: true, text: `${shortId(order._id)} is now “${status}”.` });
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow="DELIVERY" title="Delivery Management" subtitle="Track where each order is and update its delivery status." />

      <section className="admin-card">
        <OrderFilters
          filters={filters}
          onChange={setFilters}
          selects={[{
            name: "status",
            label: "Delivery status",
            options: [
              { value: "In Progress", label: "In progress (not delivered)" },
              ...statusOptions(STATUSES, "All orders")
            ]
          }]}
        />

        {error && <p className="admin-error">{error} <button className="text-link" onClick={reload}>Retry</button></p>}
        {message && <p className={message.ok ? "admin-success" : "admin-error"} role="status">{message.text}</p>}

        <div className={loading ? "admin-table-wrap loading" : "admin-table-wrap"}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer Name</th>
                <th>Delivery Address</th>
                <th>City</th>
                <th>State</th>
                <th>Pincode</th>
                <th>Contact</th>
                <th>Delivery Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {data?.orders.map(o => (
                <tr key={o._id}>
                  <td><Link to={`/admin/orders/${o._id}`} className="order-link">{shortId(o._id)}</Link></td>
                  <td className="strong">{o.customerName}</td>
                  <td className="wrap address">{o.address}</td>
                  <td>{o.city}</td>
                  <td>{o.state || <span className="admin-muted">—</span>}</td>
                  <td>{o.pincode}</td>
                  <td><a href={`tel:${o.phone}`}>{o.phone}</a></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>
                    <select
                      className="admin-select compact"
                      value={o.status}
                      disabled={saving === o._id}
                      onChange={e => updateStatus(o, e.target.value)}
                      aria-label={`Update delivery status for ${shortId(o._id)}`}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.orders.length === 0 && <p className="admin-empty">No orders match these filters.</p>}
          {!data && loading && <p className="admin-empty">Loading deliveries…</p>}
        </div>

        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={page => setFilters({ ...filters, page })} />}
      </section>
    </>
  );
}
