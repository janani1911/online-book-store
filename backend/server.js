
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Book = require("./models/Book");
const Order = require("./models/Order.js");
const Admin = require("./models/Admin");
const adminOrderRoutes = require("./routes/adminOrders");
const {
    requireAdmin,
    loginRateLimit,
    recordFailedLogin,
    clearFailedLogins
} = require("./middleware/auth");

if (!process.env.JWT_SECRET) {
    console.log("WARNING: JWT_SECRET is missing in .env - admin login will not work.");
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection and server start
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully!");

        app.listen(process.env.PORT || 5000, () => {
            console.log("Server running on port 5000");
            console.log("Backend URL: http://localhost:5000");
            console.log("Books API: http://localhost:5000/api/books");
            console.log("Orders API: http://localhost:5000/api/orders");
        });
    })
    .catch((error) => {
        console.log("MongoDB Connection Error:", error.message);
    });

// TEST API
app.get("/", (req, res) => {
    res.send("JS Book Store Backend is Running!");
});


// ===================================
// BOOK APIs
// ===================================

// 1. GET - Fetch all books
app.get("/api/books", async (req, res) => {
    try {
        const books = await Book.find();

        res.status(200).json(books);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// 2. POST - Add a new book
app.post("/api/books", async (req, res) => {
    try {
        const newBook = new Book(req.body);
        const savedBook = await newBook.save();

        res.status(201).json({
            message: "Book added successfully!",
            book: savedBook
        });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


// 3. PUT - Update book by ID
app.put("/api/books/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid book ID"
            });
        }

        const updatedBook = await Book.findByIdAndUpdate(
            id,
            req.body,
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        if (!updatedBook) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        res.status(200).json({
            message: "Book updated successfully!",
            book: updatedBook
        });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


// 4. DELETE - Delete book by ID
app.delete("/api/books/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid book ID"
            });
        }

        const deletedBook = await Book.findByIdAndDelete(id);

        if (!deletedBook) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        res.status(200).json({
            message: "Book deleted successfully!",
            book: deletedBook
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// ===================================
// ORDER APIs
// ===================================

// 5. POST - Save a new customer order
// Same delivery rule as the storefront cart: free delivery from Rs.799
const FREE_DELIVERY_FROM = 799;
const DELIVERY_FEE = 49;

app.post("/api/orders", async (req, res) => {
    try {
        const {
            customerName,
            email,
            phone,
            address,
            city,
            state,
            pincode,
            items,
            paymentMethod = "Cash on Delivery"
        } = req.body || {};

        const required = { customerName, email, phone, address, city, pincode };
        if (Object.values(required).some(v => typeof v !== "string" || !v.trim())) {
            return res.status(400).json({
                message: "Please provide all customer details"
            });
        }

        if (state !== undefined && typeof state !== "string") {
            return res.status(400).json({ message: "Invalid state" });
        }

        if (!/^[6-9]\d{9}$/.test(phone.trim())) {
            return res.status(400).json({ message: "Enter a valid 10-digit mobile number" });
        }

        if (!/^\d{6}$/.test(pincode.trim())) {
            return res.status(400).json({ message: "Enter a valid 6-digit PIN code" });
        }

        // No payment gateway is connected, so online payments cannot be taken yet.
        // Orders are never marked as paid online without a real transaction.
        if (paymentMethod !== "Cash on Delivery") {
            return res.status(400).json({
                message: "Only Cash on Delivery is available right now"
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Order must contain at least one book"
            });
        }

        for (const item of items) {
            if (
                !item ||
                typeof item.title !== "string" ||
                !item.title.trim() ||
                !Number.isFinite(item.price) ||
                !Number.isInteger(item.quantity) ||
                item.price < 0 ||
                item.quantity < 1
            ) {
                return res.status(400).json({
                    message: "Invalid book details in order"
                });
            }
        }

        // Copy each book's cost price (if the Book exists in MongoDB with one)
        // onto the order, so profit stays correct even if the cost changes later.
        const titles = items.map(item => item.title.trim());
        const catalog = await Book.find({ title: { $in: titles } })
            .collation({ locale: "en", strength: 2 })
            .lean();
        const byTitle = new Map(catalog.map(book => [book.title.toLowerCase(), book]));

        const orderItems = items.map(item => {
            const book = byTitle.get(item.title.trim().toLowerCase());
            return {
                bookId: book?._id,
                title: item.title.trim(),
                price: item.price,
                quantity: item.quantity,
                costPrice: Number.isFinite(book?.costPrice) ? book.costPrice : null
            };
        });

        const subtotal = orderItems.reduce(
            (total, item) => total + item.price * item.quantity,
            0
        );
        const deliveryFee = subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;

        const newOrder = new Order({
            customerName: customerName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            address: address.trim(),
            city: city.trim(),
            state: state?.trim() || undefined,
            pincode: pincode.trim(),
            items: orderItems,
            subtotal,
            deliveryFee,
            totalAmount: subtotal + deliveryFee,
            status: "Order Placed",
            statusHistory: [{ status: "Order Placed", changedBy: "customer" }],
            payment: { method: "Cash on Delivery", status: "Pending" }
        });

        const savedOrder = await newOrder.save();

        res.status(201).json({
            message: "Order placed successfully!",
            order: savedOrder
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
});


// 6. GET - Fetch all customer orders (admin only)
app.get("/api/orders", requireAdmin, async (req, res) => {
    try {
        const orders = await Order.find().sort({
            createdAt: -1
        });

        res.status(200).json({
            totalOrders: orders.length,
            orders
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});


// 7. PUT - Update order status (admin only)
app.put("/api/orders/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Kept for backward compatibility; the dashboard uses
        // PATCH /api/admin/orders/:id/status instead.
        const allowedStatuses = Order.ORDER_STATUSES;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid order status"
            });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            {
                status,
                $push: {
                    statusHistory: { status, changedBy: req.admin.username }
                }
            },
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        if (!updatedOrder) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        res.status(200).json({
            message: "Order status updated successfully!",
            order: updatedOrder
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
});


// ===================================
// ADMIN APIs
// ===================================

// A real bcrypt hash used when the username does not exist, so a wrong
// username takes as long as a wrong password (prevents username guessing).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

// 8. POST - Admin login, returns a JWT valid for 8 hours
app.post("/api/admin/login", loginRateLimit, async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (typeof username !== "string" || typeof password !== "string" ||
            !username.trim() || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: "Server is missing JWT_SECRET"
            });
        }

        const admin = await Admin.findOne({
            username: username.trim().toLowerCase()
        });

        const passwordOk = await bcrypt.compare(
            password,
            admin ? admin.passwordHash : DUMMY_HASH
        );

        if (!admin || !passwordOk) {
            recordFailedLogin(req.ip);
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        clearFailedLogins(req.ip);

        const token = jwt.sign(
            { sub: admin._id.toString(), username: admin.username, role: "admin" },
            process.env.JWT_SECRET,
            { algorithm: "HS256", expiresIn: "8h" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            admin: { username: admin.username }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// 9. GET - Check the current admin token
app.get("/api/admin/me", requireAdmin, (req, res) => {
    res.status(200).json({ admin: { username: req.admin.username } });
});


// 10. Order management + dashboard statistics (admin only)
//   GET   /api/admin/stats
//   GET   /api/admin/orders
//   GET   /api/admin/orders/:id
//   PATCH /api/admin/orders/:id/status
//   PATCH /api/admin/orders/:id/payment
//   PATCH /api/admin/orders/:id/costs
app.use("/api/admin", adminOrderRoutes);
