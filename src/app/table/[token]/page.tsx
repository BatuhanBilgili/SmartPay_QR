'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  RESTAURANT,
  CATEGORIES,
  MENU_ITEMS,
  FEATURED_ITEM,
  type MockMenuItem,
  type MockCategory,
} from '@/lib/mock-data';

// ── Cart Item type ──
interface CartItem {
  menuItem: MockMenuItem;
  quantity: number;
}

// ── Emoji options for join modal ──
const EMOJI_OPTIONS = ['👤', '😎', '🤩', '🦁', '🐻', '🌟', '🔥', '🎯', '💎', '🎪'];

export default function TablePage() {
  // ── State ──
  const [isJoined, setIsJoined] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👤');
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0].id);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; desc: string } | null>(null);

  const categoryTabsRef = useRef<HTMLDivElement>(null);

  // ── Cart helpers ──
  const cartItems = Array.from(cart.values());
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );

  const addToCart = useCallback((item: MockMenuItem) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      if (existing) {
        next.set(item.id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(item.id, { menuItem: item, quantity: 1 });
      }
      return next;
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (existing && existing.quantity > 1) {
        next.set(itemId, { ...existing, quantity: existing.quantity - 1 });
      } else {
        next.delete(itemId);
      }
      return next;
    });
  }, []);

  const getItemQuantity = useCallback(
    (itemId: string) => cart.get(itemId)?.quantity || 0,
    [cart]
  );

  const clearCart = useCallback(() => {
    setCart(new Map());
    setIsCartOpen(false);
  }, []);

  const placeOrder = useCallback(() => {
    setToast({
      title: 'Sipariş Alındı! 🎉',
      desc: `${cartCount} ürün mutfağa iletildi`,
    });
    setCart(new Map());
    setIsCartOpen(false);
    setTimeout(() => setToast(null), 3000);
  }, [cartCount]);

  // ── Scroll to category ──
  const scrollToCategory = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    const el = document.getElementById(`category-${categoryId}`);
    if (el) {
      const headerHeight = 56 + 52; // header + tabs
      const y = el.getBoundingClientRect().top + window.scrollY - headerHeight;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  // ── Format price ──
  const formatPrice = (price: number) => `₺${price.toFixed(0)}`;

  // ── Filter items by active category ──
  const filteredItems = MENU_ITEMS.filter(
    (item) => item.category === activeCategory
  );
  const activeCategoryData = CATEGORIES.find((c) => c.id === activeCategory);
  const isGridLayout = activeCategory === 'cat-7' || activeCategory === 'cat-8';

  // ── Handle join ──
  const handleJoin = () => {
    if (displayName.trim().length >= 2) {
      setIsJoined(true);
    }
  };

  // ── Effects: auto scroll active tab into view ──
  useEffect(() => {
    if (categoryTabsRef.current) {
      const activeTab = categoryTabsRef.current.querySelector(
        '.category-tab--active'
      );
      if (activeTab) {
        activeTab.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [activeCategory]);

  // ═══════════════════════════════════════════════
  // JOIN MODAL
  // ═══════════════════════════════════════════════
  if (!isJoined) {
    return (
      <div className="app-container">
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal__emoji">{selectedEmoji}</div>
            <h1 className="modal__title">Masaya Hoş Geldin!</h1>
            <p className="modal__subtitle">
              <strong>{RESTAURANT.name}</strong> — Masa {RESTAURANT.tableNumber}{' '}
              ({RESTAURANT.tableLabel})
              <br />
              İsmini gir ve menüyü keşfetmeye başla
            </p>

            <div className="modal__input-group">
              <label className="modal__label">İsmin</label>
              <input
                className="modal__input"
                type="text"
                placeholder="Adını gir..."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                autoFocus
                id="join-name-input"
              />
            </div>

            <label className="modal__label" style={{ textAlign: 'center' }}>
              Avatarını seç
            </label>
            <div className="modal__emoji-picker">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className={`modal__emoji-option ${
                    selectedEmoji === emoji ? 'modal__emoji-option--selected' : ''
                  }`}
                  onClick={() => setSelectedEmoji(emoji)}
                  id={`emoji-${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              className="modal__submit-btn"
              onClick={handleJoin}
              disabled={displayName.trim().length < 2}
              id="join-session-btn"
            >
              Menüyü Keşfet 🍽️
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // MAIN APP
  // ═══════════════════════════════════════════════
  return (
    <div className="app-container">
      {/* ── Toast ── */}
      {toast && (
        <div className="toast" id="order-toast">
          <span className="toast__icon">✅</span>
          <div className="toast__text">
            <div className="toast__title">{toast.title}</div>
            <div className="toast__desc">{toast.desc}</div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="header" id="main-header">
        <button className="header__menu-btn" id="menu-toggle-btn">
          <div className="header__menu-icon">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
        <span className="header__title">{RESTAURANT.name}</span>
        <div className="header__table-badge" id="table-badge">
          🪑 Masa {RESTAURANT.tableNumber}
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="hero" id="hero-section">
        <Image
          src={FEATURED_ITEM.image}
          alt={FEATURED_ITEM.name}
          fill
          sizes="(max-width: 480px) 100vw, 480px"
          className="hero__image"
          style={{ objectFit: 'cover' }}
          priority
        />
        <div className="hero__overlay">
          <div className="hero__badge">Şefin Önerisi</div>
          <div className="hero__content">
            <span className="hero__subtitle">Günün Özel Menüsü</span>
            <h2 className="hero__title">{FEATURED_ITEM.name}</h2>
            <span className="hero__price">
              {formatPrice(FEATURED_ITEM.price)} · {FEATURED_ITEM.preparationTime} dk
            </span>
          </div>
        </div>
      </section>

      {/* ── Category Tabs ── */}
      <div className="category-tabs" ref={categoryTabsRef} id="category-tabs">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            className={`category-tab ${
              activeCategory === category.id ? 'category-tab--active' : ''
            }`}
            onClick={() => scrollToCategory(category.id)}
            id={`tab-${category.id}`}
          >
            <span className="category-tab__emoji">{category.emoji}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* ── Menu Content ── */}
      <main className="page-padding-bottom">
        <h3 className="section-title" id={`category-${activeCategory}`}>
          {activeCategoryData?.emoji} {activeCategoryData?.name}
        </h3>

        {isGridLayout ? (
          /* ── Grid layout for drinks ── */
          <div className="drinks-grid">
            {filteredItems.map((item) => (
              <DrinkCard
                key={item.id}
                item={item}
                quantity={getItemQuantity(item.id)}
                onAdd={() => addToCart(item)}
                onRemove={() => removeFromCart(item.id)}
                formatPrice={formatPrice}
              />
            ))}
          </div>
        ) : (
          /* ── Card layout for food ── */
          filteredItems.map((item, index) => (
            <MenuCard
              key={item.id}
              item={item}
              quantity={getItemQuantity(item.id)}
              onAdd={() => addToCart(item)}
              onRemove={() => removeFromCart(item.id)}
              formatPrice={formatPrice}
              index={index}
            />
          ))
        )}
      </main>

      {/* ── Floating Cart Button ── */}
      {cartCount > 0 && (
        <button
          className="cart-fab"
          onClick={() => setIsCartOpen(true)}
          id="cart-fab-btn"
        >
          <div className="cart-fab__left">
            <span className="cart-fab__icon">🛒</span>
            <span className="cart-fab__count">{cartCount}</span>
            <span className="cart-fab__label">Sepeti Gör</span>
          </div>
          <span className="cart-fab__total">{formatPrice(cartTotal)}</span>
        </button>
      )}

      {/* ── Cart Drawer ── */}
      <div
        className={`cart-overlay ${isCartOpen ? 'cart-overlay--open' : ''}`}
        onClick={() => setIsCartOpen(false)}
      />
      <div className={`cart-drawer ${isCartOpen ? 'cart-drawer--open' : ''}`}>
        <div className="cart-drawer__handle" />
        <div className="cart-drawer__header">
          <h3 className="cart-drawer__title">Sepetim</h3>
          <button className="cart-drawer__clear" onClick={clearCart} id="clear-cart-btn">
            Temizle
          </button>
        </div>
        <div className="cart-drawer__items">
          {cartItems.map(({ menuItem, quantity }) => (
            <div key={menuItem.id} className="cart-item">
              <Image
                src={menuItem.image}
                alt={menuItem.name}
                width={56}
                height={56}
                className="cart-item__image"
              />
              <div className="cart-item__info">
                <div className="cart-item__name">{menuItem.name}</div>
                <div className="cart-item__price">
                  {formatPrice(menuItem.price)}
                </div>
              </div>
              <div className="quantity-control">
                <button
                  className={`quantity-control__btn ${
                    quantity === 1 ? 'quantity-control__btn--remove' : ''
                  }`}
                  onClick={() => removeFromCart(menuItem.id)}
                >
                  {quantity === 1 ? '🗑' : '−'}
                </button>
                <span className="quantity-control__count">{quantity}</span>
                <button
                  className="quantity-control__btn"
                  onClick={() => addToCart(menuItem)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="cart-drawer__footer">
          <div className="cart-drawer__summary">
            <div className="cart-drawer__row">
              <span>Ara Toplam</span>
              <span>{formatPrice(cartTotal)}</span>
            </div>
            <div className="cart-drawer__row">
              <span>Servis Ücreti (%10)</span>
              <span>{formatPrice(cartTotal * 0.1)}</span>
            </div>
            <div className="cart-drawer__row cart-drawer__row--total">
              <span>Toplam</span>
              <span>{formatPrice(cartTotal * 1.1)}</span>
            </div>
          </div>
          <button
            className="cart-drawer__order-btn"
            onClick={placeOrder}
            id="place-order-btn"
          >
            Sipariş Ver — {formatPrice(cartTotal * 1.1)}
          </button>
        </div>
      </div>

      {/* ── Bottom Navigation ── */}
      <nav className="bottom-nav" id="bottom-nav">
        <button className="bottom-nav__item bottom-nav__item--active" id="nav-menu">
          <span className="bottom-nav__icon">🍽️</span>
          <span className="bottom-nav__label">Menü</span>
        </button>
        <button className="bottom-nav__item" id="nav-orders">
          <span className="bottom-nav__icon">📋</span>
          <span className="bottom-nav__label">Siparişler</span>
        </button>
        <button className="bottom-nav__item" id="nav-split">
          <span className="bottom-nav__icon">💰</span>
          <span className="bottom-nav__label">Hesap</span>
        </button>
        <button className="bottom-nav__item" id="nav-profile">
          <span className="bottom-nav__icon">{selectedEmoji}</span>
          <span className="bottom-nav__label">{displayName}</span>
        </button>
      </nav>
    </div>
  );
}

// ═══════════════════════════════════════════════
// MENU CARD COMPONENT
// ═══════════════════════════════════════════════

function MenuCard({
  item,
  quantity,
  onAdd,
  onRemove,
  formatPrice,
  index,
}: {
  item: MockMenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  formatPrice: (p: number) => string;
  index: number;
}) {
  const variant = item.variant || 'horizontal';

  if (variant === 'featured') {
    return (
      <div
        className="menu-card menu-card--featured"
        style={{ animationDelay: `${index * 0.08}s` }}
        id={`menu-item-${item.id}`}
      >
        <div className="menu-card__image-wrap">
          {item.badge && <span className="menu-card__badge">{item.badge}</span>}
          <span className="menu-card__price-badge">{formatPrice(item.price)}</span>
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 480px) 100vw, 480px"
            className="menu-card__image"
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div className="menu-card__body">
          <h4 className="menu-card__name">{item.name}</h4>
          <p className="menu-card__desc">{item.description}</p>
          <div className="menu-card__footer">
            <span className="menu-card__prep-time">
              ⏱ {item.preparationTime} dk
            </span>
            {quantity > 0 ? (
              <div className="quantity-control">
                <button className="quantity-control__btn" onClick={onRemove}>
                  −
                </button>
                <span className="quantity-control__count">{quantity}</span>
                <button className="quantity-control__btn" onClick={onAdd}>
                  +
                </button>
              </div>
            ) : (
              <button className="menu-card__add-btn menu-card__add-btn--primary" onClick={onAdd}>
                + Sepete Ekle
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'accent') {
    return (
      <div
        className="menu-card menu-card--featured menu-card--accent"
        style={{ animationDelay: `${index * 0.08}s` }}
        id={`menu-item-${item.id}`}
      >
        <div className="menu-card__image-wrap">
          {item.badge && <span className="menu-card__badge">{item.badge}</span>}
          <span className="menu-card__price-badge">{formatPrice(item.price)}</span>
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="menu-card__image"
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div className="menu-card__body">
          <h4 className="menu-card__name">{item.name}</h4>
          <p className="menu-card__desc">{item.description}</p>
          <div className="menu-card__footer">
            <span className="menu-card__prep-time">
              ⏱ {item.preparationTime} dk
            </span>
            {quantity > 0 ? (
              <div className="quantity-control">
                <button className="quantity-control__btn quantity-control__btn--remove" onClick={onRemove}>
                  −
                </button>
                <span className="quantity-control__count">{quantity}</span>
                <button className="quantity-control__btn" onClick={onAdd}>
                  +
                </button>
              </div>
            ) : (
              <button className="menu-card__add-btn menu-card__add-btn--primary" onClick={onAdd}>
                + Sepete Ekle
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className="menu-card menu-card--compact"
        style={{ animationDelay: `${index * 0.08}s` }}
        id={`menu-item-${item.id}`}
      >
        <div className="menu-card__image-wrap">
          <Image
            src={item.image}
            alt={item.name}
            width={70}
            height={70}
            className="menu-card__image"
          />
        </div>
        <div className="menu-card__body">
          <h4 className="menu-card__name">{item.name}</h4>
          <p className="menu-card__desc">{item.description}</p>
          <div className="menu-card__footer">
            <span className="menu-card__price">
              {formatPrice(item.price)}
            </span>
            {quantity > 0 ? (
              <div className="quantity-control">
                <button className="quantity-control__btn" onClick={onRemove}>
                  −
                </button>
                <span className="quantity-control__count">{quantity}</span>
                <button className="quantity-control__btn" onClick={onAdd}>
                  +
                </button>
              </div>
            ) : (
              <button className="menu-card__add-btn menu-card__add-btn--icon" onClick={onAdd}>
                +
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT: horizontal variant
  return (
    <div
      className="menu-card menu-card--horizontal"
      style={{ animationDelay: `${index * 0.08}s` }}
      id={`menu-item-${item.id}`}
    >
      <div className="menu-card__body">
        {item.badge && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--color-primary)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 4,
              display: 'inline-block',
            }}
          >
            🔥 {item.badge}
          </span>
        )}
        <h4 className="menu-card__name">{item.name}</h4>
        <p className="menu-card__desc">{item.description}</p>
        <div className="menu-card__footer">
          <div>
            <span className="menu-card__price">{formatPrice(item.price)}</span>
            <span className="menu-card__prep-time" style={{ marginTop: 2 }}>
              ⏱ {item.preparationTime} dk
            </span>
          </div>
          {quantity > 0 ? (
            <div className="quantity-control">
              <button className="quantity-control__btn" onClick={onRemove}>
                −
              </button>
              <span className="quantity-control__count">{quantity}</span>
              <button className="quantity-control__btn" onClick={onAdd}>
                +
              </button>
            </div>
          ) : (
            <button className="menu-card__add-btn menu-card__add-btn--icon" onClick={onAdd}>
              +
            </button>
          )}
        </div>
      </div>
      <div className="menu-card__image-wrap">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="130px"
          className="menu-card__image"
          style={{ objectFit: 'cover' }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// DRINK CARD COMPONENT (2-column grid)
// ═══════════════════════════════════════════════

function DrinkCard({
  item,
  quantity,
  onAdd,
  onRemove,
  formatPrice,
}: {
  item: MockMenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  formatPrice: (p: number) => string;
}) {
  return (
    <div className="drink-card" id={`menu-item-${item.id}`}>
      <div className="drink-card__image-wrap">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 480px) 50vw, 220px"
          className="drink-card__image"
          style={{ objectFit: 'cover' }}
        />
      </div>
      <div className="drink-card__body">
        <h4 className="drink-card__name">{item.name}</h4>
        <p className="drink-card__desc">{item.description}</p>
        <div className="drink-card__footer">
          <span className="drink-card__price">{formatPrice(item.price)}</span>
          {quantity > 0 ? (
            <div className="quantity-control" style={{ padding: 2 }}>
              <button
                className="quantity-control__btn"
                onClick={onRemove}
                style={{ width: 26, height: 26, fontSize: 14 }}
              >
                −
              </button>
              <span className="quantity-control__count" style={{ fontSize: 13 }}>
                {quantity}
              </span>
              <button
                className="quantity-control__btn"
                onClick={onAdd}
                style={{ width: 26, height: 26, fontSize: 14 }}
              >
                +
              </button>
            </div>
          ) : (
            <button className="drink-card__add" onClick={onAdd}>
              +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
