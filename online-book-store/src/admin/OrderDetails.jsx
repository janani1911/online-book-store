import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Phone, User } from "lucide-react";
import StatusBadge from "./StatusBadge";
import useAdminQuery from "./useAdminQuery";
import {
  PAYMENT_STATUSES, STATUSES, formatDate, itemCount, money, patchJSON, shortId
} from "./api";

const toInput = v => (v === null || v === undefined ? "" : String(v));

export default function OrderDetails() {
  const { id } = useParams();
  const { data, setData, loading, error, reload } = useAdminQuery(`/api/admin/orders/${id}`);
  const order = data?.order;
  const onUpdated = updated => setData({ order: updated });

  if (loading && !order) return <div className="admin-loading">Loading order…</div>;
  if (error && !order) {
    return (
      <div className="admin-card admin-error-box">
        <p>{error}</p>
        <Link className="primary-button" to="/admin/orders">Back to orders</Link>
        <button className="admin-ghost-button" onClick={reload}>Retry</button>
      </div>
    );
  }

  return (
    <>
      <Link to="/admin/orders" className="admin-back-link"><ArrowLeft size={15} /> All orders</Link>

      <div className="admin-page-head">
        <div>
          <span className="eyebrow">ORDER {shortId(order._id)}</span>
          <h1>{order.customerName}</h1>
          <p>Placed {formatDate(order.createdAt)} · {itemCount(order)} book(s) · {money(order.totalAmount)}</p>
        </div>
        <div className="admin-page-actions">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.payment.status} kind="payment" />
        </div>
      </div>

      <section className="admin-grid-2">
        <div className="admin-card">
          <h2>Customer</h2>
          <ul className="admin-contact">
            <li><User size={15} /> {order.customerName}</li>
            <li><Mail size={15} /> <a href={`mailto:${order.email}`}>{order.email}</a></li>
            <li><Phone size={15} /> <a href={`tel:${order.phone}`}>{order.phone}</a></li>
          </ul>
        </div>
        <div className="admin-card">
          <h2>Delivery address</h2>
          <ul className="admin-contact">
            <li>
              <MapPin size={15} />
              <span>
                {order.address}<br />
                {order.city}{order.state ? `, ${order.state}` : ""} – {order.pincode}
              </span>
            </li>
            <li><Phone size={15} /> <a href={`tel:${order.phone}`}>{order.phone}</a></li>
          </ul>
        </div>
      </section>

      <BooksAndCosts order={order} onUpdated={onUpdated} />

      <section className="admin-grid-2">
        <DeliveryStatus order={order} onUpdated={onUpdated} />
        <PaymentDetails order={order} onUpdated={onUpdated} />
      </section>
    </>
  );
}

function useSaver() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const run = async (fn, okText) => {
    setSaving(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ ok: true, text: okText });
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };
  const Message = () =>
    message && <p className={message.ok ? "admin-success" : "admin-error"} role="status">{message.text}</p>;
  return { saving, run, Message };
}

function DeliveryStatus({ order, onUpdated }) {
  const [status, setStatus] = useState(order.status);
  const [note, setNote] = useState("");
  const { saving, run, Message } = useSaver();

  useEffect(() => setStatus(order.status), [order.status]);

  const save = () => {
    if (status === "Cancelled" && !window.confirm("Cancel this order?")) return;
    run(async () => {
      const { order: updated } = await patchJSON(`/api/admin/orders/${order._id}/status`, { status, note });
      setNote("");
      onUpdated(updated);
    }, "Delivery status updated.");
  };

  const history = [...order.statusHistory].reverse();

  return (
    <div className="admin-card">
      <h2>Delivery status</h2>
      <div className="admin-form-row">
        <select className="admin-select" value={status} onChange={e => setStatus(e.target.value)} aria-label="New status">
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          className="admin-select grow"
          value={note}
          maxLength={300}
          onChange={e => setNote(e.target.value)}
          placeholder="Note (optional), e.g. courier name / tracking no."
        />
        <button className="primary-button" onClick={save} disabled={saving || status === order.status}>
          {saving ? "Saving…" : "Update"}
        </button>
      </div>
      <Message />

      <h3>History</h3>
      {history.length === 0 ? (
        <p className="admin-muted small">No status changes recorded yet.</p>
      ) : (
        <ol className="timeline">
          {history.map((h, i) => (
            <li key={i}>
              <StatusBadge status={h.status === "Pending" ? "Order Placed" : h.status} />
              <span className="admin-muted small">
                {formatDate(h.changedAt)}{h.changedBy ? ` · by ${h.changedBy}` : ""}
              </span>
              {h.note && <p>{h.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PaymentDetails({ order, onUpdated }) {
  const pay = order.payment;
  const [status, setStatus] = useState(pay.status);
  const [transactionId, setTransactionId] = useState(toInput(pay.transactionId));
  const { saving, run, Message } = useSaver();

  useEffect(() => {
    setStatus(pay.status);
    setTransactionId(toInput(pay.transactionId));
  }, [pay.status, pay.transactionId]);

  const allowed = PAYMENT_STATUSES.filter(
    s => s !== "Refunded" || pay.status === "Paid" || pay.status === "Refunded"
  );
  const changed = status !== pay.status || transactionId.trim() !== toInput(pay.transactionId);

  const save = () =>
    run(async () => {
      const { order: updated } = await patchJSON(`/api/admin/orders/${order._id}/payment`, {
        status,
        transactionId: transactionId.trim() || null
      });
      onUpdated(updated);
    }, "Payment details saved.");

  return (
    <div className="admin-card">
      <h2>Payment details</h2>
      <dl className="detail-list">
        <div><dt>Payment method</dt><dd>{pay.method}</dd></div>
        <div><dt>Payment status</dt><dd><StatusBadge status={pay.status} kind="payment" /></dd></div>
        <div><dt>Transaction ID</dt><dd>{pay.transactionId ? <code>{pay.transactionId}</code> : <span className="admin-muted">Not available</span>}</dd></div>
        <div><dt>Payment date</dt><dd>{pay.paidAt ? formatDate(pay.paidAt) : <span className="admin-muted">—</span>}</dd></div>
        <div><dt>Order amount</dt><dd className="strong">{money(order.totalAmount)}</dd></div>
      </dl>

      <h3>Record payment</h3>
      <p className="admin-muted small">
        {pay.method === "Cash on Delivery"
          ? "Mark as Paid once the courier has collected the cash. Add a receipt reference only if you have a real one."
          : "Enter the transaction ID exactly as shown by your payment provider."}
      </p>
      <div className="admin-form-row">
        <select className="admin-select" value={status} onChange={e => setStatus(e.target.value)} aria-label="Payment status">
          {allowed.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          className="admin-select grow"
          value={transactionId}
          maxLength={100}
          onChange={e => setTransactionId(e.target.value)}
          placeholder={pay.method === "Cash on Delivery" ? "Receipt reference (optional)" : "Transaction ID"}
        />
        <button className="primary-button" onClick={save} disabled={saving || !changed}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <Message />
    </div>
  );
}

function BooksAndCosts({ order, onUpdated }) {
  const initial = () => ({
    deliveryCharge: toInput(order.costs.deliveryCharge),
    otherExpenses: toInput(order.costs.otherExpenses),
    items: Object.fromEntries(order.items.map(i => [i._id, toInput(i.costPrice)]))
  });
  const [form, setForm] = useState(initial);
  const [saveToCatalog, setSaveToCatalog] = useState(true);
  const { saving, run, Message } = useSaver();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setForm(initial()), [order]);

  const num = v => (v === "" ? null : Number(v));
  const invalid = [form.deliveryCharge, form.otherExpenses, ...Object.values(form.items)]
    .some(v => v !== "" && (!Number.isFinite(Number(v)) || Number(v) < 0));

  // Per-order profit, using what is saved (not unsaved edits)
  const productCost = order.items.reduce((n, i) => n + (i.costPrice ?? 0) * i.quantity, 0);
  const missing = order.items.some(i => i.costPrice === null) ||
    order.costs.deliveryCharge === null || order.costs.otherExpenses === null;
  const allItemCostsMissing = order.items.every(i => i.costPrice === null);
  const profit = order.totalAmount - productCost - (order.costs.deliveryCharge ?? 0) - (order.costs.otherExpenses ?? 0);

  const save = () =>
    run(async () => {
      const { order: updated } = await patchJSON(`/api/admin/orders/${order._id}/costs`, {
        deliveryCharge: num(form.deliveryCharge),
        otherExpenses: num(form.otherExpenses),
        itemCosts: Object.entries(form.items).map(([itemId, v]) => ({ itemId, costPrice: num(v) })),
        saveToCatalog
      });
      onUpdated(updated);
    }, "Costs saved.");

  return (
    <section className="admin-card">
      <div className="card-head">
        <h2>Ordered books</h2>
        <span className="admin-muted small">Cost prices are what the store paid per copy</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Book</th><th>Qty</th><th>Price</th><th>Amount</th><th>Unit cost</th></tr>
          </thead>
          <tbody>
            {order.items.map(item => (
              <tr key={item._id}>
                <td className="strong wrap">{item.title}</td>
                <td>{item.quantity}</td>
                <td>{money(item.price)}</td>
                <td>{money(item.price * item.quantity)}</td>
                <td>
                  <input
                    className="admin-select money-input"
                    type="number" min="0" step="0.01" inputMode="decimal"
                    value={form.items[item._id] ?? ""}
                    placeholder="Unknown"
                    onChange={e => setForm(f => ({ ...f, items: { ...f.items, [item._id]: e.target.value } }))}
                    aria-label={`Cost price for ${item.title}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan="3">Subtotal</td><td colSpan="2">{money(order.subtotal)}</td></tr>
            <tr><td colSpan="3">Delivery fee (paid by customer)</td><td colSpan="2">{order.deliveryFee ? money(order.deliveryFee) : "FREE"}</td></tr>
            <tr className="grand"><td colSpan="3">Order total</td><td colSpan="2">{money(order.totalAmount)}</td></tr>
          </tfoot>
        </table>
      </div>

      <div className="cost-grid">
        <label className="admin-field">
          <span>Delivery charge (paid to courier)</span>
          <input className="admin-select" type="number" min="0" step="0.01" placeholder="Not entered"
            value={form.deliveryCharge} onChange={e => setForm(f => ({ ...f, deliveryCharge: e.target.value }))} />
        </label>
        <label className="admin-field">
          <span>Other expenses (packaging, fees…)</span>
          <input className="admin-select" type="number" min="0" step="0.01" placeholder="Not entered"
            value={form.otherExpenses} onChange={e => setForm(f => ({ ...f, otherExpenses: e.target.value }))} />
        </label>
        <div className="order-profit">
          <span>{missing ? "Estimated profit" : "Order profit"}</span>
          <strong>{allItemCostsMissing ? "Unavailable" : money(profit)}</strong>
          {missing && <small>{allItemCostsMissing ? "Add book cost prices to calculate" : "Some costs not entered — real profit is lower"}</small>}
        </div>
      </div>

      <label className="admin-check">
        <input type="checkbox" checked={saveToCatalog} onChange={e => setSaveToCatalog(e.target.checked)} />
        Also save these cost prices on the matching books in MongoDB, so future orders get them automatically
      </label>

      <div className="admin-form-row end">
        <Message />
        <button className="primary-button" onClick={save} disabled={saving || invalid}>
          {saving ? "Saving…" : "Save costs"}
        </button>
      </div>
      {invalid && <p className="admin-error">Costs must be numbers of 0 or more.</p>}
    </section>
  );
}
