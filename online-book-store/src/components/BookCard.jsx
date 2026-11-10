import { Star, ShoppingBag, Eye } from "lucide-react";
export default function BookCard({ book, onAdd, onView }) {
  return <article className="book-card">
    <div className={`book-cover ${book.color}`}>
      {book.label && <span className="book-label">{book.label}</span>}
      <div className="cover-art"><span className="cover-small">A PAGE TURNER EDITION</span><strong>{book.title}</strong><i>{book.author}</i></div>
      <button className="quick-view" onClick={() => onView(book)} aria-label={`View ${book.title}`}><Eye size={17}/></button>
    </div>
    <div className="book-info">
      <span className="book-category">{book.category}</span>
      <h3>{book.title}</h3><p className="book-author">by {book.author}</p>
      <div className="book-bottom"><span className="rating"><Star size={14} fill="currentColor"/> {book.rating}</span><strong>₹{book.price}</strong></div>
      <button className="add-button" onClick={() => onAdd(book)}><ShoppingBag size={16}/> Add to Cart</button>
    </div>
  </article>;
}