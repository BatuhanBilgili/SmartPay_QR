'use client';

import { useState, useEffect } from 'react';
import '../dashboard.css';

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  price: string | number;
  imageUrl: string | null;
  isAvailable: boolean;
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('ALL');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [itemForm, setItemForm] = useState({ id: '', name: '', price: '', categoryId: '', imageUrl: '', isAvailable: true });
  const [catForm, setCatForm] = useState({ id: '', name: '', isActive: true });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/menu');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.categories);
        setItems(data.data.items);
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

  const handlePriceBlur = async (id: string, newPrice: string) => {
    await fetch('/api/admin/menu', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'item', id, price: newPrice }),
    });
    fetchData();
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = itemForm.id ? 'PATCH' : 'POST';
    await fetch('/api/admin/menu', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'item', ...itemForm }),
    });
    setShowItemModal(false);
    fetchData();
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = catForm.id ? 'PATCH' : 'POST';
    await fetch('/api/admin/menu', {
       method,
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ action: 'category', ...catForm }),
    });
    setShowCatModal(false);
    fetchData();
  };

  const openNewItem = () => {
    setItemForm({ id: '', name: '', price: '', categoryId: categories[0]?.id || '', imageUrl: '', isAvailable: true });
    setShowItemModal(true);
  };
  
  const editItem = (i: MenuItem) => {
    setItemForm({ id: i.id, name: i.name, price: i.price.toString(), categoryId: i.categoryId, imageUrl: i.imageUrl || '', isAvailable: i.isAvailable });
    setShowItemModal(true);
  };

  const filteredItems = selectedCat === 'ALL' ? items : items.filter((i) => i.categoryId === selectedCat);

  return (
    <main className="admin-main">
      <div className="admin-page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="admin-page-title">Menü Ayarları</h1>
          <p className="admin-page-subtitle">Kategorileri belirleyin, ürünlerin fiyatlarını hızlıca güncelleyin.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="dash-z-btn" onClick={() => { setCatForm({ id: '', name: '', isActive: true }); setShowCatModal(true); }} style={{ background: 'var(--surface-container-highest)', color: 'var(--on-surface)' }}>
            <span className="material-symbols-outlined">category</span>
            Yeni Kategori
          </button>
          <button className="dash-z-btn" onClick={openNewItem}>
            <span className="material-symbols-outlined">add</span>
            Yeni Ürün Ekle
          </button>
        </div>
      </div>

      {showCatModal && (
        <div className="dash-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCatModal(false); }}>
          <div className="dash-modal" style={{ maxWidth: 400 }}>
            <div className="dash-modal-header">
              <h2>Kategori Ekle</h2>
              <button className="dash-modal-close" onClick={() => setShowCatModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="dash-modal-body">
              <form onSubmit={saveCategory}>
                 <div className="login-field"><label className="login-label">Kategori Adı</label><input required className="login-input" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} /></div>
                 <button type="submit" className="login-btn">Ekle</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showItemModal && (
        <div className="dash-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowItemModal(false); }}>
           <div className="dash-modal" style={{ maxWidth: 500 }}>
             <div className="dash-modal-header">
               <h2>{itemForm.id ? 'Ürünü Düzenle' : 'Yeni Ürün'}</h2>
               <button className="dash-modal-close" onClick={() => setShowItemModal(false)}>
                 <span className="material-symbols-outlined">close</span>
               </button>
             </div>
             <div className="dash-modal-body">
               <form onSubmit={saveItem} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                 <div className="login-field" style={{ margin: 0 }}><label className="login-label">Ürün Adı</label><input required className="login-input" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></div>
                 <div className="login-field" style={{ margin: 0 }}><label className="login-label">Kategori</label>
                   <select required className="login-input" value={itemForm.categoryId} onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}>
                     <option value="" disabled>Seçiniz</option>
                     {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                 </div>
                 <div className="login-field" style={{ margin: 0 }}><label className="login-label">Fiyat (₺)</label><input required type="number" step="0.01" className="login-input" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} /></div>
                 <div className="login-field" style={{ margin: 0 }}>
                    <label className="login-label">Görsel (URL veya Emoji)</label>
                    <input className="login-input" placeholder="🍔 veya https://i.ibb.co/..." value={itemForm.imageUrl} onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })} />
                    <p style={{ fontSize: '0.75rem', marginTop: 8, color: 'var(--on-surface-variant)' }}>
                      Ücretsiz resim yüklemek için <a href="https://postimages.org/" target="_blank" style={{ color: 'var(--primary)', fontWeight: 700 }}>PostImages</a> kullanabilir ve Doğrudan Bağlantıyı (Direct Link) yapıştırabilirsiniz.
                    </p>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={itemForm.isAvailable} onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })} style={{ width: 20, height: 20, accentColor: 'var(--primary)' }} />
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Menüde Aktif Göster</label>
                 </div>
                 <button type="submit" className="login-btn">Kaydet</button>
               </form>
             </div>
           </div>
        </div>
      )}

      <div className="dash-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <p className="dash-card-title" style={{ margin: 0 }}>
            <span className="material-symbols-outlined">restaurant_menu</span>
            Ürün Listesi
          </p>
          <select 
            className="login-input" 
            style={{ width: 'auto', padding: '8px 16px', margin: 0 }}
            value={selectedCat} 
            onChange={(e) => setSelectedCat(e.target.value)}
          >
            <option value="ALL">Tüm Kategoriler</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="zr-table-wrapper">
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Yükleniyor...</div>
          ) : (
            <table className="zr-modal-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Görsel</th>
                  <th>Ürün Adı</th>
                  <th>Kategori</th>
                  <th>Drm</th>
                  <th>Değiştirilebilir Fiyat</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#666' }}>Ürün bulunamadı.</td></tr>
                ) : (
                  filteredItems.map((item) => {
                    const cat = categories.find(c => c.id === item.categoryId);
                    return (
                      <tr key={item.id} style={{ opacity: item.isAvailable ? 1 : 0.5 }}>
                        <td data-label="Görsel" style={{ fontSize: '1.5rem', textAlign: 'center' }}>
                          {item.imageUrl?.startsWith('http') ? (
                            <img src={item.imageUrl} alt={item.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 8 }} />
                          ) : (
                            item.imageUrl || '🍲'
                          )}
                        </td>
                        <td data-label="Ürün Adı" style={{ fontWeight: 600 }}>{item.name}</td>
                        <td data-label="Kategori">
                          <span style={{ background: 'rgba(0,0,0,0.05)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {cat?.name || 'Bilinmiyor'}
                          </span>
                        </td>
                        <td data-label="Drm">
                           <button onClick={async () => {
                             await fetch('/api/admin/menu', { method: 'PATCH', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ action: 'item', id: item.id, isAvailable: !item.isAvailable }) });
                             fetchData();
                           }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, color: item.isAvailable ? '#16a34a' : '#ef4444' }}>
                             {item.isAvailable ? 'Açık' : 'Tükendi'}
                           </button>
                        </td>
                        <td data-label="Fiyat">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700 }}>₺</span>
                            <input 
                              type="number"
                              step="0.01"
                              defaultValue={item.price as number}
                              onBlur={(e) => handlePriceBlur(item.id, e.target.value)}
                              style={{ width: 80, padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--outline-variant)', fontWeight: 600 }} 
                            />
                          </div>
                        </td>
                        <td data-label="İşlemler" style={{ textAlign: 'right' }}>
                          <button onClick={() => editItem(item)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                            Düzenle
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
