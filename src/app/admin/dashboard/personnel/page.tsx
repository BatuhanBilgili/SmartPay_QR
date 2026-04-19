'use client';

import { useState, useEffect } from 'react';
import '../dashboard.css';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  isActive: boolean;
}

export default function PersonnelPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', username: '', role: 'waiter', password: '' });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/personnel');
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = formData.id ? 'PATCH' : 'POST';
      const res = await fetch('/api/admin/personnel', {
         method,
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchUsers();
      } else {
        alert('Hata: ' + data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await fetch('/api/admin/personnel', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !currentStatus }),
    });
    fetchUsers();
  };

  const editUser = (u: User) => {
    setFormData({ id: u.id, name: u.name, username: u.username, role: u.role, password: '' });
    setShowModal(true);
  };

  return (
    <main className="admin-main">
      <div className="admin-page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="admin-page-title">Personel Yönetimi</h1>
          <p className="admin-page-subtitle">Garson ve Mutfağa özel giriş hesapları oluşturun.</p>
        </div>
        <button className="dash-z-btn" onClick={() => { setFormData({ id: '', name: '', username: '', role: 'waiter', password: '' }); setShowModal(true); }}>
          <span className="material-symbols-outlined">add</span>
          Yeni Personel Ekle
        </button>
      </div>

      <div className="dash-card">
        <p className="dash-card-title">
          <span className="material-symbols-outlined">badge</span>
          Personel Listesi
        </p>
        <div className="zr-table-wrapper">
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Yükleniyor...</div>
          ) : (
            <table className="zr-modal-table">
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>Kullanıcı Adı</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--on-surface-variant)' }}>Kayıtlı personel bulunamadı.</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 600 }}>{user.name}</td>
                      <td>{user.username}</td>
                      <td>
                        <span style={{ 
                          background: user.role === 'waiter' ? '#e0f2fe' : (user.role === 'kitchen' ? '#fef3c7' : '#f3e8ff'),
                          color: user.role === 'waiter' ? '#0284c7' : (user.role === 'kitchen' ? '#d97706' : '#7e22ce'),
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {user.role === 'waiter' ? 'GARSON' : (user.role === 'kitchen' ? 'MUTFAK' : 'ADMIN')}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => toggleStatus(user.id, user.isActive)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                          {user.isActive ? (
                            <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.875rem' }}>Aktif</span>
                          ) : (
                            <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.875rem' }}>Pasif</span>
                          )}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => editUser(user)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                          Düzenle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="dash-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="dash-modal" style={{ maxWidth: 400 }}>
            <div className="dash-modal-header">
              <h2 className="dash-modal-title">{formData.id ? 'Personel Düzenle' : 'Yeni Personel Ekle'}</h2>
              <button className="dash-modal-close" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="dash-modal-body">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="login-field" style={{ margin: 0 }}>
                  <label className="login-label">Ad Soyad</label>
                  <input required className="login-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="login-field" style={{ margin: 0 }}>
                  <label className="login-label">Kullanıcı Adı</label>
                  <input required={!formData.id} disabled={!!formData.id} className="login-input" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                </div>
                <div className="login-field" style={{ margin: 0 }}>
                  <label className="login-label">Şifre {formData.id && '(Değiştirmek istemiyorsanız boş bırakın)'}</label>
                  <input type="password" required={!formData.id} className="login-input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                </div>
                <div className="login-field" style={{ margin: 0 }}>
                  <label className="login-label">Rol</label>
                  <select className="login-input" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    <option value="waiter">Garson</option>
                    <option value="kitchen">Mutfak</option>
                    <option value="owner">Admin</option>
                  </select>
                </div>
                <button type="submit" className="login-btn">Kaydet</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
