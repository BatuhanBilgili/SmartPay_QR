'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import '../admin.css';

interface KitchenItem {
  id: string;
  name: string;
  quantity: number;
  status: string;
  notes: string | null;
}

interface KitchenTicket {
  id: string;
  orderNumber: string;
  tableNumber: number;
  tableLabel: string;
  createdAt: string;
  status: string;
  items: KitchenItem[];
}

export default function KitchenPanelPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [printingTicketId, setPrintingTicketId] = useState<string | null>(null);

  // ── Fetch kitchen orders ──
  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/kitchen/orders');
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
      }
    } catch (err) {
      console.error('Bilet yükleme hatası:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const role = localStorage.getItem('admin_role');
    if (role !== 'kitchen') {
      router.push('/admin');
      return;
    }
    fetchTickets();
    const interval = setInterval(fetchTickets, 15000);
    return () => clearInterval(interval);
  }, [router, fetchTickets]);

  const handlePrint = (ticketId: string) => {
    setPrintingTicketId(ticketId);
    setTimeout(() => {
      window.print();
      setPrintingTicketId(null);
    }, 100);
  };

  const markTicketReady = async (orderId: string) => {
    try {
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready' }),
      });

      fetchTickets();
    } catch (err) {
      console.error('Bilet tamamlama hatası:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_user');
    router.push('/admin');
  };

  return (
    <div className="admin-body">
      <div className="admin-layout" style={{ paddingTop: 0 }}>
        <main className="admin-main">
          <div className="admin-page-header">
            <div className="admin-header-main">
              <h1 className="admin-page-title">Mutfak Sistem Ekranı</h1>
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
            
            <div className="admin-header-status">
              <div className="admin-status-pill">
                <div className="admin-status-dot"></div>
                <span className="admin-status-text">Aktif Siparişler</span>
              </div>
              <p className="admin-page-subtitle">
                Hazırlanması gereken <span className="highlight">{tickets.length}</span> aktif sipariş bulunuyor.
              </p>
            </div>
          </div>

          <button className="admin-fab" onClick={fetchTickets} title="Yenile">
            <span className="material-symbols-outlined">refresh</span>
          </button>

          {isLoading ? (
            <div className="kitchen-empty-state">
              <div className="material-symbols-outlined kitchen-empty-icon">sync</div>
              <p>Biletler yükleniyor...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="kitchen-empty-state">
              <div className="material-symbols-outlined kitchen-empty-icon">restaurant_menu</div>
              <h3>Şu an bekleyen sipariş yok.</h3>
              <p>Harika gidiyorsun şef! Yeni sipariş geldiğinde burada görünecektir.</p>
            </div>
          ) : (
            <div className="kitchen-ticket-grid">
              {tickets.map((ticket) => {
                const minutesAgo = Math.floor((new Date().getTime() - new Date(ticket.createdAt).getTime()) / 60000);
                const isUrgent = minutesAgo > 15;
                const isPrinting = printingTicketId === ticket.id;

                return (
                  <div key={ticket.id} className={`kitchen-ticket ${isUrgent ? 'kitchen-ticket--urgent' : ''} ${isPrinting ? 'kitchen-ticket-to-print' : ''}`}>
                    <div className="kitchen-ticket-header">
                      <div className="kitchen-ticket-table">MASA {ticket.tableNumber}</div>
                      <div className="kitchen-ticket-time">{minutesAgo} dk önce</div>
                    </div>

                    <div className="kitchen-ticket-items">
                      {ticket.items.map((item) => (
                        <div key={item.id} className="kitchen-ticket-item">
                          <span className="kitchen-ticket-qty">{item.quantity}</span>
                          <div style={{ flex: 1 }}>
                            <div className="kitchen-ticket-name">{item.name.toUpperCase()}</div>
                            {item.notes && <div className="kitchen-ticket-notes">NOT: {item.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="kitchen-ticket-footer">
                      <button
                        className="kitchen-ticket-btn kitchen-ticket-btn--print"
                        onClick={() => handlePrint(ticket.id)}
                        title="Fiş Yazdır"
                      >
                        <span className="material-symbols-outlined">print</span>
                      </button>
                      <button
                        className="kitchen-ticket-btn"
                        onClick={() => markTicketReady(ticket.id)}
                      >
                        <span className="material-symbols-outlined">check_circle</span>
                        Hazır / Bitti
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
