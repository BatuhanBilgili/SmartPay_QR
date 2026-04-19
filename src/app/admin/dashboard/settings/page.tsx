'use client';

import { useState, useEffect } from 'react';
import '../dashboard.css';

interface TableModel {
  id: string;
  tableNumber: number;
  label: string | null;
}

export default function SettingsPage() {
  const [tables, setTables] = useState<TableModel[]>([]);
  const [restaurant, setRestaurant] = useState({ id: '', name: '', address: '' });
  const [isLoading, setIsLoading] = useState(true);
  
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableForm, setTableForm] = useState({ id: '', tableNumber: '', label: '' });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/tables');
      const data = await res.json();
      if (data.success) {
        setTables(data.data.tables);
        if (data.data.restaurant) {
          setRestaurant({ id: data.data.restaurant.id, name: data.data.restaurant.name, address: data.data.restaurant.address || '' });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restaurant', ...restaurant }),
      });
      alert('Ayarlar kaydedildi.');
    } catch (err) {
      console.error(err);
    }
  };

  const saveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = tableForm.id ? 'PATCH' : 'POST';
    await fetch('/api/admin/tables', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'table', ...tableForm }),
    });
    setShowTableModal(false);
    fetchData();
  };

  const deleteTable = async (id: string) => {
    if (!confirm('Emin misiniz?')) return;
    await fetch('/api/admin/tables', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'table', id }),
    });
    fetchData();
  };

  const openNewTable = () => {
    setTableForm({ id: '', tableNumber: (tables.length + 1).toString(), label: '' });
    setShowTableModal(true);
  };

  const printQRs = () => {
    // Generate simple printable HTML page for all QR codes
    // Normally we would use an actual QR library like qrcode to convert URLs to base64 images here.
    // For demo purposes, we will use a generic public api or just the google chart api.
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    
    let qrCards = tables.map(t => {
      const tableUrl = `${baseUrl}/?table=${t.id}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tableUrl)}`;
      
      return `
        <div style="border: 2px dashed #ccc; padding: 24px; text-align: center; border-radius: 16px; margin-bottom: 24px; page-break-inside: avoid;">
           <img src="${qrImageUrl}" style="width: 200px; height: 200px;" />
           <h2 style="font-family: sans-serif; font-size: 24px; font-weight: 900; margin: 16px 0 4px;">MASA ${t.tableNumber}</h2>
           <p style="font-family: sans-serif; color: #555; margin: 0; font-size: 14px;">${t.label || restaurant.name}</p>
        </div>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Masa QR Kodları</title>
          <style>
            body { font-family: sans-serif; padding: 40px; margin: 0; display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; }
            @media print { body { padding: 0; } }
            div { width: 300px; }
          </style>
        </head>
        <body onload="setTimeout(() => window.print(), 1000)">
          ${qrCards.length > 0 ? qrCards : '<h3>Önce masa eklemelisiniz.</h3>'}
        </body>
      </html>
    `;
    
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <main className="admin-main">
      <div className="admin-page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="admin-page-title">Genel Ayarlar</h1>
          <p className="admin-page-subtitle">Restoranınızın genel kurallarını ve masalarını yönetin.</p>
        </div>
      </div>

      {showTableModal && (
        <div className="dash-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowTableModal(false); }}>
          <div className="dash-modal" style={{ maxWidth: 400 }}>
             <div className="dash-modal-header">
               <h2>{tableForm.id ? 'Masa Düzenle' : 'Yeni Masa Ekle'}</h2>
               <button className="dash-modal-close" onClick={() => setShowTableModal(false)}>
                 <span className="material-symbols-outlined">close</span>
               </button>
             </div>
             <form onSubmit={saveTable} className="dash-modal-body">
               <div className="login-field" style={{ margin: 0 }}><label className="login-label">Masa Numarası</label><input required type="number" className="login-input" value={tableForm.tableNumber} onChange={(e) => setTableForm({...tableForm, tableNumber: e.target.value})} /></div>
               <div className="login-field" style={{ margin: 0, marginTop: 16 }}><label className="login-label">Etiket (İsteğe bağlı, Örn: Bahçe)</label><input className="login-input" value={tableForm.label} onChange={(e) => setTableForm({...tableForm, label: e.target.value})} /></div>
               <button type="submit" className="login-btn" style={{ marginTop: 24 }}>Kaydet</button>
             </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>Yükleniyor...</div>
      ) : (
        <div className="bento-grid">
          {/* İşletme Bilgileri */}
          <div className="dash-card bento-span-7">
            <p className="dash-card-title">
              <span className="material-symbols-outlined">storefront</span>
              İşletme Bilgileri
            </p>
            <form onSubmit={saveRestaurant} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="login-field" style={{ margin: 0 }}>
                <label className="login-label">Restoran Adı</label>
                <input required className="login-input" value={restaurant.name} onChange={(e) => setRestaurant({...restaurant, name: e.target.value})} />
              </div>
              <div className="login-field" style={{ margin: 0 }}>
                <label className="login-label">Adres / Konum</label>
                <textarea className="login-input" rows={3} value={restaurant.address} onChange={(e) => setRestaurant({...restaurant, address: e.target.value})}></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                 <button type="submit" className="login-btn" style={{ width: 'auto', padding: '12px 32px' }}>Değişiklikleri Kaydet</button>
              </div>
            </form>
          </div>

          <div className="dash-card bento-span-5" style={{ display: 'flex', flexDirection: 'column' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
               <p className="dash-card-title" style={{ margin: 0 }}>
                <span className="material-symbols-outlined">qr_code_2</span>
                Masa ve QR Kodlar
               </p>
               <button className="dash-z-btn" onClick={openNewTable} style={{ background: 'var(--surface-container-highest)', color: 'var(--on-surface)' }}>
                 <span className="material-symbols-outlined">add</span> Masa Ekle
               </button>
             </div>
             
             <div style={{ flex: 1, maxHeight: 250, overflowY: 'auto', marginBottom: 16, border: '1px solid var(--outline-variant)', borderRadius: 12 }}>
               <table className="zr-modal-table">
                 <thead style={{ position: 'sticky', top: 0, background: '#fff' }}>
                    <tr><th>No</th><th>Etiket</th><th style={{ textAlign: 'right' }}>İşlem</th></tr>
                 </thead>
                 <tbody>
                    {tables.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 800 }}>{t.tableNumber}</td>
                        <td>{t.label || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => deleteTable(t.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span></button>
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>

             <button className="dash-z-btn" onClick={printQRs} style={{ width: '100%', justifyContent: 'center' }}>
               <span className="material-symbols-outlined">print</span>
               Tüm QR Kodları İndir / Yazdır
             </button>
          </div>
        </div>
      )}
    </main>
  );
}
