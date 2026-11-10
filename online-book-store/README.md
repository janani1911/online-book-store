# PageTurner — Online Book Store

A responsive React bookstore demo built with Vite.

## Features
- Browse a sample book collection
- Search by title, author, or category
- Filter by category and sort by price/rating
- View book details in a modal
- Add books to cart, change quantities, and remove items
- Cart is saved in browser Local Storage
- Checkout form with basic validation
- Demo order confirmation (no real payment or backend)

## Tech stack
React, JavaScript, CSS, Vite, Lucide React, Context API, Local Storage.

## Run locally
1. Install Node.js (LTS).
2. Extract this project folder.
3. Open a terminal inside `online-book-store`.
4. Run:

```bash
npm install
npm run dev
```

5. Open the local URL printed by Vite (usually `http://localhost:5173`).

## Production build
```bash
npm run build
npm run preview
```

## Important
This is a frontend portfolio project. The book data is sample data in `src/data/books.js`. Checkout creates a local demo confirmation only. It does not process payments, send orders to a server, or use a real database. A future version can add an Express API, MongoDB, authentication, and a payment gateway.
