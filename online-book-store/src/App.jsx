import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, ChevronDown, Minus, Plus, Search, ShieldCheck, Truck, X } from "lucide-react";
import Navbar from "./components/Navbar";
import BookCard from "./components/BookCard";
import { books } from "./data/books";
import { CartProvider, useCart } from "./context/CartContext";

const categories = ["All", "Fiction", "Romance", "Thriller", "Self Help", "Fantasy", "Finance"];
const money = n => `₹${n.toLocaleString("en-IN")}`;

function Store() {
  const [page, setPage] = useState("home");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState("");
  const [order, setOrder] = useState(null);
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, count, total } = useCart();

  const filtered = useMemo(() => {
    let list = books.filter(book => (category === "All" || book.category === category) &&
      `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(search.toLowerCase()));
    if (sort === "low") list = [...list].sort((a,b) => a.price-b.price);
    if (sort === "high") list = [...list].sort((a,b) => b.price-a.price);
    if (sort === "rating") list = [...list].sort((a,b) => b.rating-a.rating);
    return list;
  }, [category, search, sort]);

  const add = book => {
    addToCart(book); setToast(`${book.title} added to your cart`);
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => setToast(""), 2400);
  };
  const browse = () => { setPage("books"); setCategory("All"); window.scrollTo({top:0,behavior:"smooth"}); };
  const featured = books.filter(book => [1,2,3,4].includes(book.id));

  return <div className="app-shell">
    <Navbar page={page} setPage={setPage} search={search} setSearch={setSearch}/>
    <main>
      {page === "home" && <>
        <section className="hero">
          <div className="hero-copy"><span className="eyebrow"><span className="eyebrow-line"/> YOUR NEXT CHAPTER STARTS HERE</span>
            <h1>Find stories<br/>that <em>stay</em> with you.</h1>
            <p>Discover your next favourite read from a handpicked collection of books for every kind of curious mind.</p>
            <div className="hero-actions"><button className="primary-button" onClick={browse}>Explore Books <ArrowRight size={17}/></button><span className="hero-note"><BookOpen size={17}/> A little world in every book</span></div>
            <div className="hero-stats"><div><strong>1,200+</strong><span>Happy readers</span></div><div><strong>500+</strong><span>Books to explore</span></div><div><strong>4.8/5</strong><span>Reader rating</span></div></div>
          </div>
          <div className="hero-visual"><div className="sun-shape"/><div className="hero-book book-one"><span>THE ART OF<br/>SLOW LIVING</span><small>FIND YOUR MOMENT</small></div><div className="hero-book book-two"><span>THE<br/>WONDER<br/>WITHIN</span><small>A NOVEL</small></div><div className="hero-book book-three"><span>little<br/>things</span><small>MATTER MOST</small></div><div className="floating-note">✦ &nbsp; Read. Dream. Repeat.</div></div>
        </section>
        <section className="benefits"><div><Truck/><span><b>Free delivery</b><small>On orders above ₹799</small></span></div><div><ShieldCheck/><span><b>Secure checkout</b><small>Your details stay safe</small></span></div><div><BookOpen/><span><b>Curated collection</b><small>Picked for book lovers</small></span></div></section>
        <section className="section-block"><div className="section-heading"><div><span className="eyebrow">HANDPICKED FOR YOU</span><h2>Readers' favourites</h2><p>Books our community can't stop talking about.</p></div><button className="text-link" onClick={browse}>View all books <ArrowRight size={16}/></button></div><div className="book-grid">{featured.map(book => <BookCard key={book.id} book={book} onAdd={add} onView={setSelected}/>)}</div></section>
        <section className="quote-banner"><span>“</span><p>A book is a dream that you hold in your hands.</p><small>— Neil Gaiman</small></section>
      </>}

      {page === "books" && <section className="catalog-page">
        <div className="page-intro"><span className="eyebrow">THE BOOKSHELF</span><h1>Explore our collection</h1><p>Find the perfect book for your next quiet afternoon.</p></div>
        <div className="catalog-toolbar"><div className="category-list">{categories.map(cat => <button key={cat} className={category===cat?"category-chip selected":"category-chip"} onClick={() => setCategory(cat)}>{cat}</button>)}</div><label className="sort-select">Sort by <select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="rating">Top rated</option></select><ChevronDown size={15}/></label></div>
        {filtered.length ? <div className="book-grid">{filtered.map(book => <BookCard key={book.id} book={book} onAdd={add} onView={setSelected}/>)}</div> : <div className="empty-state"><Search size={30}/><h3>No books found</h3><p>Try another title, author, or category.</p><button className="primary-button" onClick={()=>{setSearch("");setCategory("All");}}>Clear filters</button></div>}
      </section>}

      {page === "cart" && <section className="content-page"><div className="page-intro"><span className="eyebrow">YOUR READING LIST</span><h1>Shopping cart</h1><p>{count} {count===1?"book":"books"} ready for a new home.</p></div>
        {cart.length ? <div className="cart-layout"><div className="cart-items">{cart.map(item=><div className="cart-row" key={item.id}><div className={`mini-cover ${item.color}`}><BookOpen/></div><div className="cart-item-info"><h3>{item.title}</h3><p>{item.author}</p><strong>{money(item.price)}</strong></div><div className="quantity-control"><button onClick={()=>updateQuantity(item.id,item.quantity-1)} aria-label="Decrease quantity"><Minus size={14}/></button><span>{item.quantity}</span><button onClick={()=>updateQuantity(item.id,item.quantity+1)} aria-label="Increase quantity"><Plus size={14}/></button></div><strong className="line-total">{money(item.price*item.quantity)}</strong><button className="remove-button" onClick={()=>removeFromCart(item.id)} aria-label="Remove item"><X size={17}/></button></div>)}<button className="continue-link" onClick={browse}>← Continue shopping</button></div>
          <aside className="order-summary"><h2>Order summary</h2><div><span>Subtotal ({count} items)</span><b>{money(total)}</b></div><div><span>Delivery</span><b>{total>=799?"FREE":"₹49"}</b></div><div className="summary-total"><span>Total</span><strong>{money(total+(total>=799?0:49))}</strong></div><p className="shipping-note">{total>=799?"You've unlocked free delivery!":"Add "+money(799-total)+" more for free delivery."}</p><button className="primary-button full-button" onClick={()=>setPage("checkout")}>Proceed to checkout <ArrowRight size={17}/></button></aside></div> : <div className="empty-state"><ShoppingBag size={34}/><h2>Your cart is waiting</h2><p>Looks like you haven't added any books yet.</p><button className="primary-button" onClick={browse}>Browse books <ArrowRight size={16}/></button></div>}
      </section>}

      {page === "checkout" && <Checkout cart={cart} total={total} clearCart={clearCart} setPage={setPage} setOrder={setOrder} />}
      {page === "success" && <section className="empty-state success-state"><CheckCircle2 size={54}/><span className="eyebrow">ORDER CONFIRMED</span><h1>Happy reading!</h1><p>Your demo order {order ? `#${order}` : ""} has been placed successfully.</p><button className="primary-button" onClick={()=>{setPage("books");setSearch("");}}>Continue exploring <ArrowRight size={16}/></button></section>}
      {page === "about" && <section className="content-page about-page"><div className="page-intro"><span className="eyebrow">A STORE FOR THE LOVE OF READING</span><h1>Every book opens<br/>a new door.</h1><p>PageTurner is a simple online bookstore concept made for readers who believe the right story can change an ordinary day.</p></div><div className="about-cards"><div><BookOpen/><h3>Thoughtful selection</h3><p>A collection across fiction, romance, thrillers, fantasy, and personal growth.</p></div><div><Truck/><h3>Easy shopping</h3><p>Browse, search, add your favourites to the cart, and review your order in a few clicks.</p></div><div><ShieldCheck/><h3>Made for readers</h3><p>A clean and welcoming experience that keeps the joy of books at the centre.</p></div></div></section>}
    </main>
    <footer className="footer"><div className="footer-brand"><BookOpen size={20}/> page<span>turner</span></div><p>Stories worth staying up for.</p><small>© 2026 PageTurner Book Store. Demo project.</small></footer>
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
    {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="book-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}><X/></button><div className={`modal-cover ${selected.color}`}><div className="cover-art"><span className="cover-small">A PAGE TURNER EDITION</span><strong>{selected.title}</strong><i>{selected.author}</i></div></div><div className="modal-details"><span className="book-category">{selected.category}</span><h2>{selected.title}</h2><p className="book-author">by {selected.author}</p><span className="rating"><span>★</span> {selected.rating} reader rating</span><p>{selected.description}</p><strong className="modal-price">{money(selected.price)}</strong><button className="primary-button full-button" onClick={()=>{add(selected);setSelected(null);}}>Add to Cart <ShoppingBag size={16}/></button></div></div></div>}
  </div>;
}

function Checkout({ cart, total, clearCart, setPage, setOrder }) {
  const [form, setForm] = useState({ name:"", email:"", phone:"", address:"", city:"", pincode:"" });
  const [error, setError] = useState("");
  const delivery = total >= 799 ? 0 : 49;
  const change = e => setForm({...form,[e.target.name]:e.target.value});
  const submit = e => {
    e.preventDefault();
    if (!cart.length) { setError("Your cart is empty."); return; }
    if (!/^[6-9]\d{9}$/.test(form.phone)) { setError("Enter a valid 10-digit Indian mobile number."); return; }
    if (!/^\d{6}$/.test(form.pincode)) { setError("Enter a valid 6-digit PIN code."); return; }
    const id = "PT" + Math.floor(100000 + Math.random()*900000);
    setOrder(id); clearCart(); setPage("success"); window.scrollTo({top:0,behavior:"smooth"});
  };
  return <section className="content-page"><div className="page-intro"><span className="eyebrow">ALMOST THERE</span><h1>Checkout</h1><p>Enter your delivery details to complete this demo order.</p></div><div className="checkout-layout"><form className="checkout-form" onSubmit={submit}><h2>Delivery information</h2><div className="form-grid"><label>Full name<input required name="name" value={form.name} onChange={change} placeholder="Your name"/></label><label>Email address<input required type="email" name="email" value={form.email} onChange={change} placeholder="you@example.com"/></label><label>Mobile number<input required name="phone" value={form.phone} onChange={change} maxLength="10" placeholder="10-digit mobile number"/></label><label>PIN code<input required name="pincode" value={form.pincode} onChange={change} maxLength="6" placeholder="6-digit PIN code"/></label><label className="span-two">Delivery address<textarea required name="address" value={form.address} onChange={change} rows="3" placeholder="House no., street, area"/></label><label className="span-two">City<input required name="city" value={form.city} onChange={change} placeholder="City"/></label></div>{error && <p className="form-error">{error}</p>}<button className="primary-button full-button" type="submit">Place demo order <ArrowRight size={17}/></button><p className="demo-note">Demo only: no real payment is collected and no order is sent to a server.</p></form><aside className="order-summary"><h2>Your order</h2>{cart.map(item=><div key={item.id}><span>{item.title} × {item.quantity}</span><b>{money(item.price*item.quantity)}</b></div>)}<div><span>Delivery</span><b>{delivery===0?"FREE":money(delivery)}</b></div><div className="summary-total"><span>Total</span><strong>{money(total+delivery)}</strong></div></aside></div></section>;
}

export default function App() {
  return <CartProvider><Store/></CartProvider>;
}