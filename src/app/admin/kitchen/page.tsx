'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import '../admin.css';

type NavTab = 'dashboard' | 'orders' | 'menu' | 'staff' | 'settings';

export default function KitchenPanelPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileNavTab, setMobileNavTab] = useState<string>('menu');

  useEffect(() => {
    const role = localStorage.getItem('admin_role');
    if (role !== 'kitchen') {
      router.push('/admin');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_user');
    router.push('/admin');
  };

  return (
    <div className="admin-body">
      {/* ── Top App Bar ── */}
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <span className="admin-menu-btn material-symbols-outlined">menu</span>
          <span className="admin-topbar-brand">The Culinary Editorial</span>
        </div>
        <div className="admin-topbar-right">
          <nav className="admin-topbar-nav">
            <a className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Dashboard</a>
            <a className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Live Orders</a>
            <a className={activeTab === 'staff' ? 'active' : ''} onClick={() => setActiveTab('staff')}>Kitchen Status</a>
          </nav>
          <div className="admin-avatar" onClick={handleLogout} title="Çıkış Yap">
            👨‍🍳
          </div>
        </div>
      </header>

      <div className="admin-layout">
        {/* ── Sidebar (Desktop) ── */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-profile">
            <div className="admin-sidebar-profile-icon" style={{ background: 'var(--primary)', boxShadow: 'var(--admin-shadow-primary)' }}>
              <span className="material-symbols-outlined" style={{ color: 'white' }}>restaurant</span>
            </div>
            <div className="admin-sidebar-profile-info">
              <p>Editorial Manager</p>
              <p>Shift: Evening</p>
            </div>
          </div>

          <nav className="admin-sidebar-nav">
            <a className={`admin-sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <span className="material-symbols-outlined">dashboard</span>
              Dashboard
            </a>
            <a className={`admin-sidebar-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              <span className="material-symbols-outlined">pending_actions</span>
              Live Orders
            </a>
            <a className={`admin-sidebar-item ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>
              <span className="material-symbols-outlined">edit_note</span>
              Menu Editor
            </a>
            <a className={`admin-sidebar-item ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
              <span className="material-symbols-outlined">badge</span>
              Staff Management
            </a>
            <a className={`admin-sidebar-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <span className="material-symbols-outlined">settings</span>
              Settings
            </a>
          </nav>
        </aside>

        {/* ── Main Content ── */}
        <main className="admin-main">
          {/* Header */}
          <section style={{ marginBottom: 48 }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--primary)', marginBottom: 8, display: 'block' }}>
              System Pulse
            </span>
            <div className="admin-page-header" style={{ marginBottom: 0 }}>
              <h2 className="admin-page-title">Kitchen Overview.</h2>
              <div className="admin-status-pill">
                <div className="admin-status-dot"></div>
                <span className="admin-status-text">Kitchen Live: 14 Stations Active</span>
              </div>
            </div>
          </section>

          {/* ── Bento Grid: Revenue + Stats ── */}
          <div className="bento-grid">
            {/* Revenue Card */}
            <div className="bento-span-8">
              <div className="admin-revenue-card">
                <div className="glow"></div>
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <p className="admin-revenue-label">Today&apos;s Revenue</p>
                  <h3 className="admin-revenue-value">₺124,825</h3>
                  <div className="admin-revenue-trend">
                    <span className="material-symbols-outlined">trending_up</span>
                    <span>+12% vs yesterday</span>
                  </div>
                </div>
                {/* Chart */}
                <div className="admin-chart-bars">
                  <div className="admin-chart-bar" style={{ height: '40%' }}></div>
                  <div className="admin-chart-bar" style={{ height: '55%' }}></div>
                  <div className="admin-chart-bar" style={{ height: '35%' }}></div>
                  <div className="admin-chart-bar" style={{ height: '70%' }}></div>
                  <div className="admin-chart-bar admin-chart-bar--active" style={{ height: '85%' }}></div>
                  <div className="admin-chart-bar" style={{ height: '60%' }}></div>
                  <div className="admin-chart-bar" style={{ height: '95%' }}></div>
                  <div className="admin-chart-bar" style={{ height: '45%' }}></div>
                </div>
              </div>
            </div>

            {/* Ticket Time + Active Orders */}
            <div className="bento-span-4">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
                {/* Ticket Time */}
                <div className="admin-ticket-card">
                  <div className="admin-ticket-header">
                    <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', fontVariationSettings: "'FILL' 1" }}>timer</span>
                    <span className="admin-ticket-urgent">URGENT</span>
                  </div>
                  <p className="admin-ticket-label">Avg. Ticket Time</p>
                  <h4 className="admin-ticket-value">14:20</h4>
                  <p className="admin-ticket-note">Slower than usual peak</p>
                </div>

                {/* Active Orders */}
                <div className="admin-orders-card">
                  <div className="admin-orders-header">
                    <p style={{ fontWeight: 700, color: 'var(--on-surface)' }}>Active Orders</p>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>restaurant</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="admin-orders-value">42</span>
                    <span className="admin-orders-label">In queue</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Popular Items + Kitchen Log ── */}
          <div className="admin-kitchen-subgrid">
            {/* Signature Performance */}
            <div className="kitchen-span-8">
              <div className="admin-performance-card">
                <div className="admin-performance-header">
                  <h4 className="admin-performance-title">Signature Performance.</h4>
                  <a className="admin-performance-link">Full Menu Analytics</a>
                </div>

                {/* Item 1 */}
                <div className="admin-perf-item">
                  <div className="admin-perf-img">
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #a3e635, #65a30d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '2rem' }}>local_dining</span>
                    </div>
                  </div>
                  <div className="admin-perf-info">
                    <div className="admin-perf-row">
                      <h5 className="admin-perf-name">Heirloom Spring Bowl</h5>
                      <span className="admin-perf-revenue">₺14,200 today</span>
                    </div>
                    <div className="admin-perf-bar">
                      <div className="admin-perf-bar-fill" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="admin-perf-item">
                  <div className="admin-perf-img">
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #fb923c, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '2rem' }}>local_pizza</span>
                    </div>
                  </div>
                  <div className="admin-perf-info">
                    <div className="admin-perf-row">
                      <h5 className="admin-perf-name">Truffle Marguerita</h5>
                      <span className="admin-perf-revenue">₺9,850 today</span>
                    </div>
                    <div className="admin-perf-bar">
                      <div className="admin-perf-bar-fill" style={{ width: '62%' }}></div>
                    </div>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="admin-perf-item">
                  <div className="admin-perf-img">
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #f87171, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '2rem' }}>restaurant</span>
                    </div>
                  </div>
                  <div className="admin-perf-info">
                    <div className="admin-perf-row">
                      <h5 className="admin-perf-name">Aged Ribeye Frites</h5>
                      <span className="admin-perf-revenue">₺8,400 today</span>
                    </div>
                    <div className="admin-perf-bar">
                      <div className="admin-perf-bar-fill" style={{ width: '48%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Kitchen Live Log */}
            <div className="kitchen-span-4">
              <div className="admin-log-card">
                <h4 className="admin-log-title">Live Kitchen Log</h4>

                <div className="admin-log-item">
                  <div className="admin-log-dot admin-log-dot--primary"></div>
                  <div>
                    <p className="admin-log-time admin-log-time--primary">19:42 · ORDER #402</p>
                    <p className="admin-log-text">Table 12: Entrées sent to station 3</p>
                  </div>
                </div>

                <div className="admin-log-item">
                  <div className="admin-log-dot admin-log-dot--neutral"></div>
                  <div>
                    <p className="admin-log-time admin-log-time--neutral">19:38 · STATUS</p>
                    <p className="admin-log-text">Pastry Chef: Shift end. No replacement.</p>
                  </div>
                </div>

                <div className="admin-log-item">
                  <div className="admin-log-dot admin-log-dot--success"></div>
                  <div>
                    <p className="admin-log-time admin-log-time--success">19:35 · DELIVERY</p>
                    <p className="admin-log-text">Stock arrived: Fresh sea bass (40kg)</p>
                  </div>
                </div>

                <div className="admin-log-item">
                  <div className="admin-log-dot admin-log-dot--primary"></div>
                  <div>
                    <p className="admin-log-time admin-log-time--primary">19:30 · ORDER #401</p>
                    <p className="admin-log-text">VIP Table 4: All mains served</p>
                  </div>
                </div>

                <button className="admin-log-btn">View All Logs</button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Bottom Nav (Mobile) ── */}
      <nav className="admin-bottom-nav">
        <div className={`admin-bottom-nav-item ${mobileNavTab === 'menu' ? 'active' : ''}`} onClick={() => setMobileNavTab('menu')}>
          <span className="material-symbols-outlined">restaurant_menu</span>
          <span className="admin-bottom-nav-label">Menu</span>
        </div>
        <div className={`admin-bottom-nav-item ${mobileNavTab === 'orders' ? 'active' : ''}`} onClick={() => setMobileNavTab('orders')}>
          <span className="material-symbols-outlined">receipt_long</span>
          <span className="admin-bottom-nav-label">Orders</span>
        </div>
        <div className={`admin-bottom-nav-item ${mobileNavTab === 'tables' ? 'active' : ''}`} onClick={() => setMobileNavTab('tables')}>
          <span className="material-symbols-outlined">table_restaurant</span>
          <span className="admin-bottom-nav-label">Tables</span>
        </div>
        <div className={`admin-bottom-nav-item ${mobileNavTab === 'sales' ? 'active' : ''}`} onClick={() => setMobileNavTab('sales')}>
          <span className="material-symbols-outlined">query_stats</span>
          <span className="admin-bottom-nav-label">Sales</span>
        </div>
      </nav>
    </div>
  );
}
