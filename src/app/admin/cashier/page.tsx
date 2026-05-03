'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import '../admin.css';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  paidQuantity: number;
  unitPrice: string;
  totalPrice: string;
  status: string;
  menuItem?: { name: string };
}

interface Order {
  id: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  items: OrderItem[];
}

interface Session {
  id: string;
  status: string;
  totalAmount: string;
  paidAmount: string;
  createdAt: string;
}

interface TableData {
  id: string;
  tableNumber: number;
  label: string;
  status: string;
  session: Session | null;
  orders: Order[];
}

export default function CashierPanelPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Payment mode: 'full' | 'itemized' | 'custom'
  const [paymentMode, setPaymentMode] = useState<'full' | 'itemized' | 'custom'>('full');

  // Split panel
  const [showSplit, setShowSplit] = useState(false);
  const [splitCount, setSplitCount] = useState(2);

  // Itemized: { [orderItemId]: quantityToPay }
  const [itemSelections, setItemSelections] = useState<Record<string, number>>({});

  // Custom amount
  const [customAmount, setCustomAmount] = useState('');

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cashier/tables');
      const data = await res.json();
      if (data.success) setTables(data.data);
    } catch (err) {
      console.error('Fetch tables error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const role = localStorage.getItem('admin_role');
    if (role !== 'owner' && role !== 'admin' && role !== 'cashier') {
      router.push('/admin');
      return;
    }
    fetchTables();
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
  }, [fetchTables, router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/admin');
  };

  const resetPanel = () => {
    setItemSelections({});
    setPaymentMode('full');
    setShowSplit(false);
    setSplitCount(2);
    setCustomAmount('');
  };

  const getTableStatusColor = (table: TableData) => {
    if (!table.session) return '#9e9e9e';
    const total = parseFloat(table.session.totalAmount);
    const paid = parseFloat(table.session.paidAmount);
    if (total <= 0) return '#ff9800';
    if (paid >= total) return '#4caf50';
    if (paid > 0) return '#ff9800';
    return '#f44336';
  };

  const selectedTable = tables.find(t => t.id === selectedTableId) || null;
  const session = selectedTable?.session ?? null;
  const totalAmount = session ? parseFloat(session.totalAmount) : 0;
  const paidAmount = session ? parseFloat(session.paidAmount) : 0;
  const remainingAmount = totalAmount - paidAmount;

  // Flat list of unpaid items across all orders
  const allItems: OrderItem[] = selectedTable
    ? selectedTable.orders.flatMap(o => o.items.filter(i => (i.quantity - (i.paidQuantity || 0)) > 0))
    : [];

  // Calculate amount for itemized mode
  const itemizedTotal = allItems.reduce((sum, item) => {
    const qty = itemSelections[item.id] || 0;
    return sum + qty * parseFloat(item.unitPrice);
  }, 0);

  // Final amount to pay
  let amountToPay = 0;
  if (paymentMode === 'full') {
    amountToPay = showSplit ? totalAmount / splitCount : remainingAmount;
    // Clamp full/split modes to remaining
    if (amountToPay > remainingAmount) amountToPay = remainingAmount;
  } else if (paymentMode === 'itemized') {
    amountToPay = itemizedTotal;
    if (amountToPay > remainingAmount) amountToPay = remainingAmount;
  } else if (paymentMode === 'custom') {
    // Custom mode: allow any amount the user enters — no cap
    amountToPay = parseFloat(customAmount) || 0;
  }

  const apiPaymentType = paymentMode === 'full' ? (showSplit ? 'equal' : 'full') : paymentMode === 'itemized' ? 'itemized' : 'full';

  const handlePayment = async (method: 'cash' | 'credit_card') => {
    if (!session) return;
    if (amountToPay <= 0) { alert('Ödenecek tutar 0 olamaz.'); return; }

    setIsProcessing(true);
    try {
      const itemsPayload = Object.entries(itemSelections)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ id, paidQuantity: qty }));

      const res = await fetch('/api/admin/cashier/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          amount: amountToPay,
          method,
          paymentType: apiPaymentType,
          items: itemsPayload,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data.isFullyPaid) setSelectedTableId(null);
        resetPanel();
        fetchTables();
      } else {
        alert('Ödeme hatası: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Bağlantı hatası.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleItemQtyChange = (itemId: string, maxAvailable: number, delta: number) => {
    setItemSelections(prev => {
      const current = prev[itemId] || 0;
      let next = current + delta;
      if (next < 0) next = 0;
      if (next > maxAvailable) next = maxAvailable;
      return { ...prev, [itemId]: next };
    });
  };

  const activeSessions = tables.filter(t => t.session !== null);
  const totalOpenRevenue = activeSessions.reduce((s, t) => s + parseFloat(t.session!.totalAmount), 0);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1rem', color: 'var(--on-surface-variant)' }}>
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="admin-body" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── HEADER ── */}
      <header style={{
        height: 60,
        flexShrink: 0,
        background: 'var(--surface-container-lowest)',
        borderBottom: '1px solid var(--surface-container-highest)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        gap: 12,
        zIndex: 30,
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(181,28,0,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>point_of_sale</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1, whiteSpace: 'nowrap' }}>Kasa Paneli</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>SmartPay QR</div>
          </div>
        </div>

        {/* Centre stat */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'var(--surface-container-low)',
          borderRadius: 10, padding: '6px 16px',
          flex: '0 0 auto',
        }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Toplam Açık</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>₺{totalOpenRevenue.toFixed(2)}</span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--surface-container-low)',
            border: '1.5px solid var(--outline-variant)',
            borderRadius: 10, padding: '8px 14px',
            fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
            color: 'var(--on-surface-variant)',
            transition: 'all 0.15s', flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          <span className="hide-mobile">Çıkış</span>
        </button>
      </header>

      {/* ── MAIN ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }} className="cashier-main-container">

        {/* LEFT: Table grid */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto', background: 'var(--surface-container-lowest)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {tables.map(table => {
              const dot = getTableStatusColor(table);
              const isEmpty = !table.session;
              const tTotal = table.session ? parseFloat(table.session.totalAmount) : 0;
              const tPaid = table.session ? parseFloat(table.session.paidAmount) : 0;
              const tRem = tTotal - tPaid;
              const isSelected = selectedTableId === table.id;
              const hasItems = tTotal > 0;

              return (
                <div
                  key={table.id}
                  onClick={() => {
                    if (!isEmpty) {
                      setSelectedTableId(table.id);
                      resetPanel();
                    }
                  }}
                  style={{
                    background: isSelected ? 'rgba(181,28,0,0.08)' : 'var(--surface-container-low)',
                    border: `2px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                    borderRadius: 12,
                    padding: 12,
                    cursor: isEmpty ? 'default' : 'pointer',
                    opacity: isEmpty ? 0.45 : 1,
                    transition: 'all 0.2s',
                    boxShadow: isSelected ? '0 4px 12px rgba(181,28,0,0.12)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 800 }}>Masa {table.tableNumber}</span>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
                  </div>
                  {!isEmpty && (
                    <div style={{ fontSize: '0.8125rem' }}>
                      <span style={{ color: tRem > 0 ? '#f44336' : '#4caf50', fontWeight: 800 }}>₺{tRem.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Detail panel */}
        {selectedTable && session && (
          <div
            style={{ width: 420, background: 'var(--surface-container-low)', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--surface-container-highest)', zIndex: 20 }}
            className="cashier-detail-panel"
          >
            {/* Panel header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--surface-container-highest)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Masa {selectedTable.tableNumber}</h2>
              <button onClick={() => { setSelectedTableId(null); resetPanel(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface)' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>



            {/* Scrollable order summary with item selection */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '14px 20px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--on-surface-variant)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Sipariş Özeti {paymentMode === 'itemized' && <span style={{ color: 'var(--primary)' }}>— seçim modu</span>}
                </div>

                {allItems.length === 0 && totalAmount <= 0 ? (
                  <div style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', textAlign: 'center', padding: '20px 0' }}>Sipariş yok</div>
                ) : (
                  selectedTable.orders.map(order =>
                    order.items.map(item => {
                      const availableQty = item.quantity - (item.paidQuantity || 0);
                      const itemName = item.menuItem?.name || item.name;
                      const unitPrice = parseFloat(item.unitPrice);
                      const isSelectable = paymentMode === 'itemized' && availableQty > 0;
                      const sQty = itemSelections[item.id] || 0;
                      const isPaidOff = availableQty <= 0;

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            marginBottom: 6,
                            borderRadius: 10,
                            background: sQty > 0 ? 'rgba(181,28,0,0.07)' : 'var(--surface-container-lowest)',
                            border: `1.5px solid ${sQty > 0 ? 'var(--primary)' : 'transparent'}`,
                            opacity: isPaidOff ? 0.45 : 1,
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{itemName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                              {item.quantity}x · ₺{unitPrice.toFixed(2)} / adet
                              {isPaidOff && <span style={{ color: '#4caf50', marginLeft: 6, fontWeight: 700 }}>✓ Ödendi</span>}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                            {isSelectable ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                  onClick={() => handleItemQtyChange(item.id, availableQty, -1)}
                                  style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'var(--surface-container-highest)', cursor: 'pointer', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >−</button>
                                <span style={{ fontWeight: 800, minWidth: 16, textAlign: 'center' }}>{sQty}</span>
                                <button
                                  onClick={() => handleItemQtyChange(item.id, availableQty, 1)}
                                  style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: sQty < availableQty ? 'var(--primary)' : 'var(--surface-container-highest)', color: sQty < availableQty ? '#fff' : 'inherit', cursor: 'pointer', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >+</button>
                              </div>
                            ) : (
                              <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>₺{parseFloat(item.totalPrice).toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {/* Totals row */}
                {totalAmount > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--surface-container-highest)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: 4 }}>
                      <span>Toplam</span><span>₺{totalAmount.toFixed(2)}</span>
                    </div>
                    {paidAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#4caf50', marginBottom: 4 }}>
                        <span>Ödenen</span><span>−₺{paidAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9375rem' }}>
                      <span>Kalan</span><span style={{ color: remainingAmount > 0 ? '#f44336' : '#4caf50' }}>₺{remainingAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment mode toggle buttons */}
              {totalAmount > 0 && (
                <div style={{ padding: '0 20px 12px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { mode: 'full' as const, label: 'Tamamı' },
                      { mode: 'itemized' as const, label: 'Ürün Seç' },
                      { mode: 'custom' as const, label: 'Tutar Gir' },
                    ].map(({ mode, label }) => (
                      <button
                        key={mode}
                        onClick={() => { setPaymentMode(mode); setShowSplit(false); }}
                        style={{
                          flex: 1,
                          padding: '9px 4px',
                          borderRadius: 8,
                          border: `1.5px solid ${paymentMode === mode ? 'var(--primary)' : 'var(--outline-variant)'}`,
                          background: paymentMode === mode ? 'rgba(181,28,0,0.08)' : 'var(--surface-container-lowest)',
                          color: paymentMode === mode ? 'var(--primary)' : 'var(--on-surface-variant)',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >{label}</button>
                    ))}
                  </div>

                  {/* Custom amount input */}
                  {paymentMode === 'custom' && (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 6 }}>Ödenecek Tutar (₺)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={`Maks. ₺${remainingAmount.toFixed(2)}`}
                        value={customAmount}
                        onChange={e => setCustomAmount(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: '2px solid var(--outline-variant)',
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          outline: 'none',
                          background: 'var(--surface-container-lowest)',
                          color: 'var(--on-surface)',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── FIXED FOOTER ── */}
            {totalAmount > 0 && (
              <div style={{ padding: '16px 20px', background: 'var(--surface-container-lowest)', borderTop: '1px solid var(--surface-container-highest)', flexShrink: 0 }}>

                {/* Amount display */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                    {paymentMode === 'itemized' ? 'SEÇİLEN ÜRÜNLER' : paymentMode === 'custom' ? 'GİRİLEN TUTAR' : showSplit ? `${splitCount} KİŞİLİK PAY` : 'ÖDENECEK'}
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: amountToPay > 0 ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>
                    ₺{amountToPay.toFixed(2)}
                  </div>
                </div>

                {/* Böl button (only on 'full' mode) */}
                {paymentMode === 'full' && (
                  <div style={{ marginBottom: 12 }}>
                    {!showSplit ? (
                      <button
                        onClick={() => setShowSplit(true)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: 10,
                          border: '1.5px dashed var(--outline-variant)',
                          background: 'transparent',
                          color: 'var(--on-surface-variant)',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>call_split</span>
                        Böl
                      </button>
                    ) : (
                      <div style={{ background: 'var(--surface-container-low)', borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Kaç kişiye bölünsün?</span>
                          <button onClick={() => setShowSplit(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>İptal</button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
                          <button
                            onClick={() => setSplitCount(c => Math.max(2, c - 1))}
                            style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--surface-container-highest)', fontWeight: 800, fontSize: '1.25rem', cursor: 'pointer' }}
                          >−</button>
                          <span style={{ fontSize: '1.5rem', fontWeight: 800, minWidth: 32, textAlign: 'center' }}>{splitCount}</span>
                          <button
                            onClick={() => setSplitCount(c => c + 1)}
                            style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: '1.25rem', cursor: 'pointer' }}
                          >+</button>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                          Kişi başı: <strong>₺{(totalAmount / splitCount).toFixed(2)}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Cash / Card buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    disabled={isProcessing || amountToPay <= 0}
                    onClick={() => handlePayment('cash')}
                    style={{
                      background: '#4caf50', color: '#fff', border: 'none', borderRadius: 10,
                      padding: '14px', fontWeight: 800, fontSize: '0.9375rem', cursor: 'pointer',
                      opacity: isProcessing || amountToPay <= 0 ? 0.45 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>
                    NAKİT
                  </button>
                  <button
                    disabled={isProcessing || amountToPay <= 0}
                    onClick={() => handlePayment('credit_card')}
                    style={{
                      background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10,
                      padding: '14px', fontWeight: 800, fontSize: '0.9375rem', cursor: 'pointer',
                      opacity: isProcessing || amountToPay <= 0 ? 0.45 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>credit_card</span>
                    KART
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .cashier-main-container { flex-direction: column; overflow-y: auto !important; }
          .cashier-detail-panel { width: 100% !important; border-left: none !important; border-top: 1px solid var(--surface-container-highest); flex: none !important; }
          .hide-mobile { display: none; }
        }
      `}</style>
    </div>
  );
}
