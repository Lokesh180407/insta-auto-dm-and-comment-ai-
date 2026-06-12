'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { icon: '💬', label: 'Inbox', route: '/inbox', badge: 3 },
  { icon: '🤖', label: 'AI Agent', route: '/ai' },
  { icon: '💬', label: 'Comments', route: '/comments' },
  { icon: '⚡', label: 'Flows', route: '/flows' },
  { icon: '📢', label: 'Broadcasts', route: '/broadcasts' },
  { icon: '🎯', label: 'Campaigns', route: '/campaigns' },
  { icon: '📊', label: 'Analytics', route: '/analytics' },
  { icon: '👥', label: 'CRM', route: '/crm' },
  { icon: '🧠', label: 'Knowledge', route: '/knowledge' },
  { icon: '👔', label: 'Team', route: '/team' },
  { icon: '📋', label: 'Logs', route: '/logs' },
  { icon: '⚙️', label: 'Settings', route: '/settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setCollapsed(mobile);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const sidebarWidth = collapsed ? 72 : 240;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#0a0a0f',
          fontFamily: "'Inter', sans-serif",
          color: '#fff',
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            width: sidebarWidth,
            minHeight: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 50,
            background: 'rgba(17, 17, 24, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: '4px 0 30px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          {/* Logo / Brand */}
          <div
            style={{
              padding: collapsed ? '20px 16px' : '20px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              minHeight: 72,
            }}
            onClick={() => setCollapsed(!collapsed)}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
                boxShadow: '0 4px 15px rgba(131,58,180,0.4)',
              }}
            >
              📸
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  InstaAuto
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                  Automation Platform
                </div>
              </div>
            )}
          </div>

          {/* Account Info */}
          {!collapsed && (
            <div
              style={{
                margin: '12px 12px 8px',
                padding: '12px',
                borderRadius: 12,
                background: 'rgba(131,58,180,0.1)',
                border: '1px solid rgba(131,58,180,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #833ab4, #fd1d1d)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                👤
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  @myaccount
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  Pro Plan · Active
                </div>
              </div>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22c55e',
                  flexShrink: 0,
                  boxShadow: '0 0 6px #22c55e',
                  marginLeft: 'auto',
                }}
              />
            </div>
          )}

          {collapsed && (
            <div style={{ padding: '12px 16px 8px', display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #833ab4, #fd1d1d)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                👤
              </div>
            </div>
          )}

          {/* Nav Items */}
          <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
            {navItems.map((item) => {
              const isActive = pathname === item.route || pathname.startsWith(item.route + '/');
              return (
                <NavLink
                  key={item.route}
                  item={item}
                  isActive={isActive}
                  collapsed={collapsed}
                />
              );
            })}
          </nav>

          {/* Bottom toggle button */}
          <div
            style={{
              padding: '12px 10px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 8,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 16 }}>{collapsed ? '→' : '←'}</span>
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main
          style={{
            marginLeft: sidebarWidth,
            flex: 1,
            minHeight: '100vh',
            transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
            background: '#0a0a0f',
            overflowX: 'hidden',
          }}
        >
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
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: collapsed ? '10px' : '10px 12px',
        borderRadius: 10,
        marginBottom: 2,
        background: isActive
          ? 'linear-gradient(135deg, rgba(131,58,180,0.25), rgba(253,29,29,0.1))'
          : hovered
          ? 'rgba(255,255,255,0.06)'
          : 'transparent',
        border: isActive
          ? '1px solid rgba(131,58,180,0.35)'
          : '1px solid transparent',
        color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        position: 'relative',
        justifyContent: collapsed ? 'center' : 'flex-start',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isActive && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '20%',
            bottom: '20%',
            width: 3,
            borderRadius: '0 3px 3px 0',
            background: 'linear-gradient(180deg, #833ab4, #fd1d1d)',
          }}
        />
      )}

      <span style={{ fontSize: 18, flexShrink: 0, position: 'relative' }}>
        {item.icon}
        {item.badge && item.badge > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -6,
              background: 'linear-gradient(135deg, #833ab4, #fd1d1d)',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: '50%',
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.badge}
          </span>
        )}
      </span>

      {!collapsed && (
        <span
          style={{
            fontSize: 13,
            fontWeight: isActive ? 600 : 400,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.label}
        </span>
      )}
    </Link>
  );
}
