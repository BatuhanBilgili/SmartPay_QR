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

  // Tabs: 'full' | 'equal' | 'itemized'
  const [paymentType, setPaymentType] = useState<'full' | 'equal' | 'itemized'>('full');

  // Equal Split State
  const [splitCount, setSplitCount] = useState<number>(2);

  // Itemized Split State: { [orderItemId]: quantityToPay }
  const [itemSelections, setItemSelections] = useState<Record<string, number>>({});

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cashier/tables');
      const data = await res.json();
      if (data.success) {
        setTables(data.data);
      }
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

  const getTableStatusColor = (table: TableData) => {
    if (!table.session) return 'var(--surface-container-high)'; // Empty
    const total = parseFloat(table.session.totalAmount);
    const paid = parseFloat(table.session.paidAmount);
    if (paid >= total && total > 0) return '#4caf50';
    if (paid > 0) return '#ff9800';
    return '#f44336';
  };

  const selectedTable = tables.find(t => t.id === selectedTableId) || null;
  const session = selectedTable?.session;
  const totalAmount = session ? parseFloat(session.totalAmount) : 0;
  const paidAmount = session ? parseFloat(session.paidAmount) : 0;
  const remainingAmount = totalAmount - paidAmount;

  // Calculate amount to pay based on current tab
  let calculatedAmountToPay = 0;
  if (paymentType === 'full') {
    calculatedAmountToPay = remainingAmount;
  } else if (paymentType === 'equal') {
    calculatedAmountToPay = totalAmount / splitCount;
    if (calculatedAmountToPay > remainingAmount) {
      calculatedAmountToPay = remainingAmount;
    }
  } else if (paymentType === 'itemized') {
    if (selectedTable) {
      let sum = 0;
      selectedTable.orders.forEach(order => {
        order.items.forEach(item => {
          const qty = itemSelections[item.id] || 0;
          if (qty > 0) {
             const unitPrice = parseFloat(item.unitPrice);
             sum += qty * unitPrice;
          }
        });
      });
      calculatedAmountToPay = sum;
    }
  }

  const handlePayment = async (method: 'cash' | 'credit_card') => {
    if (!session) return;
    
    if (calculatedAmountToPay <= 0) {
      alert('Ödenecek tutar 0 olamaz.');
      return;
    }

    setIsProcessing(true);
    try {
      const itemsPayload = Object.entries(itemSelections)
        .filter(([id, qty]) => qty > 0)
        .map(([id, qty]) => ({ id, paidQuantity: qty }));

      const res = await fetch('/api/admin/cashier/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          amount: calculatedAmountToPay,
          method,
          paymentType,
          items: itemsPayload
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data.isFullyPaid) {
          setSelectedTableId(null);
        }
        setItemSelections({});
        setPaymentType('full');
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

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Yükleniyor...</div>;
  }

  const activeSessions = tables.filter(t => t.session !== null);
  const totalOpenRevenue = activeSessions.reduce((sum, t) => sum + parseFloat(t.session!.totalAmount), 0);
  const totalCollected = activeSessions.reduce((sum, t) => sum + parseFloat(t.session!.paidAmount), 0);

  return (
    <div className="admin-body" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <header className="admin-header" style={{ padding: '0 24px', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--primary)' }}>point_of_sale</span>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--on-surface)' }}>Kasa Paneli</h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }} className="hide-mobile">
            <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>TOPLAM AÇIK</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--on-surface)' }}>₺{totalOpenRevenue.toFixed(0)}</div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span>
            Çıkış
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }} className="cashier-main-container">
        
        {/* LEFT: Tables Grid */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: 'var(--surface-container-lowest)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            {tables.map(table => {
              const bg = getTableStatusColor(table);
              const isEmpty = !table.session;
              const tTotal = table.session ? parseFloat(table.session.totalAmount) : 0;
              const tPaid = table.session ? parseFloat(table.session.paidAmount) : 0;
              const tRemaining = tTotal - tPaid;
              const isSelected = selectedTableId === table.id;

              return (
                <div 
                  key={table.id}
                  onClick={() => {
                    if (!isEmpty) {
                      setSelectedTableId(table.id);
                      setItemSelections({});
                      setPaymentType('full');
                    }
                  }}
                  style={{
                    background: isSelected ? 'var(--primary-container)' : 'var(--surface-container-low)',
                    border: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                    borderRadius: '12px',
                    padding: '12px',
                    cursor: isEmpty ? 'default' : 'pointer',
                    opacity: isEmpty ? 0.5 : 1,
                    transition: 'all 0.2s',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800 }}>Masa {table.tableNumber}</span>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: bg }}></div>
                  </div>
                  
                  {!isEmpty && (
                    <div style={{ fontSize: '0.8125rem' }}>
                       <div style={{ color: tRemaining > 0 ? '#f44336' : '#4caf50', fontWeight: 800 }}>₺{tRemaining.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Detail & Payment Panel */}
        {selectedTable && session && (
          <div 
            style={{ 
              width: '400px', 
              background: 'var(--surface-container-low)', 
              display: 'flex', 
              flexDirection: 'column', 
              borderLeft: '1px solid var(--surface-container-highest)',
              zIndex: 20
            }} 
            className="cashier-detail-panel"
          >
            {/* PANEL HEADER */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--surface-container-highest)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
               <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Masa {selectedTable.tableNumber}</h2>
               <button onClick={() => setSelectedTableId(null)} style={{ background: 'none', border: 'none', color: 'var(--on-surface)', cursor: 'pointer' }}>
                 <span className="material-symbols-outlined">close</span>
               </button>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              
              {/* Product Summary */}
              <div style={{ padding: '16px 20px', background: 'var(--surface-container-lowest)', borderBottom: '1px solid var(--surface-container-highest)' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)', marginBottom: '12px', textTransform: 'uppercase' }}>Sipariş Özeti</h3>
                {selectedTable.orders.map(order => (
                  <div key={order.id} style={{ marginBottom: '8px' }}>
                    {order.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
                        <span>{item.quantity}x {item.menuItem?.name || item.name}</span>
                        <span>₺{parseFloat(item.totalPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px dotted var(--surface-container-highest)', fontWeight: 800 }}>
                  <span>TOPLAM</span>
                  <span>₺{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-container-highest)' }}>
                <button onClick={() => setPaymentType('full')} style={{ flex: 1, padding: '12px', border: 'none', borderBottom: paymentType === 'full' ? '2px solid var(--primary)' : 'none', background: 'none', fontWeight: 700, cursor: 'pointer', color: paymentType === 'full' ? 'var(--primary)' : 'inherit' }}>TAMAMI</button>
                <button onClick={() => setPaymentType('equal')} style={{ flex: 1, padding: '12px', border: 'none', borderBottom: paymentType === 'equal' ? '2px solid var(--primary)' : 'none', background: 'none', fontWeight: 700, cursor: 'pointer', color: paymentType === 'equal' ? 'var(--primary)' : 'inherit' }}>BÖL</button>
                <button onClick={() => setPaymentType('itemized')} style={{ flex: 1, padding: '12px', border: 'none', borderBottom: paymentType === 'itemized' ? '2px solid var(--primary)' : 'none', background: 'none', fontWeight: 700, cursor: 'pointer', color: paymentType === 'itemized' ? 'var(--primary)' : 'inherit' }}>ÜRÜN</button>
              </div>

              {/* Mode Specifics */}
              <div style={{ padding: '20px' }}>
                {paymentType === 'equal' && (
                   <div style={{ textAlign: 'center' }}>
                     <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
                       <button onClick={() => setSplitCount(Math.max(2, splitCount - 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--surface-container-highest)' }}>-</button>
                       <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{splitCount}</span>
                       <button onClick={() => setSplitCount(splitCount + 1)} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--surface-container-highest)' }}>+</button>
                     </div>
                     <div style={{ background: 'var(--surface-container-lowest)', padding: '12px', borderRadius: '8px' }}>
                       <div style={{ fontSize: '0.75rem' }}>Kişi Başı</div>
                       <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>₺{(totalAmount / splitCount).toFixed(2)}</div>
                     </div>
                   </div>
                )}

                {paymentType === 'itemized' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedTable.orders.map(order => 
                      order.items.map(item => {
                        const availableQty = item.quantity - (item.paidQuantity || 0);
                        if (availableQty <= 0) return null;
                        const sQty = itemSelections[item.id] || 0;
                        return (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-lowest)', padding: '10px', borderRadius: '10px' }}>
                             <div style={{ fontSize: '0.8125rem' }}>{item.menuItem?.name || item.name} ({availableQty})</div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                               <button onClick={() => handleItemQtyChange(item.id, availableQty, -1)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'var(--surface-container-highest)' }}>-</button>
                               <span style={{ fontWeight: 800 }}>{sQty}</span>
                               <button onClick={() => handleItemQtyChange(item.id, availableQty, 1)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'var(--surface-container-highest)' }}>+</button>
                             </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

                {paymentType === 'full' && (
                   <div style={{ textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>Tüm borç tek seferde kapatılacak.</div>
                )}
              </div>

            </div>

            {/* FIXED FOOTER */}
            <div style={{ padding: '20px', background: 'var(--surface-container-lowest)', borderTop: '1px solid var(--surface-container-highest)', flexShrink: 0 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-end' }}>
                 <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>ÖDENECEK</div>
                 <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>₺{calculatedAmountToPay.toFixed(2)}</div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                 <button 
                   disabled={isProcessing || calculatedAmountToPay <= 0}
                   onClick={() => handlePayment('cash')}
                   style={{ background: '#4caf50', color: 'white', border: 'none', borderRadius: '10px', padding: '14px', fontWeight: 800, cursor: 'pointer', opacity: (isProcessing || calculatedAmountToPay <= 0) ? 0.5 : 1 }}
                 >
                   NAKİT
                 </button>
                 <button 
                   disabled={isProcessing || calculatedAmountToPay <= 0}
                   onClick={() => handlePayment('credit_card')}
                   style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px', fontWeight: 800, cursor: 'pointer', opacity: (isProcessing || calculatedAmountToPay <= 0) ? 0.5 : 1 }}
                 >
                   KART
                 </button>
               </div>
            </div>

          </div>
        )}

      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .cashier-main-container {
            flex-direction: column;
            overflow-y: auto !important;
          }
          .cashier-detail-panel {
            width: 100% !important;
            border-left: none !important;
            border-top: 1px solid var(--surface-container-highest);
            flex: none !important;
          }
          .hide-mobile {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
