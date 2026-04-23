'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import '../admin.css';

// ── Types ──
interface TableData {
  id: string;
  tableNumber: number;
  label: string;
  capacity: number;
  status: string;
  orderStatus: 'empty' | 'pending' | 'confirmed' | 'ready' | 'served';
  sessionId: string | null;
  pendingCount: number;
  confirmedCount: number;
  totalOrders: number;
  totalAmount: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  maxQuantity: number | null;
}

interface MenuCategory {
  id: string;
  name: string;
  iconEmoji: string;
  items: MenuItem[];
}

interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  status: string;
  isDrink?: boolean;
}

interface Order {
  id: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  items: OrderItem[];
}

interface TableDetail {
  table: { id: string; tableNumber: number; label: string; capacity: number };
  sessionId: string | null;
  totalAmount: string;
  orders: Order[];
  menu: MenuCategory[];
}

// ── Ready Order (Mutfaktan Hazır Çıkan, Garsonun Masaya Götüreceği) ──
interface ReadyOrder {
  id: string;
  tableNumber: number;
  tableLabel: string;
  tableId: string | null;
  updatedAt: string;
  items: { id: string; name: string; quantity: number }[];
}

const DISMISSED_KEY = 'waiter_dismissed_orders';

export default function WaiterPanelPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // ── Ready Orders (Teslim Bekleyen) ──
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [dismissedOrders, setDismissedOrders] = useState<Set<string>>(new Set());

  // ── Basket State ──
  const [basket, setBasket] = useState<{ menuItemId: string; name: string; quantity: number; price: string; maxQuantity: number | null }[]>([]);

  // ── Confirmation Toast State ──
  const [confirmAction, setConfirmAction] = useState<{ type: 'item' | 'order'; id: string; name: string } | null>(null);

  // ── Load dismissed orders from localStorage ──
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
      setDismissedOrders(new Set(stored));
    } catch {
      setDismissedOrders(new Set());
    }
  }, []);

  // ── Fetch all tables ──
  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tables');
      const data = await res.json();
      if (data.success) {
        setTables(data.data.tables);
      }
    } catch (err) {
      console.error('Masa yükleme hatası:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Fetch ready orders (mutfaktan hazır çıkan, teslim bekleyen) ──
  const fetchReadyOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/waiter/ready-orders');
      const data = await res.json();
      if (data.success) {
        setReadyOrders(data.data);
        // LocalStorage temizle: sunucuda artık olmayan sipariş ID'lerini sil
        const serverIds = new Set<string>(data.data.map((o: ReadyOrder) => o.id));
        setDismissedOrders(prev => {
          const cleaned = new Set([...prev].filter(id => serverIds.has(id)));
          localStorage.setItem(DISMISSED_KEY, JSON.stringify([...cleaned]));
          return cleaned;
        });
      }
    } catch (err) {
      console.error('Ready orders fetch error:', err);
    }
  }, []);

  useEffect(() => {
    const role = localStorage.getItem('admin_role');
    if (role !== 'waiter') {
      router.push('/admin');
      return;
    }
    fetchTables();
    fetchReadyOrders();
    const interval = setInterval(fetchTables, 10000);
    const readyInterval = setInterval(fetchReadyOrders, 10000);
    return () => {
      clearInterval(interval);
      clearInterval(readyInterval);
    };
  }, [router, fetchTables, fetchReadyOrders]);

  // ── Dismiss a ready order (Teslim Ettim) ──
  const dismissReadyOrder = (orderId: string) => {
    setDismissedOrders(prev => {
      const next = new Set([...prev, orderId]);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  // ── Visible ready orders (dismissed olanları filtrele) ──
  const visibleReadyOrders = readyOrders.filter(o => !dismissedOrders.has(o.id));

  // ── Fetch table detail ──
  const openTableModal = async (tableId: string) => {
    setIsModalLoading(true);
    setIsModalOpen(true);
    try {
      const res = await fetch(`/api/admin/tables/${tableId}/orders`);
      const data = await res.json();
      if (data.success) {
        setSelectedTable(data.data);
      }
    } catch (err) {
      console.error('Masa detay hatası:', err);
    } finally {
      setIsModalLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTable(null);
    setBasket([]);
    fetchTables();
  };

  // ── Delete order item ──
  const deleteOrderItem = (itemId: string, name: string) => {
    setConfirmAction({ type: 'item', id: itemId, name });
  };

  // ── Cancel/Delete entire order ──
  const cancelOrder = (orderId: string, time: string) => {
    setConfirmAction({ type: 'order', id: orderId, name: `Sipariş (${time})` });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      const endpoint = confirmAction.type === 'item'
        ? `/api/admin/orders/items/${confirmAction.id}`
        : `/api/admin/orders/${confirmAction.id}`;

      await fetch(endpoint, { method: 'DELETE' });

      if (selectedTable) {
        const res = await fetch(`/api/admin/tables/${selectedTable.table.id}/orders`);
        const data = await res.json();
        if (data.success) setSelectedTable(data.data);
      }
      fetchTables();
      setConfirmAction(null);
    } catch (err) {
      console.error('Silme hatası:', err);
    }
  };

  // ── Update order status ──
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (selectedTable) {
        const res = await fetch(`/api/admin/tables/${selectedTable.table.id}/orders`);
        const data = await res.json();
        if (data.success) setSelectedTable(data.data);
      }
      fetchTables();
    } catch (err) {
      console.error('Durum güncelleme hatası:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_user');
    router.push('/admin');
  };

  // ── Derived data ──
  const pendingTables = tables.filter(t => t.orderStatus === 'pending');
  const now = new Date();
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const dayStr = now.toLocaleDateString('tr-TR', { weekday: 'long' });

  // ── Group tables by label ──
  const groupedTables = tables.reduce((groups, table) => {
    const key = table.label || 'Genel';
    if (!groups[key]) groups[key] = [];
    groups[key].push(table);
    return groups;
  }, {} as Record<string, TableData[]>);

  const sortedGroupKeys = Object.keys(groupedTables).sort((a, b) => {
    if (a === 'Genel') return 1;
    if (b === 'Genel') return -1;
    return a.localeCompare(b, 'tr');
  });

  const statusLabel = (s: string) => {
    switch (s) {
      case 'pending': return 'Bekliyor';
      case 'confirmed': return 'Mutfakta';
      case 'preparing': return 'Hazırlanıyor';
      case 'ready': return 'Hazır';
      case 'served': return 'Teslim Edildi';
      case 'cancelled': return 'İptal';
      default: return s;
    }
  };

  return (
    <div className="admin-body">
      <div className="admin-layout" style={{ paddingTop: 0 }}>
        <main className="admin-main">
          {/* Header */}
          <div className="admin-page-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <h1 className="admin-page-title">Servis</h1>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'var(--surface-container-highest)',
                    border: 'none',
                    borderRadius: 'var(--admin-radius-full)',
                    padding: '8px 16px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'var(--on-surface-variant)'
                  }}
                >
                  Çıkış Yap
                </button>
              </div>
              <p className="admin-page-subtitle">
                {dayStr}, {timeStr} — <span className="highlight">{pendingTables.length > 0 ? 'Aktif Siparişler Var' : 'Sakin'}</span>
              </p>
            </div>
            <div className="admin-status-pill">
              <div className="admin-status-dot"></div>
              <span className="admin-status-text">Sistem Aktif</span>
            </div>
          </div>

          {/* ════════════════════════════════════════════
              TESLİM BEKLEYENLER — Mutfaktan Hazır Çıkan
              ════════════════════════════════════════════ */}
          {visibleReadyOrders.length > 0 && (
            <div className="ready-orders-section">
              <div className="ready-orders-header">
                <span className="material-symbols-outlined ready-orders-icon">local_shipping</span>
                <h3>Teslim Bekleyen Siparişler</h3>
                <span className="admin-badge admin-badge--ready" style={{ animation: 'pulse 2s infinite' }}>
                  {visibleReadyOrders.length} Hazır
                </span>
              </div>
              <div className="ready-orders-scroll">
                {visibleReadyOrders.map(order => (
                  <div key={order.id} className="ready-order-card">
                    <div className="ready-order-card-header">
                      <div className="ready-order-card-table">
                        <div className="ready-order-card-table-num">{order.tableNumber}</div>
                        <div>
                          <div className="ready-order-card-info-title">Masa {order.tableNumber}</div>
                          <div className="ready-order-card-info-sub">{order.tableLabel || 'Genel'}</div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined" style={{ color: '#22c55e', fontSize: '1.3rem' }}>
                        check_circle
                      </span>
                    </div>
                    <div className="ready-order-items">
                      {order.items.map(item => (
                        <span key={item.id} className="ready-order-item-chip">
                          {item.quantity}× {item.name}
                        </span>
                      ))}
                    </div>
                    <button
                      className="ready-order-deliver-btn"
                      onClick={() => {
                        dismissReadyOrder(order.id);
                        updateOrderStatus(order.id, 'served');
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>done_all</span>
                      Teslim Ettim
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Masa Haritası başlığı ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 className="admin-section-title" style={{ margin: 0 }}>
              <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: 8 }}>table_restaurant</span>
              Masa Haritası
            </h3>
            {pendingTables.length > 0 && (
              <span className="admin-badge admin-badge--new" style={{ animation: 'pulse 2s infinite' }}>
                {pendingTables.length} Aktif Masa
              </span>
            )}
          </div>

          {/* ── Active Orders (Pending) Scroll ── */}
          {pendingTables.length > 0 && (
            <div className="active-orders-scroll" style={{ marginBottom: 32 }}>
              {pendingTables.map(t => (
                <div key={t.id} className="active-order-card" onClick={() => openTableModal(t.id)} style={{ cursor: 'pointer', borderLeft: '4px solid var(--primary)' }}>
                  <div className="active-order-card-header">
                    <div className="active-order-card-table">
                      <div className="active-order-card-table-num">{t.tableNumber}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Masa {t.tableNumber}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{t.label || 'Genel'}</div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)', animation: 'ring-bell 1.5s infinite' }}>notifications_active</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--on-surface-variant)' }}>
              Masalar yükleniyor...
            </div>
          ) : (
            <div>
              {sortedGroupKeys.map((groupKey) => (
                <div key={groupKey} style={{ marginBottom: 40 }}>
                  {sortedGroupKeys.length > 1 && (
                    <div className="floor-section-header">
                      <span className="material-symbols-outlined floor-section-icon">
                        {groupKey.toLowerCase().includes('bahçe') || groupKey.toLowerCase().includes('bahce') || groupKey.toLowerCase().includes('teras')
                          ? 'park'
                          : groupKey.toLowerCase().includes('kat')
                            ? 'floor'
                            : 'meeting_room'}
                      </span>
                      <span className="floor-section-title">{groupKey}</span>
                      <span className="floor-section-count">{groupedTables[groupKey].length} masa</span>
                    </div>
                  )}
                  <div className="floor-grid">
                    {groupedTables[groupKey].map((t) => (
                      <div
                        key={t.id}
                        className={`floor-tile floor-tile--${t.orderStatus}`}
                        onClick={() => openTableModal(t.id)}
                      >
                        {/* 🔴 Kırmızı zil: mutfakta bekleyen siparişler */}
                        {(t.orderStatus === 'pending' || t.orderStatus === 'confirmed') && (
                          <span className="floor-tile-icon floor-tile-icon--bell-red material-symbols-outlined">
                            notifications
                          </span>
                        )}
                        {/* 🟢 Yeşil zil: mutfaktan hazır çıkmış, teslim bekliyor */}
                        {t.orderStatus === 'ready' && (
                          <span className="floor-tile-icon floor-tile-icon--bell-green material-symbols-outlined">
                            notifications
                          </span>
                        )}

                        <span className="floor-tile-number">{t.tableNumber}</span>
                        <span className="floor-tile-label">{t.label || 'Genel'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── FAB ── */}
      <button className="admin-fab" onClick={() => { fetchTables(); fetchReadyOrders(); }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.875rem' }}>refresh</span>
      </button>

      {/* ══════════════════════════════════════════════
          TABLE DETAIL MODAL
          ══════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="table-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="table-modal">
            {isModalLoading ? (
              <div style={{ padding: 80, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                Yükleniyor...
              </div>
            ) : selectedTable ? (
              <>
                {/* Modal Header */}
                <div className="table-modal-header">
                  <div>
                    <h2 className="table-modal-title">
                      Masa {selectedTable.table.tableNumber}
                      <span style={{ fontWeight: 400, fontSize: '1rem', color: 'var(--on-surface-variant)', marginLeft: 12 }}>
                        {selectedTable.table.label}
                      </span>
                    </h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="table-modal-bill-total">
                      <span>Masa Toplamı</span>
                      ₺{parseFloat(selectedTable.totalAmount).toFixed(2)}
                    </div>
                    <button className="table-modal-close" onClick={closeModal}>
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="table-modal-body">
                  {/* Left: Menu */}
                  <div className="table-modal-menu">
                    <p className="modal-orders-title">Menü Ürünleri</p>
                    {selectedTable.menu.map((cat) => (
                      <div key={cat.id} className="modal-menu-category">
                        <div className="modal-menu-cat-title">
                          <span>{cat.iconEmoji}</span>
                          <span>{cat.name}</span>
                        </div>
                        {cat.items.map((item) => {
                          const basketItem = basket.find(b => b.menuItemId === item.id);
                          const basketQty = basketItem?.quantity || 0;

                          const currentTotalInOrders = selectedTable.orders
                            .filter(o => o.status !== 'cancelled')
                            .flatMap(o => o.items)
                            .filter(i => i.menuItemId === item.id)
                            .reduce((sum, i) => sum + i.quantity, 0);

                          const totalRequested = currentTotalInOrders + basketQty;
                          const isMaxReached = item.maxQuantity !== null && item.maxQuantity > 0 && totalRequested >= item.maxQuantity;

                          return (
                            <div key={item.id} className={`modal-menu-item ${isMaxReached ? 'modal-menu-item--disabled' : ''}`}>
                              <div style={{ flex: 1 }}>
                                <span className="modal-menu-item-name">{item.name}</span>
                                {item.maxQuantity && (
                                  <div style={{ fontSize: '0.65rem', color: isMaxReached ? 'var(--error)' : 'var(--on-surface-variant)' }}>
                                    Limit: {item.maxQuantity} (Şu an: {totalRequested})
                                  </div>
                                )}
                              </div>
                              <span className="modal-menu-item-price">₺{parseFloat(item.price).toFixed(2)}</span>
                              <div className="modal-menu-item-actions">
                                {basketQty > 0 && (
                                  <button
                                    className="modal-menu-item-btn"
                                    onClick={() => {
                                      const newBasket = basket.map(b =>
                                        b.menuItemId === item.id ? { ...b, quantity: b.quantity - 1 } : b
                                      ).filter(b => b.quantity > 0);
                                      setBasket(newBasket);
                                    }}
                                  >
                                    -
                                  </button>
                                )}
                                {basketQty > 0 && <span style={{ margin: '0 8px', fontWeight: 700 }}>{basketQty}</span>}
                                <button
                                  className="modal-menu-item-add"
                                  disabled={isMaxReached}
                                  onClick={() => {
                                    if (isMaxReached) return;
                                    const existing = basket.find(b => b.menuItemId === item.id);
                                    if (existing) {
                                      setBasket(basket.map(b => b.menuItemId === item.id ? { ...b, quantity: b.quantity + 1 } : b));
                                    } else {
                                      setBasket([...basket, { menuItemId: item.id, name: item.name, quantity: 1, price: item.price, maxQuantity: item.maxQuantity }]);
                                    }
                                  }}
                                  title="Sepete Ekle"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Right: Orders & Basket */}
                  <div className="table-modal-orders">
                    {/* Current Basket */}
                    {basket.length > 0 && (
                      <div className="modal-order-group modal-order-group--basket">
                        <div className="modal-order-group-header">
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>YENİ SİPARİŞ (SEPET)</span>
                        </div>
                        {basket.map((item) => (
                          <div key={item.menuItemId} className="modal-order-item">
                            <div className="modal-order-item-left">
                              <span className="modal-order-item-qty">{item.quantity}x</span>
                              <span className="modal-order-item-name">{item.name}</span>
                            </div>
                            <span className="modal-order-item-price">₺{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="modal-order-total">
                          <span className="modal-order-total-label">Toplam</span>
                          <span className="modal-order-total-value">₺{basket.reduce((sum, i) => sum + (parseFloat(i.price) * i.quantity), 0).toFixed(2)}</span>
                        </div>
                        <div className="modal-order-actions">
                          <button
                            className="modal-order-action-btn modal-order-action-btn--kitchen"
                            onClick={async () => {
                              if (!selectedTable) return;
                              try {
                                await fetch(`/api/admin/tables/${selectedTable.table.id}/orders`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ items: basket.map(b => ({ menuItemId: b.menuItemId, quantity: b.quantity })) }),
                                });
                                setBasket([]);
                                const res = await fetch(`/api/admin/tables/${selectedTable.table.id}/orders`);
                                const data = await res.json();
                                if (data.success) setSelectedTable(data.data);
                                fetchTables();
                              } catch (err) {
                                console.error('Sipariş gönderim hatası:', err);
                              }
                            }}
                          >
                            ✅ Onayla
                          </button>
                          <button className="modal-order-action-btn modal-order-action-btn--cancel" onClick={() => setBasket([])}>Vazgeç</button>
                        </div>
                      </div>
                    )}

                    <p className="modal-orders-title">Onaylı Siparişler</p>

                    {selectedTable.orders.filter(o => o.status !== 'cancelled').length === 0 ? (
                      <div className="modal-empty-state">
                        <span className="material-symbols-outlined">receipt_long</span>
                        Bu masada henüz onaylı sipariş yok.
                        <br />
                        Soldan menü ürünlerini ekleyebilirsiniz.
                      </div>
                    ) : (
                      selectedTable.orders
                        .filter(o => o.status !== 'cancelled')
                        .map((order) => (
                          <div key={order.id} className="modal-order-group">
                            <div className="modal-order-group-header">
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                                {new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className={`modal-order-status modal-order-status--${order.status}`}>
                                {statusLabel(order.status)}
                              </span>
                            </div>

                            {order.items.map((item) => (
                              <div key={item.id} className="modal-order-item">
                                <div className="modal-order-item-left">
                                  <span className="modal-order-item-qty">{item.quantity}x</span>
                                  <span className="modal-order-item-name">{item.name}</span>
                                </div>
                                <span className="modal-order-item-price">₺{parseFloat(item.totalPrice).toFixed(2)}</span>
                                {(order.status !== 'cancelled' && (order.status !== 'served' || (item.isDrink && !dismissedOrders.has(order.id)))) && (
                                  <button
                                    className="modal-order-item-delete"
                                    onClick={() => deleteOrderItem(item.id, item.name)}
                                    title="Sil"
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>close</span>
                                  </button>
                                )}
                              </div>
                            ))}

                            <div className="modal-order-total">
                              <span className="modal-order-total-label">Toplam</span>
                              <span className="modal-order-total-value">₺{parseFloat(order.totalAmount).toFixed(2)}</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="modal-order-actions">
                              {order.status === 'pending' && (
                                <button
                                  className="modal-order-action-btn modal-order-action-btn--kitchen"
                                  onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                >
                                  🍳 Mutfağa Gönder
                                </button>
                              )}
                              {(order.status === 'confirmed' || order.status === 'preparing' || order.status === 'ready') && (
                                <button
                                  className="modal-order-action-btn modal-order-action-btn--served"
                                  onClick={() => updateOrderStatus(order.id, 'served')}
                                >
                                  ✅ Teslim Ettim
                                </button>
                              )}
                              {(order.status !== 'cancelled' && (order.status !== 'served' || (!dismissedOrders.has(order.id) && order.items.every(i => i.isDrink)))) && (
                                <button
                                  className="modal-order-action-btn modal-order-action-btn--cancel"
                                  onClick={() => cancelOrder(order.id, new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }))}
                                >
                                  Tümünü İptal Et
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
      {/* ── Custom Action Confirmation Toast ── */}
      {confirmAction && (
        <div className="admin-toast-overlay">
          <div className="admin-toast">
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '2rem' }}>delete_forever</span>
            <div className="admin-toast-message">
              <div>{confirmAction.type === 'item' ? `"${confirmAction.name}" silinsin mi?` : `${confirmAction.name} iptal edilsin mi?`}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8 }}>Kayıt DB'den silinecek ve ücret düşecektir.</div>
            </div>
            <div className="admin-toast-actions">
              <button className="admin-toast-btn admin-toast-btn--cancel" onClick={() => setConfirmAction(null)}>Vazgeç</button>
              <button className="admin-toast-btn admin-toast-btn--confirm" onClick={handleConfirmAction}>
                {confirmAction.type === 'item' ? 'Sil' : 'Siparişi İptal Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
