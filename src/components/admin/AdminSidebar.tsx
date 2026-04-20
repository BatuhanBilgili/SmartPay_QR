'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import './AdminSidebar.css';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('admin_role');
    if (role !== 'owner' && role !== 'admin') {
      router.push('/admin');
    }
  }, [router]);

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_user');
    router.push('/admin');
  };

  const navItems = [
    { name: 'Anasayfa',      href: '/admin/dashboard',              icon: 'dashboard' },
    { name: 'Personel',      href: '/admin/dashboard/personnel',    icon: 'badge' },
    { name: 'Menü Ayarları', href: '/admin/dashboard/menu',         icon: 'restaurant_menu' },
    { name: 'Ayarlar',       href: '/admin/dashboard/settings',     icon: 'settings' },
  ];

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>qr_code</span>
        </div>
        <span className="brand-text">SmartPay QR</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="sidebar-logout">
          <span className="material-symbols-outlined">logout</span>
          Çıkış Yap
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile Top Bar (< 1024px) ── */}
      <div className="sidebar-mobile-bar">
        <div className="sidebar-mobile-brand">
          <div className="sidebar-mobile-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>qr_code</span>
          </div>
          <span className="sidebar-mobile-text">SmartPay QR</span>
        </div>
        <button
          className="sidebar-hamburger"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Menüyü Aç/Kapat"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
            {menuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* ── Backdrop overlay (mobile only) ── */}
      {menuOpen && (
        <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar${menuOpen ? ' admin-sidebar--open' : ''}`}>
        <SidebarContent />
      </aside>
    </>
  );
}
