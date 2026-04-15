'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string;
  category: string;
  preparationTime: number | null; // Keep type to avoid breaking other files, just don't render it
  badge?: string | null;
  variant?: 'featured' | 'horizontal' | 'compact' | 'accent' | 'dark';
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
}

export interface TableData {
  id: string;
  tableNumber: number;
  label: string | null;
  status: string;
}

export interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface TableClientProps {
  restaurant: RestaurantData;
  table: TableData;
  tableId: string;
  sessionId: string;
  categories: Category[];
  menuItems: MenuItem[];
  featuredItem: MenuItem | null;
  initialParticipantId: string | null;
  initialParticipantName: string | null;
  initialParticipantEmoji: string | null;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface OrderHistoryItem {
  id: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  participantId: string | null;
  participantName: string | null;
  participantEmoji: string | null;
  items: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    status: string;
  }[];
}

type ActiveTab = 'menu' | 'orders' | 'split';
type SplitViewState = 'summary' | 'pay_items' | 'divide_equally' | 'custom_amount';
type SplitSheetPhase = 'closed' | 'choose_method' | 'split_options';
const EMOJI_OPTIONS = ['👤', '😎', '🤩', '🦁', '🐻', '🌟', '🔥', '🎯', '💎', '🎪'];

const STATUS_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  pending: { label: 'Beklemede', color: '#b51c00', emoji: '⏳' },
  confirmed: { label: 'Onaylandı', color: '#b51c00', emoji: '✅' },
  preparing: { label: 'Hazırlanıyor', color: '#b51c00', emoji: '👨‍🍳' },
  served: { label: 'Servis Edildi', color: '#b51c00', emoji: '🍽️' },
  cancelled: { label: 'İptal Edildi', color: '#ba1a1a', emoji: '❌' },
};

export default function TableClient({
  restaurant,
  table,
  tableId,
  sessionId,
  categories,
  menuItems,
  featuredItem,
  initialParticipantId,
  initialParticipantName,
  initialParticipantEmoji,
}: TableClientProps) {
  // ── State ──
  const [participantId, setParticipantId] = useState<string | null>(initialParticipantId);
  const [displayName, setDisplayName] = useState(initialParticipantName || '');
  const [selectedEmoji, setSelectedEmoji] = useState(initialParticipantEmoji || '👤');

  const [activeCategory, setActiveCategory] = useState<string>(
    categories.length > 0 ? categories[0].id : ''
  );

  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; desc: string } | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
  const [slideAnim, setSlideAnim] = useState('slide-in-right');
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // ── Split Feature States ──
  const [splitViewState, setSplitViewState] = useState<SplitViewState>('summary');
  const [splitSheetPhase, setSplitSheetPhase] = useState<SplitSheetPhase>('closed');
  const [customAmountStr, setCustomAmountStr] = useState('');
  const [splitPeopleCount, setSplitPeopleCount] = useState(2);
  const [selectedSplitQuantities, setSelectedSplitQuantities] = useState<Map<string, number>>(new Map());
  const [tipPercentage, setTipPercentage] = useState<number | null>(null);
  const [isEnteringCustomTip, setIsEnteringCustomTip] = useState(false);
  const [customTipStr, setCustomTipStr] = useState('');
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const hasAutoJoined = useRef(false);

  // ── Auto Join / Guest Identity ──
  useEffect(() => {
    // If not already a participant, create an anonymous guest identity automatically
    if (!initialParticipantId && !hasAutoJoined.current) {
      hasAutoJoined.current = true;

      const randomId = Math.floor(1000 + Math.random() * 9000);
      const guestName = `Misafir ${randomId}`;
      const guestEmoji = EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)];

      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          displayName: guestName,
          avatarEmoji: guestEmoji,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const pid = data.data.participant.id;
            setParticipantId(pid);
            setDisplayName(guestName);
            setSelectedEmoji(guestEmoji);

            fetch('/api/participant-cookie', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                participantId: pid,
                displayName: guestName,
                avatarEmoji: guestEmoji,
              }),
            });
          }
        })
        .catch(err => console.error('Auto join error:', err));
    }
  }, [initialParticipantId, tableId]);


  // ── Cart helpers ──
  const cartItems = Array.from(cart.values());
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );

  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      const MAX_QUANTITY = 10;
      if (existing) {
        if (existing.quantity >= MAX_QUANTITY) {
          alert(`Bir üründen en fazla ${MAX_QUANTITY} adet ekleyebilirsiniz.`);
          return prev;
        }
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

  // ── Place Order ──
  const placeOrder = useCallback(async () => {
    if (cartCount === 0 || isOrdering) return;

    setIsOrdering(true);

    try {
      const payload = {
        tableId,
        sessionId,
        participantId,
        customerName: displayName,
        items: cartItems.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          notes: ''
        }))
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        // Show success, maybe switch to orders tab
        setCart(new Map());
        setIsCartOpen(false);
        setActiveTab('orders');
      } else {
        alert(data.error || 'Sipariş oluşturulamadı');
      }
    } catch (error) {
      console.error('Sipariş hatası:', error);
      alert('Bağlantı Hatası');
    } finally {
      setIsOrdering(false);
    }
  }, [cartCount, cartItems, tableId, sessionId, participantId, displayName, isOrdering]);

  // ── Fetch Order History ──
  const fetchOrders = useCallback(async () => {
    if (!sessionId) return;
    setIsLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders/session/${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setOrderHistory(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'split') {
      fetchOrders();
    }
  }, [activeTab, fetchOrders]);

  // ── Scroll to category ──
  const scrollToCategory = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    const el = document.getElementById(`category-${categoryId}`);
    if (el) {
      const headerHeight = 56 + 52;
      const y = el.getBoundingClientRect().top + window.scrollY - headerHeight;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  const formatPrice = (price: number) => `₺${price.toFixed(0)}`;

  const filteredItems = menuItems.filter(
    (item) => item.category === activeCategory
  );
  const activeCategoryData = categories.find((c) => c.id === activeCategory);

  useEffect(() => {
    if (categoryTabsRef.current && activeTab === 'menu') {
      const activeTabEl = categoryTabsRef.current.querySelector(
        '.category-tab--active'
      ) as HTMLElement;
      if (activeTabEl) {
        const container = categoryTabsRef.current;
        const scrollLeft = activeTabEl.offsetLeft - (container.offsetWidth / 2) + (activeTabEl.offsetWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [activeCategory, activeTab]);

  // Tab değişimi ve kaydırma efekti
  const handleTabChange = useCallback((newTab: ActiveTab) => {
    if (newTab === activeTab) return;
    const tabIndexMap = { menu: 0, orders: 1, split: 2 };
    if (tabIndexMap[newTab] > tabIndexMap[activeTab]) setSlideAnim('slide-in-right');
    else setSlideAnim('slide-in-left');

    setActiveTab(newTab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // ── Split Feature Helpers ──
  const allBillItems = orderHistory.flatMap(o => o.items);
  const totalBillAmount = orderHistory.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);

  const toggleSplitItem = (itemId: string, maxQuantity: number) => {
    setSelectedSplitQuantities(prev => {
      const next = new Map(prev);
      const current = next.get(itemId) || 0;
      if (current < maxQuantity) {
        next.set(itemId, current + 1);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };

  const updateSplitQuantity = (itemId: string, delta: number, maxQuantity: number) => {
    setSelectedSplitQuantities(prev => {
      const next = new Map(prev);
      const current = next.get(itemId) || 0;
      const newVal = current + delta;
      if (newVal <= 0) next.delete(itemId);
      else if (newVal <= maxQuantity) next.set(itemId, newVal);
      return next;
    });
  };

  const calculatePayItemsTotal = () => {
    let sum = 0;
    allBillItems.forEach(item => {
      const q = selectedSplitQuantities.get(item.id) || 0;
      if (q > 0) {
        sum += (parseFloat(item.totalPrice) / item.quantity) * q;
      }
    });
    if (tipPercentage) {
      sum += (sum * tipPercentage) / 100;
    } else if (isEnteringCustomTip && customTipStr) {
      sum += parseFloat(customTipStr) || 0;
    }
    return sum;
  };

  const handleNumpadPress = (val: string) => {
    if (splitViewState === 'custom_amount') {
      if (isEnteringCustomTip) {
        if (val === 'back') {
          setCustomTipStr(prev => prev.slice(0, -1));
        } else if (val === '.') {
          if (!customTipStr.includes('.')) setCustomTipStr(prev => prev + val);
        } else {
          const next = customTipStr + val;
          const numNext = parseFloat(next);
          // Bahşiş kısıtlaması: Hesabın 2 katından fazla olamaz
          if (numNext <= (totalBillAmount * 2) && next.replace('.', '').length < 8) {
            setCustomTipStr(next);
          }
        }
      } else {
        if (val === 'back') {
          setCustomAmountStr(prev => prev.slice(0, -1));
        } else if (val === '.') {
          if (!customAmountStr.includes('.')) setCustomAmountStr(prev => prev + val);
        } else {
          const next = customAmountStr + val;
          const numNext = parseFloat(next);
          // Tutar kısıtlaması: Toplam hesabı geçemez
          if (numNext <= totalBillAmount && next.replace('.', '').length < 8) {
            setCustomAmountStr(next);
          }
        }
      }
    }
  };

  return (
    <div className="app-container" style={{ position: 'relative', width: '100%', maxWidth: '480px', margin: '0 auto' }}>
      {/* ── Sticky Header Group ── */}
      <div className="sticky-header-group">
        {/* ── Header ── */}
        <header className="header" id="main-header">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="header__title">{restaurant.name}</span>
            <span className="body-text" style={{ fontSize: '0.875rem' }}>{displayName || 'Bağlanıyor...'}</span>
          </div>
          <div className="header__table-badge" id="table-badge">
            Masa {table.tableNumber}
          </div>
        </header>

        {/* ── Category Tabs (Displayed ONLY in Menü) ── */}
        {activeTab === 'menu' && (
          <div className="category-tabs" ref={categoryTabsRef} id="category-tabs">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`category-tab ${activeCategory === category.id ? 'category-tab--active' : ''
                  }`}
                onClick={() => scrollToCategory(category.id)}
                id={`tab-${category.id}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main Tab Contents ── */}
      <div key={activeTab} className={slideAnim}>

        {/* ═══════════════════════════════ */}
        {/* TAB: MENÜ */}
        {/* ═══════════════════════════════ */}
        {activeTab === 'menu' && (
          <main style={{ paddingBottom: '24px' }}>
            {/* ── Hero Editorial Moment ── */}
            {featuredItem && activeCategory === categories[0]?.id && (
              <section style={{ marginBottom: '3rem', padding: '0 20px', position: 'relative' }} id="hero-section">
                <div style={{ position: 'relative', width: '100%', height: 256, borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                  <Image src={featuredItem.image} alt={featuredItem.name} fill style={{ objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.5rem', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Günün Spesiyali</span>
                    <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{featuredItem.name}</h2>
                  </div>
                </div>
              </section>
            )}

            <h3 className="section-title headline-text" id={`category-${activeCategory}`}>
              {activeCategoryData?.name}
            </h3>

            <div className="menu-list">
              {filteredItems.map((item, index) => {
                const quantity = getItemQuantity(item.id);
                const isTrending = item.variant === 'featured' || index % 4 === 0;

                if (isTrending) {
                  return (
                    <MenuCardTrending
                      key={item.id} item={item} quantity={quantity}
                      onAdd={() => addToCart(item)} onRemove={() => removeFromCart(item.id)}
                      formatPrice={formatPrice}
                    />
                  );
                } else {
                  return (
                    <MenuCardStandard
                      key={item.id} item={item} quantity={quantity}
                      onAdd={() => addToCart(item)} onRemove={() => removeFromCart(item.id)}
                      formatPrice={formatPrice}
                    />
                  );
                }
              })}
            </div>
          </main>
        )}

        {/* ═══════════════════════════════ */}
        {/* TAB: SİPARİŞLER (Index 1) */}
        {/* ═══════════════════════════════ */}
        {activeTab === 'orders' && (
          <main style={{ paddingBottom: '24px' }}>
            <h3 className="section-title headline-text">Siparişlerim</h3>

            {isLoadingOrders ? (
              <div style={{ textAlign: 'center', padding: 40 }} className="body-text">Yükleniyor...</div>
            ) : orderHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }} className="body-text">
                <p className="headline-text" style={{ fontSize: '1.125rem' }}>Henüz sipariş yok.</p>
                <p>Menüden ürün ekleyerek başlayabilirsiniz.</p>
              </div>
            ) : (
              <div className="orders-list">
                {Array.from(orderHistory.reduce((acc, order) => {
                  const pid = order.participantId || 'anon';
                  if (!acc.has(pid)) acc.set(pid, []);
                  acc.get(pid)!.push(order);
                  return acc;
                }, new Map<string, OrderHistoryItem[]>())).map(([pid, orders]) => {
                  const firstOrder = orders[0];
                  const isMyOrder = pid === participantId;
                  const totalGuestAmount = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);

                  return (
                    <div
                      key={pid}
                      className={`order-wrapper ${isMyOrder ? 'order-wrapper--own' : 'order-wrapper--others'}`}
                    >
                      <div className="headline-text" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        {firstOrder.participantName || 'Misafir'}
                        {isMyOrder && (
                          <span className="label-text" style={{
                            color: 'var(--primary)', background: 'var(--surface-container-highest)', padding: '2px 6px', borderRadius: '4px'
                          }}>Sen</span>
                        )}
                      </div>

                      {orders.map((order, oIdx) => (
                        <div key={order.id} style={{ marginTop: oIdx === 0 ? 0 : 16, borderTop: oIdx === 0 ? 'none' : '1px solid var(--surface-container-highest)', paddingTop: oIdx === 0 ? 0 : 12 }}>
                          <div className="body-text" style={{ fontSize: '0.75rem', marginBottom: 8, fontWeight: 600 }}>
                            {new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="order-detail-list" style={{ marginTop: 0 }}>
                            {order.items.map((item) => (
                              <div key={item.id} className="order-detail-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <span className="headline-text" style={{ fontSize: '0.875rem', width: 24 }}>{item.quantity}x</span>
                                  <span className="body-text" style={{ fontWeight: 500, color: 'var(--on-surface)' }}>{item.name}</span>
                                </div>
                                <span className="headline-text" style={{ fontSize: '0.875rem' }}>₺{parseFloat(item.totalPrice).toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 12, borderTop: '2px solid var(--surface-container-highest)' }}>
                        <span className="body-text" style={{ fontWeight: 600 }}>Toplam</span>
                        <span className="headline-text" style={{ fontSize: '1.25rem' }}>₺{totalGuestAmount.toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })}

                <div style={{
                  marginTop: 32, padding: 24, background: 'var(--surface-container-lowest)',
                  borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-ambient)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span className="headline-text" style={{ fontSize: '1.125rem' }}>Masa Toplamı</span>
                  <span className="headline-text" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
                    ₺{orderHistory.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0).toFixed(0)}
                  </span>
                </div>
              </div>
            )}
          </main>
        )}

        {/* ═══════════════════════════════ */}
        {/* TAB: HESAP (Index 2) - Split */}
        {/* ═══════════════════════════════ */}
        {activeTab === 'split' && (
          <main style={{ paddingBottom: splitViewState === 'summary' ? '120px' : '260px' }}>
            {splitViewState === 'summary' && (
              <div style={{ padding: '0 20px', paddingTop: 20 }}>
                <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', padding: 24, paddingBottom: 40, marginBottom: 24 }}>
                  <span className="label-text" style={{ color: 'var(--on-surface-variant)', letterSpacing: '0.1em' }}>TOTAL AMOUNT</span>
                  <h2 className="display-text" style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: 8 }}>₺{totalBillAmount.toFixed(2)}</h2>
                  <span className="body-text" style={{ fontSize: '0.875rem' }}>{allBillItems.length} items ordered • Service included</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                  <button className="btn-primary" onClick={() => setSplitSheetPhase('choose_method')} style={{ padding: '20px', fontSize: '1.125rem', width: '100%' }}>
                    Ödeme Yöntemi Seç
                  </button>
                </div>

                <div className={`summary-accordion ${isSummaryExpanded ? 'summary-accordion--open' : ''}`}>
                  <div className="summary-accordion__header" onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}>
                    <h4 className="label-text" style={{ color: 'var(--on-surface-variant)', marginBottom: 0 }}>BILL SUMMARY</h4>
                    <span className="material-symbols-outlined" style={{ transition: 'transform 0.3s', transform: isSummaryExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>expand_more</span>
                  </div>
                  <div className="summary-accordion__content">
                    <div className="orders-list" style={{ padding: 0 }}>
                      {allBillItems.map((item, idx) => (
                        <div key={`${item.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--surface-container-highest)' }}>
                          <span className="body-text" style={{ fontWeight: 500, color: 'var(--on-surface)' }}>{item.quantity}x {item.name}</span>
                          <span className="headline-text" style={{ fontSize: '0.875rem' }}>₺{parseFloat(item.totalPrice).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {splitViewState === 'pay_items' && (
              <div style={{ padding: '0 20px', animation: 'slideInRight 0.3s forwards' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, paddingTop: 16 }}>
                  <button onClick={() => setSplitViewState('summary')} style={{ marginRight: 16 }}>
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div>
                    <span className="label-text" style={{ textTransform: 'uppercase', color: 'var(--primary)' }}>TABLE {table.tableNumber} • EVENING SERVICE</span>
                    <h2 className="display-text" style={{ fontSize: '2rem' }}>Pay for your items</h2>
                  </div>
                </div>
                <p className="body-text" style={{ marginBottom: 24 }}>Select the items you wish to settle. Other guests can choose the remaining quantities.</p>

                <div style={{ marginBottom: 32 }}>
                  {allBillItems.map((item, idx) => {
                    const selectedQ = selectedSplitQuantities.get(item.id) || 0;
                    const isSelected = selectedQ > 0;
                    return (
                      <div key={`${item.id}-${idx}`} className={`split-item ${isSelected ? 'split-item--selected' : ''}`}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--on-surface)' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Ordered: {item.quantity}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="quantity-control" style={{ padding: 4, gap: 8 }}>
                            <button className="quantity-control__btn" onClick={() => updateSplitQuantity(item.id, -1, item.quantity)} style={{ width: 28, height: 28 }}>-</button>
                            <span className="quantity-control__count" style={{ minWidth: 20 }}>{selectedQ}</span>
                            <button className="quantity-control__btn" onClick={() => updateSplitQuantity(item.id, 1, item.quantity)} style={{ width: 28, height: 28 }}>+</button>
                          </div>
                          <div style={{ fontWeight: 800, color: isSelected ? 'var(--primary)' : 'var(--on-surface)', fontSize: '1.125rem', width: 80, textAlign: 'right' }}>
                            ₺{((parseFloat(item.totalPrice) / item.quantity) * selectedQ).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 40, paddingBottom: 40 }}>
                  <div style={{ textAlign: 'center' }}>
                    <span className="label-text" style={{ letterSpacing: '0.1em' }}>SİZİN SEÇİMİNİZ</span>
                    <h3 className="display-text" style={{ fontSize: '1.5rem', marginTop: 4 }}>
                      ₺{calculatePayItemsTotal().toFixed(2)}
                    </h3>
                  </div>
                  <button className="btn-primary" onClick={() => { alert('Ödeme tamamlandı!'); setSplitViewState('summary'); setSelectedSplitQuantities(new Map()); }} style={{ padding: '20px', fontSize: '1.125rem' }}>
                    Şimdi Öde <span className="material-symbols-outlined" style={{ marginLeft: 8 }}>payments</span>
                  </button>
                </div>
              </div>
            )}

            {splitViewState === 'divide_equally' && (
              <div style={{ padding: '0 20px', animation: 'slideInRight 0.3s forwards' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, paddingTop: 16 }}>
                  <button onClick={() => setSplitViewState('summary')} style={{ marginRight: 16 }}>
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div>
                    <h2 className="display-text" style={{ fontSize: '2.5rem', lineHeight: 1 }}>The Fair<br /><span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>Share.</span></h2>
                    <span className="label-text" style={{ color: 'var(--on-surface-variant)' }}>TABLE {table.tableNumber} • L'ARTISAN BISTRO</span>
                  </div>
                </div>

                <div style={{ background: 'var(--surface-container-low)', padding: 24, borderRadius: 'var(--radius-xl)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                      <span className="label-text">TOTAL BILL</span>
                      <h3 className="display-text" style={{ fontSize: '1.75rem' }}>₺{totalBillAmount.toFixed(2)}</h3>
                    </div>
                    <div style={{ background: 'var(--surface-container-lowest)', width: 48, height: 48, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <span className="material-symbols-outlined">receipt_long</span>
                    </div>
                  </div>

                  <span className="label-text">SPLIT BETWEEN</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-container-lowest)', padding: 8, borderRadius: 'var(--radius-pill)', marginTop: 8, marginBottom: 24 }}>
                    <button onClick={() => setSplitPeopleCount(Math.max(1, splitPeopleCount - 1))} style={{ width: 48, height: 48, background: 'var(--surface-container-low)', borderRadius: '50%', fontWeight: 700 }}>−</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{splitPeopleCount}</span>
                      <span className="label-text">PEOPLE</span>
                    </div>
                    <button onClick={() => setSplitPeopleCount(splitPeopleCount + 1)} style={{ width: 48, height: 48, background: 'var(--primary)', color: 'white', borderRadius: '50%', fontWeight: 700 }}>+</button>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <span className="label-text">EACH PERSON PAYS</span>
                    <h2 className="display-text" style={{ fontSize: '3.5rem', letterSpacing: '-0.04em', marginTop: 8 }}>
                      <span style={{ fontSize: '1.5rem', verticalAlign: 'top', color: 'var(--primary)', marginRight: 4 }}>₺</span>
                      {(totalBillAmount / splitPeopleCount).toFixed(2)}
                    </h2>
                  </div>
                </div>

                <div className="fixed-bottom-bar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button className="btn-primary" onClick={() => { alert('Ödeme tamamlandı!'); setSplitViewState('summary'); }} style={{ padding: '20px', fontSize: '1.125rem' }}>
                    Pay Your Share
                  </button>
                  <p className="label-text" style={{ textAlign: 'center', opacity: 0.6 }}>PROCEED TO SECURE CHECKOUT</p>
                </div>
              </div>
            )}

            {splitViewState === 'custom_amount' && (
              <div style={{ padding: '0 20px', animation: 'slideInRight 0.3s forwards', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: 16, marginBottom: 16 }}>
                  <button onClick={() => setSplitViewState('summary')}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div style={{ background: 'var(--surface-container-low)', padding: 24, borderRadius: 'var(--radius-xl)', marginBottom: 24 }}>
                  <span className="label-text">REMAINING BALANCE</span>
                  <h3 className="display-text" style={{ fontSize: '2rem' }}>₺{totalBillAmount.toFixed(2)}</h3>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 24, cursor: 'pointer' }} onClick={() => setIsEnteringCustomTip(false)}>
                  <span className="label-text" style={{ color: isEnteringCustomTip ? 'var(--on-surface-variant)' : 'var(--primary)', letterSpacing: '0.1em' }}>
                    {isEnteringCustomTip ? 'CLICK TO EDIT AMOUNT' : 'ENTER CUSTOM AMOUNT'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: '2rem', color: 'var(--on-surface-variant)', marginRight: 8, fontWeight: 300 }}>₺</span>
                    <span style={{ fontSize: '4.5rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: isEnteringCustomTip ? 'var(--on-surface-variant)' : 'var(--on-surface)' }}>
                      {customAmountStr || '0.00'}
                    </span>
                    {!isEnteringCustomTip && <div className="cursor-blink" style={{ width: 3, height: 50, background: 'var(--primary)', marginLeft: 8 }} />}
                  </div>
                </div>

                {/* Custom Amount Tip Selection */}
                <div style={{ background: 'var(--surface-container-low)', padding: 16, borderRadius: 'var(--radius-xl)', marginBottom: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <h4 className="headline-text" style={{ fontSize: '1rem' }}>Leave a tip?</h4>
                    {(tipPercentage || (isEnteringCustomTip && customTipStr)) && (
                      <span className="label-text" style={{ color: 'var(--primary)' }}>
                        +₺{tipPercentage
                          ? (parseFloat(customAmountStr || '0') * tipPercentage / 100).toFixed(2)
                          : parseFloat(customTipStr || '0').toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="tip-buttons" style={{ marginTop: 0 }}>
                    {[10, 15, 20].map(pct => (
                      <button key={pct} className={`tip-btn ${(tipPercentage === pct && !isEnteringCustomTip) ? 'tip-btn--active' : ''}`} onClick={() => { setTipPercentage(pct); setIsEnteringCustomTip(false); setCustomTipStr(''); }}>
                        {pct}%
                      </button>
                    ))}
                    <button
                      className={`tip-btn ${(isEnteringCustomTip || (!tipPercentage && customTipStr)) ? 'tip-btn--active' : ''}`}
                      onClick={() => {
                        setIsEnteringCustomTip(true);
                        setTipPercentage(null);
                      }}
                      style={{ fontSize: (isEnteringCustomTip && !customTipStr) ? '0.875rem' : '1rem' }}
                    >
                      {(isEnteringCustomTip || (!tipPercentage && customTipStr)) ? (customTipStr ? `₺${customTipStr}` : 'Tutar') : 'Özel'}
                    </button>
                  </div>
                </div>

                <div className="numpad-grid" style={{ marginBottom: 40, flex: 1, maxWidth: '100%' }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map(num => (
                    <div key={num} className="numpad-btn" style={{ height: 56 }} onClick={() => handleNumpadPress(num)}>{num}</div>
                  ))}
                  <div className="numpad-btn" style={{ height: 56 }} onClick={() => handleNumpadPress('back')}>
                    <span className="material-symbols-outlined">backspace</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', paddingBottom: 40 }}>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <span className="label-text" style={{ opacity: 0.7 }}>ÖDENECEK TOPLAM</span>
                    {(tipPercentage || customTipStr) && (
                      <div className="body-text" style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--on-surface-variant)' }}>
                        ₺{parseFloat(customAmountStr || '0').toFixed(2)} + ₺{tipPercentage
                          ? (parseFloat(customAmountStr || '0') * tipPercentage / 100).toFixed(2)
                          : (parseFloat(customTipStr || '0').toFixed(2))} Bahşiş
                      </div>
                    )}
                    <h3 className="display-text" style={{ fontSize: '1.75rem', marginTop: 4 }}>
                      ₺{(parseFloat(customAmountStr || '0') + (tipPercentage ? (parseFloat(customAmountStr || '0') * tipPercentage / 100) : parseFloat(customTipStr || '0'))).toFixed(2)}
                    </h3>
                  </div>
                  <button className="btn-primary"
                    onClick={() => {
                      const base = parseFloat(customAmountStr || '0');
                      const tip = tipPercentage ? (base * tipPercentage / 100) : parseFloat(customTipStr || '0');
                      const total = base + tip;
                      if (base > 0) {
                        alert(`₺${total.toFixed(2)} Ödeme tamamlandı!`);
                        setSplitViewState('summary');
                        setCustomAmountStr('');
                        setCustomTipStr('');
                        setTipPercentage(null);
                        setIsEnteringCustomTip(false);
                      }
                    }}
                    style={{ padding: '20px', fontSize: '1.25rem', width: '100%' }}>
                    Ödemeyi Tamamla
                  </button>
                </div>
              </div>
            )}
          </main>
        )}
      </div> {/* /Main Tab Contents */}

      {/* ── Floating Cart Button ── */}
      {cartCount > 0 && activeTab === 'menu' && (
        <button
          className="cart-fab"
          onClick={() => setIsCartOpen(true)}
          id="cart-fab-btn"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)', width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem'
            }}>{cartCount}</div>
            <span>Sepeti Gör</span>
          </div>
          <span>{formatPrice(cartTotal)}</span>
        </button>
      )}

      {/* ── Cart Drawer (The Sunday Drawer) ── */}
      <div className={`drawer-overlay ${isCartOpen ? 'drawer-overlay--open' : ''}`} onClick={() => setIsCartOpen(false)} />
      <div className={`sunday-drawer ${isCartOpen ? 'sunday-drawer--open' : ''}`}>
        <div className="drawer-header">
          <h3 className="drawer-title">Sepetim</h3>
          <button className="drawer-close" onClick={() => setIsCartOpen(false)}>Kapat</button>
        </div>

        <div className="drawer-items">
          {cartItems.map(({ menuItem, quantity }) => (
            <div key={menuItem.id} className="drawer-item">
              <div className="drawer-item__info">
                <Image src={menuItem.image} alt={menuItem.name} width={56} height={56} className="drawer-item__image" />
                <div>
                  <div className="drawer-item__name">{menuItem.name}</div>
                  <div className="drawer-item__price">{formatPrice(menuItem.price)}</div>
                </div>
              </div>
              <div className="quantity-control">
                <button className="quantity-control__btn" onClick={() => removeFromCart(menuItem.id)}>−</button>
                <span className="quantity-control__count">{quantity}</span>
                <button className="quantity-control__btn" onClick={() => addToCart(menuItem)}>+</button>
              </div>
            </div>
          ))}
          {cartItems.length === 0 && <div className="body-text">Sepetiniz boş.</div>}
        </div>

        <div className="drawer-footer">
          {cartItems.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="body-text">Ara Toplam</span>
                <span className="headline-text">{formatPrice(cartTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <span className="body-text">Servis Ücreti (%10)</span>
                <span className="headline-text">{formatPrice(cartTotal * 0.1)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <span className="headline-text" style={{ fontSize: '1.25rem' }}>Toplam</span>
                <span className="headline-text" style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{formatPrice(cartTotal * 1.1)}</span>
              </div>
              <button className="btn-primary" onClick={placeOrder} disabled={isOrdering}>
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                {isOrdering ? 'Gönderiliyor...' : `Siparişi Tamamla`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Split Action Drawers ── */}
      <div className={`drawer-overlay ${splitSheetPhase !== 'closed' ? 'drawer-overlay--open' : ''}`} onClick={() => setSplitSheetPhase('closed')} style={{ zIndex: 350 }} />
      <div className={`sunday-drawer ${splitSheetPhase !== 'closed' ? 'sunday-drawer--open' : ''}`} style={{ zIndex: 360 }}>
        {splitSheetPhase === 'choose_method' && (
          <div>
            <div style={{ width: 40, height: 4, background: 'var(--surface-container-highest)', borderRadius: 2, margin: '0 auto 24px' }} />
            <h3 className="display-text" style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: 8 }}>Choose Payment Method</h3>
            <p className="body-text" style={{ textAlign: 'center', marginBottom: 32 }}>Select how you'd like to settle Table {table.tableNumber}</p>

            <button className="split-option-btn" onClick={() => setSplitSheetPhase('split_options')}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="split-option-icon"><span className="material-symbols-outlined">group</span></div>
                <div style={{ textAlign: 'left' }}>
                  <div className="headline-text" style={{ fontSize: '1.125rem' }}>Split the bill</div>
                  <div className="body-text" style={{ fontSize: '0.875rem' }}>Divide the total among guests</div>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ color: 'var(--outline-variant)' }}>chevron_right</span>
            </button>

            <button className="split-option-btn" onClick={() => { alert('Kalan tutar ödendi!'); setSplitSheetPhase('closed'); }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="split-option-icon"><span className="material-symbols-outlined">payments</span></div>
                <div style={{ textAlign: 'left' }}>
                  <div className="headline-text" style={{ fontSize: '1.125rem' }}>Pay what's left</div>
                  <div className="body-text" style={{ fontSize: '0.875rem' }}>Settle the remaining balance</div>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ color: 'var(--outline-variant)' }}>chevron_right</span>
            </button>

            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--surface-container-highest)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label-text">TOTAL REMAINING</span>
              <span className="headline-text" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>₺{totalBillAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        {splitSheetPhase === 'split_options' && (
          <div>
            <div style={{ width: 40, height: 4, background: 'var(--surface-container-highest)', borderRadius: 2, margin: '0 auto 24px' }} />
            <h3 className="display-text" style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: 8 }}>Split the bill</h3>
            <p className="body-text" style={{ textAlign: 'center', marginBottom: 32 }}>Choose how you'd like to settle for Table {table.tableNumber}</p>

            <button className="split-option-btn" onClick={() => { setSplitViewState('pay_items'); setSplitSheetPhase('closed'); }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="split-option-icon"><span className="material-symbols-outlined">restaurant</span></div>
                <div style={{ textAlign: 'left' }}>
                  <div className="headline-text" style={{ fontSize: '1rem' }}>Pay for your items</div>
                  <div className="body-text" style={{ fontSize: '0.875rem' }}>Select only what you ordered</div>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ color: 'var(--outline-variant)' }}>chevron_right</span>
            </button>

            <button className="split-option-btn" onClick={() => { setSplitViewState('divide_equally'); setSplitSheetPhase('closed'); }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="split-option-icon"><span className="material-symbols-outlined">groups</span></div>
                <div style={{ textAlign: 'left' }}>
                  <div className="headline-text" style={{ fontSize: '1rem' }}>Divide the bill equally</div>
                  <div className="body-text" style={{ fontSize: '0.875rem' }}>Split the total between guests</div>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ color: 'var(--outline-variant)' }}>chevron_right</span>
            </button>

            <button className="split-option-btn" onClick={() => { setSplitViewState('custom_amount'); setSplitSheetPhase('closed'); }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="split-option-icon"><span className="material-symbols-outlined">local_atm</span></div>
                <div style={{ textAlign: 'left' }}>
                  <div className="headline-text" style={{ fontSize: '1rem' }}>Pay a custom amount</div>
                  <div className="body-text" style={{ fontSize: '0.875rem' }}>Enter a specific amount to pay</div>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ color: 'var(--outline-variant)' }}>chevron_right</span>
            </button>

            <button onClick={() => setSplitSheetPhase('closed')} style={{ width: '100%', padding: '16px 0', marginTop: 16 }}>
              <span className="label-text" style={{ color: 'var(--on-surface-variant)' }}>CANCEL AND RETURN TO BILL</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom Navigation ── */}
      <nav className={`bottom-nav ${splitViewState !== 'summary' ? 'bottom-nav--hidden' : ''}`} style={{ display: splitViewState === 'summary' ? 'flex' : 'none' }}>
        <button
          className={`bottom-nav__item ${activeTab === 'menu' ? 'bottom-nav__item--active' : ''}`}
          onClick={() => handleTabChange('menu')}
        >
          <span className="material-symbols-outlined" style={activeTab === 'menu' ? { fontVariationSettings: "'FILL' 1" } : {}}>restaurant_menu</span>
          <span className="bottom-nav__label">Menü</span>
        </button>
        <button
          className={`bottom-nav__item ${activeTab === 'orders' ? 'bottom-nav__item--active' : ''}`}
          onClick={() => handleTabChange('orders')}
        >
          <span className="material-symbols-outlined" style={activeTab === 'orders' ? { fontVariationSettings: "'FILL' 1" } : {}}>receipt_long</span>
          <span className="bottom-nav__label">Siparişler</span>
        </button>
        <button
          className={`bottom-nav__item ${activeTab === 'split' ? 'bottom-nav__item--active' : ''}`}
          onClick={() => handleTabChange('split')}
        >
          <span className="material-symbols-outlined" style={activeTab === 'split' ? { fontVariationSettings: "'FILL' 1" } : {}}>table_restaurant</span>
          <span className="bottom-nav__label">Hesap</span>
        </button>
      </nav>
    </div>
  );
}

// ═══════════════════════════════════════════════
// MENU CARDS
// ═══════════════════════════════════════════════

function MenuCardTrending({
  item, quantity, onAdd, onRemove, formatPrice,
}: {
  item: MenuItem; quantity: number; onAdd: () => void; onRemove: () => void; formatPrice: (p: number) => string;
}) {
  return (
    <div id={`menu-item-${item.id}`} style={{
      background: 'var(--surface-container-low)', padding: '24px', borderRadius: '1.5rem',
      display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '1.5rem',
      boxShadow: 'var(--shadow-ambient)'
    }}>
      <div style={{ flex: 1, padding: 0 }}>
        <span className="label-text" style={{ color: 'var(--primary)', opacity: 0.6, marginBottom: 4, display: 'block' }}>
          Trending
        </span>
        <h4 style={{ fontSize: '1.125rem', marginBottom: 8, letterSpacing: '-0.02em', fontWeight: 700, color: 'var(--on-surface)' }}>
          {item.name}
        </h4>
        <p style={{ fontSize: '0.75rem', marginBottom: 16, color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
          {item.description}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '1rem' }}>
            {formatPrice(item.price)}
          </span>

          {quantity > 0 ? (
            <div className="quantity-control" style={{ background: 'var(--surface-container-low)', padding: '4px', gap: '8px' }}>
              <button className="quantity-control__btn" onClick={onRemove} style={{ width: '28px', height: '28px' }}>−</button>
              <span className="quantity-control__count" style={{ minWidth: '12px' }}>{quantity}</span>
              <button className="quantity-control__btn" onClick={onAdd} style={{ width: '28px', height: '28px' }}>+</button>
            </div>
          ) : (
            <button className="btn-add-small" onClick={onAdd} style={{ background: 'white', border: '1px solid #eaeaea', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>add</span>
            </button>
          )}
        </div>
      </div>
      <div style={{ width: 100, height: 100, borderRadius: '1rem', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        <Image src={item.image} alt={item.name} fill sizes="100px" style={{ objectFit: 'cover' }} />
      </div>
    </div>
  );
}

function MenuCardStandard({
  item, quantity, onAdd, onRemove, formatPrice,
}: {
  item: MenuItem; quantity: number; onAdd: () => void; onRemove: () => void; formatPrice: (p: number) => string;
}) {
  return (
    <div id={`menu-item-${item.id}`} style={{
      background: 'var(--surface-container-lowest)', borderRadius: '1.5rem', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-ambient)', marginBottom: '1.5rem'
    }}>
      <div style={{ height: 200, position: 'relative', width: '100%', overflow: 'hidden' }}>
        <Image src={item.image} alt={item.name} fill sizes="100vw" style={{ objectFit: 'cover', transition: 'transform 0.5s' }} />
        <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', padding: '6px 14px', borderRadius: '9999px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.875rem' }}>{formatPrice(item.price)}</span>
        </div>
      </div>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyItems: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>{item.name}</h4>
        </div>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.625, marginBottom: '1.5rem' }}>
          {item.description}
        </p>

        {quantity > 0 ? (
          <div className="quantity-control" style={{ background: 'var(--surface-container-low)', width: '100%', justifyContent: 'space-between', padding: 8 }}>
            <button className="quantity-control__btn" onClick={onRemove}>−</button>
            <span className="quantity-control__count" style={{ fontSize: '1.125rem' }}>{quantity}</span>
            <button className="quantity-control__btn" onClick={onAdd}>+</button>
          </div>
        ) : (
          <button className="btn-primary" onClick={onAdd} style={{ width: '100%' }}>
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
            Sepete Ekle
          </button>
        )}
      </div>
    </div>
  );
}
