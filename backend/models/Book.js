const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    category: {
        type: String
    },
    description: {
        type: String
    },
    image: {
        type: String
    },
    stock: {
        type: Number,
        default: 10
    },
    // What the store pays for one copy. Used for profit; optional.
    costPrice: {
        type: Number,
        min: 0
    }
});

module.exports = mongoose.model("Book", bookSchema);