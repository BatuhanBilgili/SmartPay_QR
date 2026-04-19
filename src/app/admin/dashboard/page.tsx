'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import '../admin.css';
import './dashboard.css';

// ── Types ──
interface RevenueStats {
  revenue: { last24h: number; last7d: number; last30d: number };
  orders:  { last24h: number; last7d: number; last30d: number };
  activeTables: number;
  hourlyRevenue: { hour: number; revenue: number }[];
  topItems: { name: string; totalSold: number; totalRevenue: number }[];
  fetchedAt: string;
}

interface ZReportItem {
  name: string;
  totalSold: number;
  unitPrice: number;
  totalRevenue: number;
}

interface ZReport {
  reportDate: string; // YYYY-MM-DD
  generatedAt: string;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    pendingOrders: number;
    servedOrders: number;
  };
  openSessions: number;
  itemBreakdown: ZReportItem[];
  hourly: { hour: number; revenue: number; count: number }[];
}

// ── Helpers ──
const fmt = (n: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** Returns today's date as YYYY-MM-DD in Istanbul timezone */
function todayIstanbul() {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Opens a new blank window, writes the Z-report HTML into it, then triggers print.
 * This avoids the "blank page" bug of window.print() inside a Next.js SPA.
 */
function printZReport(report: ZReport) {
  const dateLabel = report.reportDate
    .split('-')
    .reverse()
    .join('.');

  const itemRows = report.itemBreakdown
    .map(
      (i) =>
        `<tr>
          <td>${i.name}</td>
          <td style="text-align:center">${i.totalSold}</td>
          <td style="text-align:right">₺${fmt(i.unitPrice)}</td>
          <td style="text-align:right"><strong>₺${fmt(i.totalRevenue)}</strong></td>
        </tr>`
    )
    .join('');

  const hourRows = report.hourly
    .map(
      (h) =>
        `<tr>
          <td>${String(h.hour).padStart(2, '0')}:00</td>
          <td style="text-align:center">${h.count}</td>
          <td style="text-align:right">₺${fmt(h.revenue)}</td>
        </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>Z Raporu — ${dateLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 11px; color: #000; background: #fff; padding: 24px; max-width: 480px; margin: 0 auto; }
    h1 { font-size: 15px; text-align: center; margin-bottom: 4px; }
    .meta { text-align: center; font-size: 10px; color: #555; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 12px; }
    .summary { margin-bottom: 16px; border-bottom: 1px dashed #555; padding-bottom: 12px; }
    .kv { display: flex; justify-content: space-between; margin-bottom: 4px; }
    h2 { font-size: 12px; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 16px 0 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 4px 6px; border-bottom: 1px solid #ddd; font-size: 10px; text-align: left; }
    tfoot td { border-top: 2px solid #000; border-bottom: none; font-weight: bold; }
    .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #777; border-top: 1px dashed #999; padding-top: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Lezzet Durağı — Z Raporu</h1>
  <p class="meta">${dateLabel} · Oluşturulma: ${new Date(report.generatedAt).toLocaleTimeString('tr-TR')}</p>
  <div class="summary">
    <div class="kv"><span>Toplam Ciro</span><strong>₺${fmt(report.summary.totalRevenue)}</strong></div>
    <div class="kv"><span>Toplam Sipariş</span><strong>${report.summary.totalOrders}</strong></div>
    <div class="kv"><span>Servis Edilen</span><strong>${report.summary.servedOrders}</strong></div>
    <div class="kv"><span>Bekleyen</span><strong>${report.summary.pendingOrders}</strong></div>
    <div class="kv"><span>Açık Masalar</span><strong>${report.openSessions}</strong></div>
  </div>
  <h2>Ürün Satış Detayı</h2>
  <table>
    <thead><tr><th>Ürün</th><th>Adet</th><th>Birim ₺</th><th>Toplam ₺</th></tr></thead>
    <tbody>${itemRows}</tbody>
    <tfoot><tr><td colspan="3">GENEL TOPLAM</td><td style="text-align:right">₺${fmt(report.summary.totalRevenue)}</td></tr></tfoot>
  </table>
  ${report.hourly.length > 0 ? `
  <h2>Saatlik Dağılım</h2>
  <table>
    <thead><tr><th>Saat</th><th>Sipariş</th><th>Ciro ₺</th></tr></thead>
    <tbody>${hourRows}</tbody>
  </table>` : ''}
  <p class="footer">Bu rapor otomatik oluşturulmuştur — SmartPay QR</p>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=600,height=800');
  if (!win) { alert('Lütfen tarayıcınızın popup engelleyicisini devre dışı bırakın.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}


export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats]           = useState<RevenueStats | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [zReport, setZReport]       = useState<ZReport | null>(null);
  const [showZReport, setShowZReport] = useState(false);
  const [zLoading, setZLoading]     = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [activeTab, setActiveTab]   = useState<'24h' | '7d' | '30d'>('24h');
  // Date picker for historical Z report — default today
  const [zDate, setZDate]           = useState<string>(todayIstanbul());

  // ── Auth guard ──
  useEffect(() => {
    const role = localStorage.getItem('admin_role');
    if (role !== 'owner') router.push('/admin');
  }, [router]);

  // ── Fetch dashboard stats ──
  const fetchStats = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
        setLastUpdated(new Date().toLocaleTimeString('tr-TR'));
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // ── Fetch Z Report for selected date ──
  const fetchZReport = async (date: string) => {
    setZLoading(true);
    setShowZReport(true);
    setZReport(null);
    try {
      const res  = await fetch(`/api/admin/dashboard/z-report?date=${date}`);
      const data = await res.json();
      if (data.success) setZReport(data.data);
    } catch (err) {
      console.error('Z-Report fetch error:', err);
    } finally {
      setZLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_user');
    router.push('/admin');
  };

  // ── Derived ──
  const mainRevenue = stats
    ? (activeTab === '24h' ? stats.revenue.last24h : activeTab === '7d' ? stats.revenue.last7d : stats.revenue.last30d)
    : 0;
  const mainOrders = stats
    ? (activeTab === '24h' ? stats.orders.last24h : activeTab === '7d' ? stats.orders.last7d : stats.orders.last30d)
    : 0;

  const tabLabel = activeTab === '24h' ? 'Son 24 Saat' : activeTab === '7d' ? 'Son 7 Gün' : 'Son 30 Gün';
  const maxHourlyRevenue = stats ? Math.max(...stats.hourlyRevenue.map((h) => h.revenue), 1) : 1;

  return (
    <>
      <main className="admin-main">

          {/* ── Page Header ── */}
          <div className="admin-page-header" style={{ marginBottom: 40 }}>
            <div className="admin-header-main">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <h1 className="admin-page-title">Dashboard</h1>
                  <button onClick={handleLogout} className="dash-logout-btn">Çıkış Yap</button>
                </div>
                <p className="admin-page-subtitle">
                  {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Z Report controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {lastUpdated && (
                <span className="dash-last-updated">Son güncelleme: {lastUpdated}</span>
              )}
              <div className="dash-z-controls">
                <input
                  type="date"
                  className="dash-date-input"
                  value={zDate}
                  max={todayIstanbul()}
                  onChange={(e) => setZDate(e.target.value)}
                />
                <button className="dash-z-btn" onClick={() => fetchZReport(zDate)}>
                  <span className="material-symbols-outlined">summarize</span>
                  Z Raporu Al
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="dash-loading">
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>autorenew</span>
              <p>Veriler yükleniyor...</p>
            </div>
          ) : stats ? (
            <>
              {/* ── Time Window Tabs ── */}
              <div className="dash-tabs">
                {(['24h', '7d', '30d'] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`dash-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === '24h' ? 'Son 24 Saat' : tab === '7d' ? 'Son 7 Gün' : 'Son 30 Gün'}
                  </button>
                ))}
              </div>

              {/* ── KPI Cards ── */}
              <div className="dash-kpi-grid">
                <div className="dash-kpi-card dash-kpi-card--primary">
                  <div className="dash-kpi-label">
                    <span className="material-symbols-outlined">payments</span>
                    {tabLabel} Ciro
                  </div>
                  <div className="dash-kpi-value">₺{fmt(mainRevenue)}</div>
                  <div className="dash-kpi-sub">Aylık toplam: ₺{fmt(stats.revenue.last30d)}</div>
                </div>

                <div className="dash-kpi-card">
                  <div className="dash-kpi-label">
                    <span className="material-symbols-outlined">receipt_long</span>
                    {tabLabel} Sipariş
                  </div>
                  <div className="dash-kpi-value">{mainOrders}</div>
                  <div className="dash-kpi-sub">Aylık toplam: {stats.orders.last30d} sipariş</div>
                </div>

                <div className="dash-kpi-card">
                  <div className="dash-kpi-label">
                    <span className="material-symbols-outlined">table_restaurant</span>
                    Aktif Masalar
                  </div>
                  <div className="dash-kpi-value">{stats.activeTables}</div>
                  <div className="dash-kpi-sub">Şu an açık oturum</div>
                </div>

                <div className="dash-kpi-card">
                  <div className="dash-kpi-label">
                    <span className="material-symbols-outlined">analytics</span>
                    Ort. Sipariş Tutarı
                  </div>
                  <div className="dash-kpi-value">
                    ₺{mainOrders > 0 ? fmt(mainRevenue / mainOrders) : '0,00'}
                  </div>
                  <div className="dash-kpi-sub">{tabLabel}</div>
                </div>
              </div>

              {/* ── Chart + Top Items ── */}
              <div className="dash-bottom-grid">
                <div className="dash-card">
                  <p className="dash-card-title">
                    <span className="material-symbols-outlined">bar_chart</span>
                    Saatlik Ciro (Son 24s)
                  </p>
                  <div className="dash-bar-chart">
                    {stats.hourlyRevenue.map((h, i) => {
                      const pct = (h.revenue / maxHourlyRevenue) * 100;
                      return (
                        <div
                          key={i}
                          className="dash-bar-col"
                          title={`${String(h.hour).padStart(2, '0')}:00 — ₺${fmt(h.revenue)}`}
                        >
                          <div className="dash-bar-fill" style={{ height: `${Math.max(pct, 2)}%` }} />
                          {i % 4 === 0 && (
                            <span className="dash-bar-label">{String(h.hour).padStart(2, '0')}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="dash-card">
                  <p className="dash-card-title">
                    <span className="material-symbols-outlined">local_fire_department</span>
                    En Çok Satan Ürünler (30 Gün)
                  </p>
                  {stats.topItems.length === 0 ? (
                    <div className="dash-empty">Henüz satış verisi yok.</div>
                  ) : (
                    <div className="dash-top-items">
                      {stats.topItems.map((item, i) => {
                        const maxSold = stats.topItems[0].totalSold;
                        const pct     = (item.totalSold / maxSold) * 100;
                        return (
                          <div key={i} className="dash-top-item">
                            <div className="dash-top-item-header">
                              <span className="dash-top-item-rank">#{i + 1}</span>
                              <span className="dash-top-item-name">{item.name}</span>
                              <span className="dash-top-item-revenue">₺{fmt(item.totalRevenue)}</span>
                            </div>
                            <div className="dash-top-item-bar-bg">
                              <div className="dash-top-item-bar" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="dash-top-item-sold">{item.totalSold} adet satıldı</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Comparison Strip ── */}
              <div className="dash-compare-grid">
                <div className="dash-compare-card">
                  <span className="material-symbols-outlined dash-compare-icon">today</span>
                  <div>
                    <div className="dash-compare-label">Son 24 Saat</div>
                    <div className="dash-compare-revenue">₺{fmt(stats.revenue.last24h)}</div>
                    <div className="dash-compare-orders">{stats.orders.last24h} sipariş</div>
                  </div>
                </div>
                <div className="dash-compare-card">
                  <span className="material-symbols-outlined dash-compare-icon">date_range</span>
                  <div>
                    <div className="dash-compare-label">Son 7 Gün</div>
                    <div className="dash-compare-revenue">₺{fmt(stats.revenue.last7d)}</div>
                    <div className="dash-compare-orders">{stats.orders.last7d} sipariş</div>
                  </div>
                </div>
                <div className="dash-compare-card">
                  <span className="material-symbols-outlined dash-compare-icon">calendar_month</span>
                  <div>
                    <div className="dash-compare-label">Son 30 Gün</div>
                    <div className="dash-compare-revenue">₺{fmt(stats.revenue.last30d)}</div>
                    <div className="dash-compare-orders">{stats.orders.last30d} sipariş</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="dash-empty">Veri yüklenemedi. Lütfen sayfayı yenileyin.</div>
          )}

          <button className="admin-fab" onClick={fetchStats} title="Yenile">
            <span className="material-symbols-outlined" style={{ fontSize: '1.875rem' }}>refresh</span>
          </button>
        </main>

      {/* ════ Z Report Modal ════ */}
      {showZReport && (
        <div
          className="dash-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowZReport(false); }}
        >
          <div className="dash-modal">
            <div className="dash-modal-header">
              <h2 className="dash-modal-title">
                Z Raporu — {zReport
                  ? zReport.reportDate.split('-').reverse().join('.')
                  : zDate.split('-').reverse().join('.')}
              </h2>
              <div style={{ display: 'flex', gap: 12 }}>
                {zReport && (
                  <button className="dash-z-btn" onClick={() => printZReport(zReport)}>
                    <span className="material-symbols-outlined">print</span>
                    Yazdır / PDF
                  </button>
                )}
                <button className="dash-modal-close" onClick={() => setShowZReport(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {zLoading ? (
              <div className="dash-loading" style={{ padding: 60 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', animation: 'spin 1s linear infinite' }}>autorenew</span>
                <p>Rapor hazırlanıyor...</p>
              </div>
            ) : zReport ? (
              <div className="dash-modal-body">
                {/* Summary KPIs */}
                <div className="zr-modal-kpis">
                  <div className="zr-modal-kpi zr-modal-kpi--primary">
                    <span>Günlük Ciro</span>
                    <strong>₺{fmt(zReport.summary.totalRevenue)}</strong>
                  </div>
                  <div className="zr-modal-kpi">
                    <span>Toplam Sipariş</span>
                    <strong>{zReport.summary.totalOrders}</strong>
                  </div>
                  <div className="zr-modal-kpi">
                    <span>Servis Edilen</span>
                    <strong>{zReport.summary.servedOrders}</strong>
                  </div>
                  <div className="zr-modal-kpi">
                    <span>Bekleyen</span>
                    <strong>{zReport.summary.pendingOrders}</strong>
                  </div>
                  <div className="zr-modal-kpi">
                    <span>Açık Masalar</span>
                    <strong>{zReport.openSessions}</strong>
                  </div>
                </div>

                <p className="dash-card-title" style={{ marginTop: 32 }}>
                  <span className="material-symbols-outlined">restaurant_menu</span>
                  Ürün Satış Detayı
                </p>
                <div className="zr-table-wrapper">
                  <table className="zr-modal-table">
                    <thead>
                      <tr>
                        <th>Ürün</th><th>Adet</th><th>Birim Fiyat</th><th>Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zReport.itemBreakdown.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--on-surface-variant)' }}>Bu tarihte satış kaydı bulunamadı.</td></tr>
                      ) : (
                        zReport.itemBreakdown.map((item, i) => (
                          <tr key={i}>
                            <td>{item.name}</td>
                            <td style={{ textAlign: 'center' }}>{item.totalSold}</td>
                            <td style={{ textAlign: 'right' }}>₺{fmt(item.unitPrice)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>₺{fmt(item.totalRevenue)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{ fontWeight: 900, textTransform: 'uppercase' }}>Genel Toplam</td>
                        <td style={{ fontWeight: 900, textAlign: 'right', color: 'var(--primary)' }}>
                          ₺{fmt(zReport.summary.totalRevenue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {zReport.hourly.length > 0 && (
                  <>
                    <p className="dash-card-title" style={{ marginTop: 32 }}>
                      <span className="material-symbols-outlined">schedule</span>
                      Saatlik Dağılım
                    </p>
                    <div className="zr-table-wrapper">
                      <table className="zr-modal-table">
                        <thead>
                          <tr><th>Saat</th><th>Sipariş</th><th>Ciro</th></tr>
                        </thead>
                        <tbody>
                          {zReport.hourly.map((h, i) => (
                            <tr key={i}>
                              <td>{String(h.hour).padStart(2, '0')}:00</td>
                              <td style={{ textAlign: 'center' }}>{h.count}</td>
                              <td style={{ textAlign: 'right' }}>₺{fmt(h.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                <p style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', marginTop: 24, textAlign: 'center' }}>
                  Rapor oluşturulma: {new Date(zReport.generatedAt).toLocaleString('tr-TR')} · SmartPay QR
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
