// Admin-only order management APIs. Every route here requires a valid admin JWT.
// Mounted in server.js at /api/admin
const express = require("express");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Book = require("../models/Book");
const { requireAdmin } = require("../middleware/auth");

const { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } = Order;

const router = express.Router();
router.use(requireAdmin);

const TIMEZONE = "Asia/Kolkata";
const CLOSED_STATUSES = ["Delivered", "Cancelled"];

// ---------- helpers ----------

const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "YYYY-MM-DD" in India time -> Date at the start of that day
function startOfDayIST(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    const date = new Date(`${value}T00:00:00+05:30`);
    return Number.isNaN(date.getTime()) ? null : date;
}

const dayKeyIST = date =>
    new Date(date).toLocaleDateString("en-CA", { timeZone: TIMEZONE });

// Accepts a number >= 0, or null/"" to clear the value
function parseOptionalAmount(value) {
    if (value === null || value === "") return { ok: true, value: null };
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return { ok: false };
    return { ok: true, value: Math.round(number * 100) / 100 };
}

// Gives every order the same shape, including orders saved before the
// delivery / payment / cost fields existed.
function normalizeOrder(doc) {
    const order = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
    const items = order.items || [];
    const subtotal = order.subtotal ?? items.reduce((n, i) => n + i.price * i.quantity, 0);

    return {
        ...order,
        status: order.status === "Pending" ? "Order Placed" : order.status,
        subtotal,
        deliveryFee: order.deliveryFee ?? Math.max(0, order.totalAmount - subtotal),
        items: items.map(i => ({ ...i, costPrice: i.costPrice ?? null })),
        statusHistory: order.statusHistory || [],
        payment: {
            method: order.payment?.method || "Cash on Delivery",
            status: order.payment?.status || "Pending",
            transactionId: order.payment?.transactionId || null,
            paidAt: order.payment?.paidAt || null
        },
        costs: {
            deliveryCharge: order.costs?.deliveryCharge ?? null,
            otherExpenses: order.costs?.otherExpenses ?? null
        }
    };
}

const statusQuery = status =>
    status === "Order Placed" ? { $in: ["Order Placed", "Pending"] } : status;

async function findOrderOr404(req, res) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Invalid order ID" });
        return null;
    }
    const order = await Order.findById(id);
    if (!order) {
        res.status(404).json({ message: "Order not found" });
        return null;
    }
    return order;
}

// ---------- GET /api/admin/orders ----------
// Query: search, status ("In Progress" or a status), paymentStatus, paymentMethod,
//        from, to (YYYY-MM-DD, inclusive), page, limit
router.get("/orders", async (req, res) => {
    try {
        const { search, status, paymentStatus, paymentMethod, from, to } = req.query;
        const filter = {};

        if (status === "In Progress") {
            filter.status = { $nin: CLOSED_STATUSES };
        } else if (status) {
            if (!ORDER_STATUSES.includes(status)) {
                return res.status(400).json({ message: "Invalid status filter" });
            }
            filter.status = statusQuery(status);
        }

        if (paymentStatus) {
            if (!PAYMENT_STATUSES.includes(paymentStatus)) {
                return res.status(400).json({ message: "Invalid payment status filter" });
            }
            // Old orders without a payment block count as "Pending"
            filter["payment.status"] = paymentStatus === "Pending"
                ? { $in: ["Pending", null] }
                : paymentStatus;
        }

        if (paymentMethod) {
            if (!PAYMENT_METHODS.includes(paymentMethod)) {
                return res.status(400).json({ message: "Invalid payment method filter" });
            }
            filter["payment.method"] = paymentMethod === "Cash on Delivery"
                ? { $in: ["Cash on Delivery", null] }
                : paymentMethod;
        }

        const fromDate = startOfDayIST(from);
        const toDate = startOfDayIST(to);
        if ((from && !fromDate) || (to && !toDate)) {
            return res.status(400).json({ message: "Dates must be YYYY-MM-DD" });
        }
        if (fromDate || toDate) {
            filter.createdAt = {};
            if (fromDate) filter.createdAt.$gte = fromDate;
            // "to" is inclusive: everything before the start of the next day
            if (toDate) filter.createdAt.$lt = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);
        }

        const term = typeof search === "string" ? search.trim().replace(/^#/, "").slice(0, 100) : "";
        if (term) {
            const regex = new RegExp(escapeRegex(term), "i");
            filter.$or = [
                { customerName: regex },
                { email: regex },
                { phone: regex },
                { city: regex },
                { state: regex },
                { pincode: regex },
                { "items.title": regex },
                { "payment.transactionId": regex },
                // Matches the short order ID shown in the dashboard (last 6 chars)
                { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: escapeRegex(term), options: "i" } } }
            ];
        }

        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

        const [total, orders] = await Promise.all([
            Order.countDocuments(filter),
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        res.status(200).json({
            total,
            page,
            pages: Math.max(Math.ceil(total / limit), 1),
            orders: orders.map(normalizeOrder)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ---------- GET /api/admin/orders/:id ----------
router.get("/orders/:id", async (req, res) => {
    try {
        const order = await findOrderOr404(req, res);
        if (!order) return;
        res.status(200).json({ order: normalizeOrder(order) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ---------- PATCH /api/admin/orders/:id/status ----------
// Body: { status, note? }
router.patch("/orders/:id/status", async (req, res) => {
    try {
        const { status, note } = req.body || {};

        if (!ORDER_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Invalid order status" });
        }
        if (note !== undefined && (typeof note !== "string" || note.length > 300)) {
            return res.status(400).json({ message: "Note must be text up to 300 characters" });
        }

        const order = await findOrderOr404(req, res);
        if (!order) return;

        const current = order.status === "Pending" ? "Order Placed" : order.status;
        if (current === status) {
            return res.status(400).json({ message: `Order is already "${status}"` });
        }

        order.status = status;
        order.statusHistory.push({
            status,
            note: note?.trim() || undefined,
            changedBy: req.admin.username,
            changedAt: new Date()
        });
        await order.save();

        res.status(200).json({
            message: "Delivery status updated",
            order: normalizeOrder(order)
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// ---------- PATCH /api/admin/orders/:id/payment ----------
// Body: { status, transactionId? }
// Records what actually happened (e.g. COD cash collected). Nothing is generated.
router.patch("/orders/:id/payment", async (req, res) => {
    try {
        const { status, transactionId } = req.body || {};

        if (!PAYMENT_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Invalid payment status" });
        }
        if (transactionId !== undefined && transactionId !== null &&
            (typeof transactionId !== "string" || transactionId.trim().length > 100)) {
            return res.status(400).json({ message: "Transaction ID must be text up to 100 characters" });
        }

        const order = await findOrderOr404(req, res);
        if (!order) return;

        const previous = order.payment?.status || "Pending";
        if (status === "Refunded" && previous !== "Paid" && previous !== "Refunded") {
            return res.status(400).json({ message: "Only a paid order can be marked as refunded" });
        }

        if (!order.payment) order.payment = {};
        order.payment.status = status;

        if (transactionId !== undefined) {
            order.payment.transactionId = transactionId?.trim() || undefined;
        }

        if (status === "Paid" && !order.payment.paidAt) {
            order.payment.paidAt = new Date();
        }
        if (status === "Pending" || status === "Failed") {
            order.payment.paidAt = undefined;
        }

        await order.save();

        res.status(200).json({
            message: "Payment details updated",
            order: normalizeOrder(order)
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// ---------- PATCH /api/admin/orders/:id/costs ----------
// Body: { deliveryCharge?, otherExpenses?, itemCosts?: [{ itemId, costPrice }],
//         saveToCatalog?: boolean }
// saveToCatalog also stores the cost price on the matching Book so future
// orders of that title get it automatically.
router.patch("/orders/:id/costs", async (req, res) => {
    try {
        const { deliveryCharge, otherExpenses, itemCosts, saveToCatalog } = req.body || {};

        const order = await findOrderOr404(req, res);
        if (!order) return;

        if (!order.costs) order.costs = {};

        for (const [field, value] of [["deliveryCharge", deliveryCharge], ["otherExpenses", otherExpenses]]) {
            if (value === undefined) continue;
            const parsed = parseOptionalAmount(value);
            if (!parsed.ok) {
                return res.status(400).json({ message: `${field} must be a number of 0 or more` });
            }
            order.costs[field] = parsed.value;
        }

        const catalogUpdates = [];
        if (itemCosts !== undefined) {
            if (!Array.isArray(itemCosts)) {
                return res.status(400).json({ message: "itemCosts must be a list" });
            }
            for (const { itemId, costPrice } of itemCosts) {
                const item = order.items.id(itemId);
                const parsed = parseOptionalAmount(costPrice);
                if (!item) return res.status(400).json({ message: "Unknown order item" });
                if (!parsed.ok) {
                    return res.status(400).json({ message: "Cost price must be a number of 0 or more" });
                }
                item.costPrice = parsed.value;
                if (parsed.value !== null) catalogUpdates.push({ title: item.title, costPrice: parsed.value });
            }
        }

        await order.save();

        let catalogUpdated = 0;
        if (saveToCatalog === true) {
            for (const { title, costPrice } of catalogUpdates) {
                const result = await Book.updateMany(
                    { title: new RegExp(`^${escapeRegex(title)}$`, "i") },
                    { costPrice }
                );
                catalogUpdated += result.modifiedCount;
            }
        }

        res.status(200).json({
            message: "Costs updated",
            catalogUpdated,
            order: normalizeOrder(order)
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// ---------- GET /api/admin/stats ----------
router.get("/stats", async (req, res) => {
    try {
        const [allOrders, recentOrders] = await Promise.all([
            Order.find({}, {
                email: 1, status: 1, items: 1, subtotal: 1, deliveryFee: 1,
                totalAmount: 1, payment: 1, costs: 1, createdAt: 1
            }).lean(),
            Order.find().sort({ createdAt: -1 }).limit(5).lean()
        ]);

        const orders = allOrders.map(normalizeOrder);

        const statusCounts = Object.fromEntries(ORDER_STATUSES.map(s => [s, 0]));
        const paymentByStatus = Object.fromEntries(PAYMENT_STATUSES.map(s => [s, { count: 0, amount: 0 }]));
        const paymentByMethod = Object.fromEntries(PAYMENT_METHODS.map(m => [m, { count: 0, amount: 0 }]));
        const customers = new Set();

        // Last 14 days (India time), oldest first, including days with no orders
        const days = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            days.push({ date: dayKeyIST(d), revenue: 0, orders: 0 });
        }
        const dayIndex = new Map(days.map((d, i) => [d.date, i]));

        const bookSales = new Map();

        const profit = {
            revenue: 0,            // order value of orders that count as sales
            deliveryFees: 0,       // part of revenue
            productCost: 0,        // known product cost
            deliveryCharges: 0,    // known courier cost
            otherExpenses: 0,      // known other expenses
            countedOrders: 0,
            itemLinesTotal: 0,
            itemLinesMissingCost: 0,
            revenueWithoutCost: 0, // sales value of book lines with no cost price
            ordersMissingDeliveryCharge: 0,
            ordersMissingOtherExpenses: 0
        };

        for (const order of orders) {
            statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
            customers.add(String(order.email).trim().toLowerCase());

            const pay = order.payment;
            if (paymentByStatus[pay.status]) {
                paymentByStatus[pay.status].count += 1;
                paymentByStatus[pay.status].amount += order.totalAmount;
            }
            if (paymentByMethod[pay.method]) {
                paymentByMethod[pay.method].count += 1;
                paymentByMethod[pay.method].amount += order.totalAmount;
            }

            // A sale = not cancelled and not refunded
            if (order.status === "Cancelled" || pay.status === "Refunded") continue;

            const day = dayIndex.get(dayKeyIST(order.createdAt));
            if (day !== undefined) {
                days[day].revenue += order.totalAmount;
                days[day].orders += 1;
            }

            profit.revenue += order.totalAmount;
            profit.deliveryFees += order.deliveryFee;
            profit.countedOrders += 1;

            for (const item of order.items) {
                profit.itemLinesTotal += 1;
                if (item.costPrice === null) {
                    profit.itemLinesMissingCost += 1;
                    profit.revenueWithoutCost += item.price * item.quantity;
                } else {
                    profit.productCost += item.costPrice * item.quantity;
                }

                const sold = bookSales.get(item.title) || { title: item.title, quantity: 0, revenue: 0 };
                sold.quantity += item.quantity;
                sold.revenue += item.price * item.quantity;
                bookSales.set(item.title, sold);
            }

            if (order.costs.deliveryCharge === null) profit.ordersMissingDeliveryCharge += 1;
            else profit.deliveryCharges += order.costs.deliveryCharge;

            if (order.costs.otherExpenses === null) profit.ordersMissingOtherExpenses += 1;
            else profit.otherExpenses += order.costs.otherExpenses;
        }

        // complete    = every cost is known -> real profit
        // estimate    = some costs missing  -> profit from known costs only (real profit is lower)
        // unavailable = no product cost known at all -> no profit figure is shown
        let profitStatus = "complete";
        if (profit.countedOrders === 0) {
            profitStatus = "complete";
        } else if (profit.itemLinesTotal > 0 && profit.itemLinesMissingCost === profit.itemLinesTotal) {
            profitStatus = "unavailable";
        } else if (profit.itemLinesMissingCost > 0 ||
                   profit.ordersMissingDeliveryCharge > 0 ||
                   profit.ordersMissingOtherExpenses > 0) {
            profitStatus = "estimate";
        }

        const profitValue = profitStatus === "unavailable"
            ? null
            : profit.revenue - profit.productCost - profit.deliveryCharges - profit.otherExpenses;

        const round = n => Math.round(n * 100) / 100;

        res.status(200).json({
            totalOrders: orders.length,
            totalSales: round(profit.revenue),
            totalRevenue: round(profit.revenue), // kept for older clients
            collectedAmount: round(paymentByStatus.Paid.amount),
            totalCustomers: customers.size,
            pendingOrders: orders.filter(o => !CLOSED_STATUSES.includes(o.status)).length,
            deliveredOrders: statusCounts.Delivered,
            cancelledOrders: statusCounts.Cancelled,
            statusCounts,
            payments: { byStatus: paymentByStatus, byMethod: paymentByMethod },
            profit: {
                ...Object.fromEntries(Object.entries(profit).map(([k, v]) => [k, round(v)])),
                totalProfit: profitValue === null ? null : round(profitValue),
                status: profitStatus
            },
            dailyRevenue: days,
            topBooks: [...bookSales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
            recentOrders: recentOrders.map(normalizeOrder)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
