const mongoose = require("mongoose");

// Delivery / order lifecycle, in the order an order normally moves through it.
const ORDER_STATUSES = [
  "Order Placed",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled"
];

// "Pending" was the default status before the delivery workflow was added.
// It stays valid so older orders still load; the API reports it as "Order Placed".
const LEGACY_STATUSES = ["Pending"];

const PAYMENT_METHODS = ["Cash on Delivery", "Online"];
const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"];

const orderItemSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book"
  },

  title: {
    type: String,
    required: true
  },

  quantity: {
    type: Number,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  // What one copy cost the store. Copied from Book.costPrice when the order is
  // placed, or entered later by the admin. null = unknown (profit is then an estimate).
  costPrice: {
    type: Number,
    min: 0,
    default: null
  }
});

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, trim: true, maxlength: 300 },
    changedBy: { type: String },
    changedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true
    },

    phone: {
      type: String,
      required: true
    },

    address: {
      type: String,
      required: true
    },

    city: {
      type: String,
      required: true
    },

    // Optional so orders placed before this field existed remain valid
    state: {
      type: String,
      trim: true
    },

    pincode: {
      type: String,
      required: true
    },

    items: [orderItemSchema],

    // Sum of book prices x quantities
    subtotal: {
      type: Number
    },

    // Delivery fee charged to the customer (part of revenue)
    deliveryFee: {
      type: Number,
      min: 0,
      default: 0
    },

    // Amount the customer pays = subtotal + deliveryFee
    totalAmount: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: [...ORDER_STATUSES, ...LEGACY_STATUSES],
      default: "Order Placed"
    },

    statusHistory: [statusHistorySchema],

    payment: {
      method: {
        type: String,
        enum: PAYMENT_METHODS,
        default: "Cash on Delivery"
      },
      status: {
        type: String,
        enum: PAYMENT_STATUSES,
        default: "Pending"
      },
      // Only set from a real payment gateway / bank reference. Never generated.
      transactionId: {
        type: String,
        trim: true
      },
      paidAt: {
        type: Date
      }
    },

    // Store-side costs entered by the admin. null = not entered yet.
    costs: {
      // What the courier charged the store to deliver this order
      deliveryCharge: { type: Number, min: 0, default: null },
      // Packaging, payment gateway fees, etc.
      otherExpenses: { type: Number, min: 0, default: null }
    }
  },
  {
    timestamps: true
  }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.LEGACY_STATUSES = LEGACY_STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
