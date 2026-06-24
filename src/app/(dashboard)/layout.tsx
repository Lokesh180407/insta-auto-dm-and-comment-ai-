'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  route: string;
  exact?: boolean;
}

function HomeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function CommentIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function LogsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
function TemplateIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>;
}
function InboxIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>;
}
function SettingsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
function ChevronLeft() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
}
function ChevronRight() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}

const navItems: NavItem[] = [
  { icon: <HomeIcon />, label: 'Dashboard', route: '/', exact: true },
  { icon: <CommentIcon />, label: 'Comment → DM', route: '/comments' },
  { icon: <TemplateIcon />, label: 'Templates', route: '/templates' },
  { icon: <LogsIcon />, label: 'DM Logs', route: '/logs' },
  { icon: <InboxIcon />, label: 'Sent Inbox', route: '/inbox' },
  { icon: <SettingsIcon />, label: 'Settings', route: '/settings' },
];

interface AccountInfo {
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);

  useEffect(() => {
    const checkSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  useEffect(() => {
    fetch('/api/instagram/account')
      .then(r => r.json())
      .then(d => { if (d.success && d.data) setAccount(d.data); })
      .catch(() => {});
  }, []);

  const sidebarWidth = collapsed ? 68 : 236;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0d1117', fontFamily: "'Inter', sans-serif", color: '#e6edf3' }}>
        {/* Sidebar */}
        <aside style={{
          width: sidebarWidth,
          minHeight: '100vh',
          position: 'fixed',
          top: 0, left: 0,
          zIndex: 50,
          background: 'rgba(22, 27, 34, 0.97)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '4px 0 30px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {/* Brand */}
          <div style={{
            padding: collapsed ? '18px 16px' : '18px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', minHeight: 68,
          }} onClick={() => setCollapsed(!collapsed)}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #2dd4bf, #818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, boxShadow: '0 4px 14px rgba(45,212,191,0.3)',
            }}>
              ⚡
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div style={{
                  fontWeight: 800, fontSize: 14,
                  background: 'linear-gradient(90deg, #2dd4bf, #818cf8)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  InstaAuto
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Personal Automation</div>
              </div>
            )}
          </div>

          {/* Account Info */}
          {!collapsed && (
            <div style={{
              margin: '10px 10px 6px',
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(45,212,191,0.06)',
              border: '1px solid rgba(45,212,191,0.12)',
              display: 'flex', alignItems: 'center', gap: 9,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2dd4bf, #818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0, overflow: 'hidden',
              }}>
                {account?.profile_picture_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.profile_picture_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : '👤'}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e6edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {account?.username ? `@${account.username}` : '@myaccount'}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                  {account?.followers_count ? `${account.followers_count.toLocaleString()} followers` : 'Connected'}
                </div>
              </div>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', flexShrink: 0, boxShadow: '0 0 5px #34d399' }} />
            </div>
          )}

          {collapsed && (
            <div style={{ padding: '10px 0 6px', display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2dd4bf, #818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, overflow: 'hidden',
              }}>
                {account?.profile_picture_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.profile_picture_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : '👤'}
              </div>
            </div>
          )}

          {/* Nav */}
          <nav style={{ flex: 1, padding: '6px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.route
                : pathname === item.route || pathname.startsWith(item.route + '/');
              return (
                <NavLink key={item.route} item={item} isActive={isActive} collapsed={collapsed} />
              );
            })}
          </nav>

          {/* Collapse button */}
          <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                width: '100%', padding: collapsed ? '9px' : '9px 14px',
                borderRadius: 9,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                gap: 8, transition: 'all 0.2s',
              }}
            >
              {!collapsed && <span>Collapse</span>}
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{
          marginLeft: sidebarWidth,
          flex: 1, minHeight: '100vh',
          transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)',
          background: '#0d1117',
          overflowX: 'hidden',
          overflowY: 'auto',
          height: '100vh',
          position: 'relative',
        }}>
          {children}
        </main>
      </div>
    </>
  );
}

function NavLink({ item, isActive, collapsed }: { item: NavItem; isActive: boolean; collapsed: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={item.route}
      style={{
        display: 'flex', alignItems: 'center',
        gap: 10,
        padding: collapsed ? '10px' : '9px 12px',
        borderRadius: 9,
        marginBottom: 2,
        background: isActive
          ? 'rgba(45,212,191,0.1)'
          : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: isActive ? '1px solid rgba(45,212,191,0.2)' : '1px solid transparent',
        color: isActive ? '#2dd4bf' : hovered ? '#e6edf3' : 'rgba(230,237,243,0.5)',
        textDecoration: 'none',
        transition: 'all 0.15s ease',
        position: 'relative',
        justifyContent: collapsed ? 'center' : 'flex-start',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isActive && (
        <div style={{
          position: 'absolute', left: 0, top: '18%', bottom: '18%',
          width: 3, borderRadius: '0 3px 3px 0',
          background: 'linear-gradient(180deg, #2dd4bf, #818cf8)',
        }} />
      )}

      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {item.icon}
      </span>

      {!collapsed && (
        <span style={{
          fontSize: 13, fontWeight: isActive ? 600 : 450,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.label}
        </span>
      )}
    </Link>
  );
}
