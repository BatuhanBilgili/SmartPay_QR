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
  const [saveMsg, setSaveMsg] = useState('');

  const [showTableModal, setShowTableModal] = useState(false);
  const [tableForm, setTableForm] = useState({ id: '', tableNumber: '', label: '' });

  // ── Delete confirmation toast ──
  const [deleteTarget, setDeleteTarget] = useState<TableModel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      setSaveMsg('Ayarlar kaydedildi.');
      setTimeout(() => setSaveMsg(''), 3000);
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

  const confirmDelete = (table: TableModel) => {
    setDeleteTarget(table);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await fetch('/api/admin/tables', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'table', id: deleteTarget.id }),
      });
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const openNewTable = () => {
    setTableForm({ id: '', tableNumber: (tables.length + 1).toString(), label: '' });
    setShowTableModal(true);
  };

  const printQRs = () => {
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

      {/* Add / Edit Table Modal */}
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
               <div className="login-field" style={{ margin: 0, marginTop: 16 }}><label className="login-label">Etiket (İsteğe bağlı, Örn: Bahçe, 1. Kat)</label><input className="login-input" value={tableForm.label} onChange={(e) => setTableForm({...tableForm, label: e.target.value})} /></div>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 16 }}>
                {saveMsg && (
                  <span style={{ fontSize: '0.875rem', color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>check_circle</span>
                    {saveMsg}
                  </span>
                )}
                <button type="submit" className="login-btn" style={{ width: 'auto', padding: '12px 32px' }}>Değişiklikleri Kaydet</button>
              </div>
            </form>
          </div>

          {/* Masa ve QR Kodlar */}
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

             <div style={{ flex: 1, maxHeight: 280, overflowY: 'auto', marginBottom: 16, border: '1px solid var(--outline-variant)', borderRadius: 12 }}>
               <table className="zr-modal-table">
                 <thead style={{ position: 'sticky', top: 0, background: '#fff' }}>
                    <tr><th>No</th><th>Etiket</th><th style={{ textAlign: 'right' }}>İşlem</th></tr>
                 </thead>
                 <tbody>
                    {tables.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--on-surface-variant)' }}>Henüz masa eklenmemiş.</td></tr>
                    ) : (
                      tables.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 800 }}>{t.tableNumber}</td>
                          <td style={{ color: t.label ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>{t.label || '—'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => confirmDelete(t)}
                              title="Masayı Sil"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#ef4444',
                                padding: '4px 6px',
                                borderRadius: 8,
                                transition: 'background 0.2s',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
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

      {/* ── Delete Confirmation Toast ── */}
      {deleteTarget && (
        <div className="admin-toast-overlay">
          <div className="admin-toast">
            <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '2rem', flexShrink: 0 }}>delete_forever</span>
            <div className="admin-toast-message">
              <div>
                <strong>Masa {deleteTarget.tableNumber}</strong>
                {deleteTarget.label ? ` (${deleteTarget.label})` : ''} silinsin mi?
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.75, marginTop: 4 }}>
                Bu işlem geri alınamaz. Masaya ait aktif oturumlar ve QR kodlar da geçersiz olacaktır.
              </div>
            </div>
            <div className="admin-toast-actions">
              <button
                className="admin-toast-btn admin-toast-btn--cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Vazgeç
              </button>
              <button
                className="admin-toast-btn admin-toast-btn--confirm"
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                style={{ background: '#ef4444' }}
              >
                {isDeleting ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
