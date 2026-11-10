import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { PageHeader } from "./AdminLayout";
import { OrderFilters, Pagination, statusOptions } from "./OrderFilters";
import StatusBadge from "./StatusBadge";
import useAdminQuery from "./useAdminQuery";
import { PAYMENT_METHODS, PAYMENT_STATUSES, formatDate, money, shortId, toQuery } from "./api";

export default function PaymentsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ search: "", paymentStatus: "", paymentMethod: "", from: "", to: "", page: 1 });
  const { data, loading, error, reload } = useAdminQuery(`/api/admin/orders${toQuery(filters)}`);
  const { data: stats } = useAdminQuery("/api/admin/stats");

  return (
    <>
      <PageHeader eyebrow="PAYMENTS" title="Payment Details" subtitle="Payment records as stored on each order. Open an order to record a payment." />

      {stats && (
        <section className="stat-grid compact">
          {PAYMENT_STATUSES.map(s => (
            <div key={s} className="admin-card stat-card">
              <StatusBadge status={s} kind="payment" />
              <strong>{money(stats.payments.byStatus[s].amount)}</strong>
              <small>{stats.payments.byStatus[s].count} order(s)</small>
            </div>
          ))}
          {PAYMENT_METHODS.map(m => (
            <div key={m} className="admin-card stat-card">
              <p>{m}</p>
              <strong>{stats.payments.byMethod[m].count} order(s)</strong>
              <small>{money(stats.payments.byMethod[m].amount)}</small>
            </div>
          ))}
        </section>
      )}

      <p className="admin-notice">
        <Info size={15} />
        No online payment gateway is connected, so the store only accepts Cash on Delivery.
        Transaction IDs appear only when a real reference has been recorded.
      </p>

      <section className="admin-card">
        <OrderFilters
          filters={filters}
          onChange={setFilters}
          selects={[
            { name: "paymentStatus", label: "Payment status", options: statusOptions(PAYMENT_STATUSES) },
            { name: "paymentMethod", label: "Method", options: statusOptions(PAYMENT_METHODS, "All methods") }
          ]}
        />

        {error && <p className="admin-error">{error} <button className="text-link" onClick={reload}>Retry</button></p>}

        <div className={loading ? "admin-table-wrap loading" : "admin-table-wrap"}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Payment Method</th>
                <th>Payment Status</th>
                <th>Transaction ID</th>
                <th>Payment Date</th>
                <th>Order Amount</th>
              </tr>
            </thead>
            <tbody>
              {data?.orders.map(o => (
                <tr key={o._id} className="clickable" onClick={() => navigate(`/admin/orders/${o._id}`)}>
                  <td><Link to={`/admin/orders/${o._id}`} className="order-link" onClick={e => e.stopPropagation()}>{shortId(o._id)}</Link></td>
                  <td className="strong">{o.customerName}</td>
                  <td>{o.payment.method}</td>
                  <td><StatusBadge status={o.payment.status} kind="payment" /></td>
                  <td>{o.payment.transactionId ? <code>{o.payment.transactionId}</code> : <span className="admin-muted">Not available</span>}</td>
                  <td>{o.payment.paidAt ? formatDate(o.payment.paidAt) : <span className="admin-muted">—</span>}</td>
                  <td className="strong">{money(o.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.orders.length === 0 && <p className="admin-empty">No payments match these filters.</p>}
          {!data && loading && <p className="admin-empty">Loading payments…</p>}
        </div>

        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={page => setFilters({ ...filters, page })} />}
      </section>
    </>
  );
}
