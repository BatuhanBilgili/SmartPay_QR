'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import './AdminSidebar.css';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem('admin_role');
    if (role !== 'owner' && role !== 'admin') {
      router.push('/admin');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_user');
    router.push('/admin');
  };

  const navItems = [
    { name: 'Anasayfa', href: '/admin/dashboard', icon: 'dashboard' },
    { name: 'Personel', href: '/admin/dashboard/personnel', icon: 'badge' },
    { name: 'Menü Ayarları', href: '/admin/dashboard/menu', icon: 'restaurant_menu' },
    { name: 'Ayarlar', href: '/admin/dashboard/settings', icon: 'settings' },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <span className="material-symbols-outlined brand-icon">restaurant</span>
        <span className="brand-text">SmartPay QR</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="sidebar-logout">
          <span className="material-symbols-outlined">logout</span>
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
