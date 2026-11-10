import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle, Ban, CheckCircle2, Clock, IndianRupee, Info, PiggyBank,
  RefreshCw, ShoppingCart, Users
} from "lucide-react";
import { PageHeader } from "./AdminLayout";
import { BarChart, BarList } from "./Charts";
import StatusBadge from "./StatusBadge";
import useAdminQuery from "./useAdminQuery";
import { STATUSES, formatDate, money, shortId } from "./api";

const compactMoney = n =>
  n >= 100000 ? `₹${(n / 100000).toFixed(n >= 1000000 ? 0 : 1)}L`
  : n >= 1000 ? `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  : `₹${n}`;

function StatCard({ icon: Icon, label, value, note, tone = "", to }) {
  const body = (
    <>
      <span className={`stat-icon ${tone}`}><Icon size={18} /></span>
      <p>{label}</p>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </>
  );
  return to
    ? <Link to={to} className="admin-card stat-card stat-card-link">{body}</Link>
    : <div className="admin-card stat-card">{body}</div>;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: stats, loading, error, reload } = useAdminQuery("/api/admin/stats");

  if (loading && !stats) return <div className="admin-loading">Loading dashboard…</div>;
  if (error && !stats) {
    return (
      <div className="admin-card admin-error-box">
        <p>{error}</p>
        <button className="primary-button" onClick={reload}>Try again</button>
      </div>
    );
  }

  const p = stats.profit;
  const days = stats.dailyRevenue.map(d => ({
    key: d.date,
    label: new Date(`${d.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    value: d.revenue,
    detail: `${d.orders} order${d.orders === 1 ? "" : "s"}`
  }));
  const last14 = days.reduce((n, d) => n + d.value, 0);

  return (
    <>
      <PageHeader
        eyebrow="OVERVIEW"
        title="Sales Dashboard"
        subtitle="Live figures from orders saved in MongoDB."
        actions={
          <button className="admin-ghost-button" onClick={reload} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
          </button>
        }
      />

      <section className="stat-grid">
        <StatCard icon={ShoppingCart} label="Total Orders" value={stats.totalOrders} to="/admin/orders" />
        <StatCard
          icon={IndianRupee}
          label="Total Sales"
          value={money(stats.totalSales)}
          note={`${money(stats.collectedAmount)} payment received`}
        />
        <StatCard
          icon={PiggyBank}
          label={p.status === "complete" ? "Total Profit" : "Profit (estimate)"}
          value={p.totalProfit === null ? "Unavailable" : money(p.totalProfit)}
          note={p.status === "unavailable" ? "No product cost data" : p.status === "estimate" ? "Some costs missing" : "All costs recorded"}
          tone={p.status === "complete" ? "" : "warn"}
        />
        <StatCard icon={Users} label="Total Customers" value={stats.totalCustomers} note="Unique email addresses" />
        <StatCard icon={Clock} label="Pending Orders" value={stats.pendingOrders} note="Not yet delivered" tone="warn" to="/admin/delivery" />
        <StatCard icon={CheckCircle2} label="Delivered Orders" value={stats.deliveredOrders} tone="good" />
        <StatCard icon={Ban} label="Cancelled Orders" value={stats.cancelledOrders} tone="bad" />
      </section>

      <section className="admin-grid-2">
        <div className="admin-card">
          <div className="card-head">
            <div>
              <h2>Sales — last 14 days</h2>
              <p className="admin-muted">{money(last14)} from non-cancelled orders</p>
            </div>
          </div>
          <BarChart rows={days} format={compactMoney} ariaLabel="Daily sales for the last 14 days" />
        </div>

        <div className="admin-card">
          <div className="card-head"><h2>Orders by status</h2></div>
          <BarList
            rows={STATUSES.map(s => ({ key: s, label: s, value: stats.statusCounts[s] || 0 }))}
            empty="No orders yet"
          />
        </div>
      </section>

      <section className="admin-grid-2">
        <ProfitCard profit={p} />

        <div className="admin-card">
          <div className="card-head"><h2>Best-selling books</h2></div>
          <BarList
            rows={stats.topBooks.map(b => ({
              key: b.title, label: b.title, value: b.quantity,
              display: `${b.quantity} sold · ${money(b.revenue)}`
            }))}
            empty="No books sold yet"
          />
        </div>
      </section>

      <section className="admin-card">
        <div className="card-head">
          <h2>Recent orders</h2>
          <Link className="text-link" to="/admin/orders">View all orders →</Link>
        </div>
        {stats.recentOrders.length === 0 ? (
          <p className="admin-muted">No orders yet. Orders placed from the store will appear here.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {stats.recentOrders.map(o => (
                  <tr key={o._id} className="clickable" onClick={() => navigate(`/admin/orders/${o._id}`)}>
                    <td><Link to={`/admin/orders/${o._id}`} className="order-link">{shortId(o._id)}</Link></td>
                    <td>{o.customerName}</td>
                    <td>{formatDate(o.createdAt)}</td>
                    <td>{money(o.totalAmount)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function ProfitCard({ profit: p }) {
  const missing = [];
  if (p.itemLinesMissingCost) missing.push(`${p.itemLinesMissingCost} book line(s) have no cost price (${money(p.revenueWithoutCost)} of sales)`);
  if (p.ordersMissingDeliveryCharge) missing.push(`${p.ordersMissingDeliveryCharge} order(s) have no delivery charge entered`);
  if (p.ordersMissingOtherExpenses) missing.push(`${p.ordersMissingOtherExpenses} order(s) have no other expenses entered`);

  return (
    <div className="admin-card">
      <div className="card-head">
        <h2>Profit calculation</h2>
        {p.status === "complete" && p.countedOrders > 0 && <span className="pill pill-good">Complete</span>}
        {p.status === "estimate" && <span className="pill pill-warn">Estimate</span>}
        {p.status === "unavailable" && <span className="pill pill-bad">Unavailable</span>}
      </div>

      <dl className="profit-list">
        <div><dt>Total revenue</dt><dd>{money(p.revenue)}</dd></div>
        <div className="sub"><dt>incl. delivery fees paid by customers</dt><dd>{money(p.deliveryFees)}</dd></div>
        <div><dt>− Product cost{p.itemLinesMissingCost ? " (known)" : ""}</dt><dd>{money(p.productCost)}</dd></div>
        <div><dt>− Delivery charges{p.ordersMissingDeliveryCharge ? " (known)" : ""}</dt><dd>{money(p.deliveryCharges)}</dd></div>
        <div><dt>− Other expenses{p.ordersMissingOtherExpenses ? " (known)" : ""}</dt><dd>{money(p.otherExpenses)}</dd></div>
        <div className="total">
          <dt>{p.status === "complete" ? "Total profit" : "Estimated profit"}</dt>
          <dd>{p.totalProfit === null ? "Unavailable" : money(p.totalProfit)}</dd>
        </div>
      </dl>

      {p.status === "unavailable" && (
        <p className="profit-note bad">
          <AlertTriangle size={15} />
          <span>No cost prices are recorded, so profit cannot be calculated. Revenue is <b>not</b> profit.
          Add cost prices on an order's details page (or set <code>costPrice</code> on books in MongoDB).</span>
        </p>
      )}
      {p.status === "estimate" && (
        <div className="profit-note warn">
          <Info size={15} />
          <div>
            <span>Only known costs are subtracted, so real profit is <b>lower</b> than this figure:</span>
            <ul>{missing.map(m => <li key={m}>{m}</li>)}</ul>
          </div>
        </div>
      )}
      <p className="admin-muted small">
        Profit = Revenue − Product cost − Delivery charges − Other expenses.
        Cancelled and refunded orders are excluded.
      </p>
    </div>
  );
}
