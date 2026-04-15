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
  orderStatus: 'empty' | 'pending' | 'confirmed' | 'served';
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
  orders: Order[];
  menu: MenuCategory[];
}

export default function WaiterPanelPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [mobileNavTab, setMobileNavTab] = useState('tables');

  // ── Fetch all tables ──
  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tables');
      const data = await res.json();
      if (data.success) {
        setTables(data.data);
      }
    } catch (err) {
      console.error('Masa yükleme hatası:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const role = localStorage.getItem('admin_role');
    if (role !== 'waiter') {
      router.push('/admin');
      return;
    }
    fetchTables();
    // Her 10 saniyede yenile
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
  }, [router, fetchTables]);

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
    fetchTables(); // Listeyi yenile
  };

  // ── Add item to table ──
  const addItemToTable = async (menuItemId: string) => {
    if (!selectedTable) return;
    try {
      await fetch(`/api/admin/tables/${selectedTable.table.id}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ menuItemId, quantity: 1 }] }),
      });
      // Refresh modal data
      const res = await fetch(`/api/admin/tables/${selectedTable.table.id}/orders`);
      const data = await res.json();
      if (data.success) setSelectedTable(data.data);
    } catch (err) {
      console.error('Ürün ekleme hatası:', err);
    }
  };

  // ── Delete order item ──
  const deleteOrderItem = async (itemId: string) => {
    try {
      await fetch(`/api/admin/orders/items/${itemId}`, { method: 'DELETE' });
      // Refresh modal data
      if (selectedTable) {
        const res = await fetch(`/api/admin/tables/${selectedTable.table.id}/orders`);
        const data = await res.json();
        if (data.success) setSelectedTable(data.data);
      }
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
      // Refresh modal data
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

  const statusLabel = (s: string) => {
    switch (s) {
      case 'pending': return 'Bekliyor';
      case 'confirmed': return 'Mutfakta';
      case 'preparing': return 'Hazırlanıyor';
      case 'served': return 'Servis Edildi';
      case 'cancelled': return 'İptal';
      default: return s;
    }
  };

  return (
    <div className="admin-body">
      {/* ── Top App Bar ── */}
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <span className="admin-menu-btn material-symbols-outlined">menu</span>
          <span className="admin-topbar-brand">The Culinary Editorial</span>
        </div>
        <div className="admin-topbar-right">
          <nav className="admin-topbar-nav">
            <a className="active">Dashboard</a>
            <a>Orders</a>
            <a>Staff</a>
          </nav>
          <div className="admin-avatar" onClick={handleLogout} title="Çıkış Yap">👨‍🍳</div>
        </div>
      </header>

      <div className="admin-layout">
        {/* ── Sidebar (Desktop) ── */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-profile">
            <div className="admin-sidebar-profile-icon">
              <span className="material-symbols-outlined">restaurant</span>
            </div>
            <div className="admin-sidebar-profile-info">
              <p>Editorial Manager</p>
              <p>Shift: Evening</p>
            </div>
          </div>
          <nav className="admin-sidebar-nav">
            <a className="admin-sidebar-item active">
              <span className="material-symbols-outlined">dashboard</span>
              Dashboard
            </a>
            <a className="admin-sidebar-item">
              <span className="material-symbols-outlined">pending_actions</span>
              Live Orders
              {pendingTables.length > 0 && <span className="admin-sidebar-badge">{pendingTables.length}</span>}
            </a>
            <a className="admin-sidebar-item">
              <span className="material-symbols-outlined">edit_note</span>
              Menu Editor
            </a>
            <a className="admin-sidebar-item">
              <span className="material-symbols-outlined">badge</span>
              Staff Management
            </a>
            <a className="admin-sidebar-item">
              <span className="material-symbols-outlined">settings</span>
              Settings
            </a>
          </nav>
        </aside>

        {/* ── Main Content ── */}
        <main className="admin-main">
          {/* Header */}
          <div className="admin-page-header">
            <div>
              <h1 className="admin-page-title">Service Floor</h1>
              <p className="admin-page-subtitle">
                {dayStr}, {timeStr} — <span className="highlight">{pendingTables.length > 0 ? 'Aktif Siparişler Var' : 'Sakin'}</span>
              </p>
            </div>
            <div className="admin-status-pill">
              <div className="admin-status-dot"></div>
              <span className="admin-status-text">System Online</span>
            </div>
          </div>

          {/* ── Active Orders (Pending) ── */}
          {pendingTables.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <h3 className="admin-section-title">
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', verticalAlign: 'middle', marginRight: 8 }}>notifications_active</span>
                Aktif Siparişler
              </h3>
              <div className="active-orders-scroll">
                {pendingTables.map(t => (
                  <div key={t.id} className="active-order-card" onClick={() => openTableModal(t.id)} style={{ cursor: 'pointer' }}>
                    <div className="active-order-card-header">
                      <div className="active-order-card-table">
                        <div className="active-order-card-table-num">{t.tableNumber}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Masa {t.tableNumber}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{t.label}</div>
                        </div>
                      </div>
                      <span className="admin-badge admin-badge--new">{t.pendingCount} Yeni</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{t.totalOrders} sipariş</span>
                      <span style={{ fontWeight: 900, color: 'var(--on-surface)' }}>₺{t.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Table Floor Grid ── */}
          <h3 className="admin-section-title">
            <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: 8 }}>table_restaurant</span>
            Masa Haritası
          </h3>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--on-surface-variant)' }}>
              Masalar yükleniyor...
            </div>
          ) : (
            <div className="floor-grid">
              {tables.map((t) => (
                <div
                  key={t.id}
                  className={`floor-tile floor-tile--${t.orderStatus}`}
                  onClick={() => openTableModal(t.id)}
                >
                  {/* Status Icon */}
                  {t.orderStatus === 'pending' && (
                    <span className="floor-tile-icon floor-tile-icon--bell material-symbols-outlined">
                      notifications
                    </span>
                  )}
                  {t.orderStatus === 'confirmed' && (
                    <span className="floor-tile-icon floor-tile-icon--check material-symbols-outlined">
                      check_circle
                    </span>
                  )}

                  <span className="floor-tile-number">{t.tableNumber}</span>
                  <span className="floor-tile-label">{t.label}</span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── Bottom Nav (Mobile) ── */}
      <nav className="admin-bottom-nav">
        <div className={`admin-bottom-nav-item ${mobileNavTab === 'menu' ? 'active' : ''}`} onClick={() => setMobileNavTab('menu')}>
          <span className="material-symbols-outlined">restaurant_menu</span>
          <span className="admin-bottom-nav-label">Menu</span>
        </div>
        <div className={`admin-bottom-nav-item ${mobileNavTab === 'orders' ? 'active' : ''}`} onClick={() => setMobileNavTab('orders')}>
          <span className="material-symbols-outlined">receipt_long</span>
          <span className="admin-bottom-nav-label">Orders</span>
        </div>
        <div className={`admin-bottom-nav-item ${mobileNavTab === 'tables' ? 'active' : ''}`} onClick={() => setMobileNavTab('tables')}>
          <span className="material-symbols-outlined">table_restaurant</span>
          <span className="admin-bottom-nav-label">Tables</span>
        </div>
        <div className={`admin-bottom-nav-item ${mobileNavTab === 'sales' ? 'active' : ''}`} onClick={() => setMobileNavTab('sales')}>
          <span className="material-symbols-outlined">query_stats</span>
          <span className="admin-bottom-nav-label">Sales</span>
        </div>
      </nav>

      {/* ── FAB ── */}
      <button className="admin-fab" onClick={() => fetchTables()}>
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
                  <button className="table-modal-close" onClick={closeModal}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
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
                        {cat.items.map((item) => (
                          <div key={item.id} className="modal-menu-item">
                            <div style={{ flex: 1 }}>
                              <span className="modal-menu-item-name">{item.name}</span>
                            </div>
                            <span className="modal-menu-item-price">₺{parseFloat(item.price).toFixed(2)}</span>
                            <button
                              className="modal-menu-item-add"
                              onClick={() => addItemToTable(item.id)}
                              title="Siparişe Ekle"
                            >
                              +
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Right: Orders */}
                  <div className="table-modal-orders">
                    <p className="modal-orders-title">Sipariş Detayı</p>

                    {selectedTable.orders.length === 0 ? (
                      <div className="modal-empty-state">
                        <span className="material-symbols-outlined">receipt_long</span>
                        Bu masada henüz sipariş yok.
                        <br />
                        Soldan menü ürünlerini ekleyebilirsiniz.
                      </div>
                    ) : (
                      selectedTable.orders.map((order) => (
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
                              {order.status === 'pending' && (
                                <button
                                  className="modal-order-item-delete"
                                  onClick={() => deleteOrderItem(item.id)}
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
                            {(order.status === 'confirmed' || order.status === 'preparing') && (
                              <button
                                className="modal-order-action-btn modal-order-action-btn--served"
                                onClick={() => updateOrderStatus(order.id, 'served')}
                              >
                                ✅ Servis Edildi
                              </button>
                            )}
                            {order.status === 'pending' && (
                              <button
                                className="modal-order-action-btn modal-order-action-btn--cancel"
                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                              >
                                İptal
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
    </div>
  );
}
