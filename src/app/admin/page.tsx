'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './admin.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Şimdilik sabit kullanıcılar (DB entegrasyonu sonra yapılacak)
    const users: Record<string, { password: string; role: string }> = {
      garson: { password: 'garson123', role: 'waiter' },
      mutfak: { password: 'mutfak123', role: 'kitchen' },
    };

    await new Promise((r) => setTimeout(r, 600)); // Simülasyon

    const user = users[username.toLowerCase()];
    if (user && user.password === password) {
      // Cookie/localStorage ile oturum simülasyonu
      localStorage.setItem('admin_role', user.role);
      localStorage.setItem('admin_user', username);
      router.push(`/admin/${user.role}`);
    } else {
      setError('Kullanıcı adı veya şifre hatalı.');
    }

    setIsLoading(false);
  };

  return (
    <div className="admin-body">
      <div className="login-container">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-brand">
            <div className="login-brand-icon">
              <span className="material-symbols-outlined">restaurant</span>
            </div>
            <span className="login-brand-text">The Culinary Editorial</span>
          </div>

          <h1 className="login-title">Giriş Yap</h1>
          <p className="login-subtitle">Yönetim paneline erişmek için bilgilerinizi girin.</p>

          {error && (
            <div className="login-error">
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>error</span>
              {error}
            </div>
          )}

          <div className="login-field">
            <label className="login-label" htmlFor="username">Kullanıcı Adı</label>
            <input
              id="username"
              className="login-input"
              type="text"
              placeholder="garson veya mutfak"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="password">Şifre</label>
            <input
              id="password"
              className="login-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button className="login-btn" type="submit" disabled={isLoading}>
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
