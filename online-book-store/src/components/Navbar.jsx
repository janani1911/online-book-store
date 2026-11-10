import { BookOpen, ShoppingBag, Search, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "../context/CartContext";

export default function Navbar({ page, setPage, search, setSearch }) {
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (next) => { setPage(next); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <header className="site-header">
    <div className="nav-wrap">
      <button className="brand" onClick={() => go("home")} aria-label="PageTurner home"><span className="brand-icon"><BookOpen size={21}/></span><span>page<span className="brand-accent">turner</span></span></button>
      <nav className={menuOpen ? "nav-links open" : "nav-links"}>
        <button className={page === "home" ? "nav-link active" : "nav-link"} onClick={() => go("home")}>Home</button>
        <button className={page === "books" ? "nav-link active" : "nav-link"} onClick={() => go("books")}>Browse Books</button>
        <button className={page === "about" ? "nav-link active" : "nav-link"} onClick={() => go("about")}>About</button>
      </nav>
      <div className="nav-actions">
        <label className="nav-search"><Search size={17}/><input value={search} onChange={e => { setSearch(e.target.value); if(e.target.value) setPage("books"); }} placeholder="Search books..." /></label>
        <button className="cart-button" onClick={() => go("cart")} aria-label="Open cart"><ShoppingBag size={19}/><span>Cart</span>{count > 0 && <b className="cart-count">{count}</b>}</button>
        <button className="menu-toggle" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu">{menuOpen ? <X/> : <Menu/>}</button>
      </div>
    </div>
  </header>;
}