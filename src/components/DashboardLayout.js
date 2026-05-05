"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children, navItems, settingsPath, portalBadge }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAccessDropdown, setShowAccessDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile state
  
  const [a11y, setA11y] = useState({ textSize: 'Normal', theme: 'Light', vision: 'Default' });

  const fetchUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
    if (profile) {
      setUserProfile({ name: profile.full_name });
    } else {
      const { data: entity } = await supabase.from('entities').select('organization_name').eq('id', session.user.id).single();
      if (entity) setUserProfile({ name: entity.organization_name });
    }

    const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10);
    if (notifs) {
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    }
  };

  useEffect(() => {
    if (isMounted) {
      document.body.setAttribute('data-theme', a11y.theme);
      document.body.setAttribute('data-text', a11y.textSize);
      document.body.setAttribute('data-vision', a11y.vision);
    }
  }, [a11y, isMounted]);

  useEffect(() => {
    setIsMounted(true);
    fetchUserData();
  }, []);

  const handleMarkAsRead = async (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const handleMarkAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id);
    setUnreadCount(0);
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const split = name.split(' ');
    if (split.length === 1) return split[0].charAt(0).toUpperCase();
    return (split[0].charAt(0) + split[split.length - 1].charAt(0)).toUpperCase();
  };

  if (!isMounted) return <div className={styles.layoutContainer} />;

  return (
    <div className={styles.layoutContainer}>
      <svg className={styles.hiddenSvg}>
        <defs>
          <filter id="protanopia-filter"><feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0  0.558, 0.442, 0, 0, 0  0, 0.242, 0.758, 0, 0  0, 0, 0, 1, 0"/></filter>
          <filter id="deuteranopia-filter"><feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0  0.7, 0.3, 0, 0, 0  0, 0.3, 0.7, 0, 0  0, 0, 0, 1, 0"/></filter>
          <filter id="tritanopia-filter"><feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0  0, 0.433, 0.567, 0, 0  0, 0.475, 0.525, 0, 0  0, 0, 0, 1, 0"/></filter>
        </defs>
      </svg>

      <div id="vision-wrapper" className={styles.visionWrapper}>
        <nav className={styles.topNav}>
          
          <div className={styles.navLeft}>
            <button className={styles.hamburger} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
            <div className={styles.brand}>
              UWI <span className={styles.brandHighlight}>Give Back</span>
              {portalBadge && <span className={styles.portalBadge}>{portalBadge}</span>}
            </div>
          </div>
          
          <div className={`${styles.navLinks} ${isMobileMenuOpen ? styles.mobileActive : ''}`}>
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  href={item.path} 
                  className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className={styles.navActions}>
            <button className={styles.iconBtn} title="Accessibility Settings" onClick={() => { setShowAccessDropdown(!showAccessDropdown); setShowNotifDropdown(false); setShowUserDropdown(false); setIsMobileMenuOpen(false); }}>♿</button>
            
            <button className={styles.iconBtn} onClick={() => { setShowNotifDropdown(!showNotifDropdown); setShowUserDropdown(false); setShowAccessDropdown(false); setIsMobileMenuOpen(false); }}>
              🔔 {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
            </button>

            <button className={styles.avatarBtn} onClick={() => { setShowUserDropdown(!showUserDropdown); setShowNotifDropdown(false); setShowAccessDropdown(false); setIsMobileMenuOpen(false); }}>
              {getInitials(userProfile?.name)}
            </button>

            {showAccessDropdown && (
              <div className={`${styles.dropdown} ${styles.accessDropdown}`}>
                <div className={styles.dropdownHeader}>Accessibility Settings</div>
                <div className={styles.accessMenu}>
                  <div className={styles.accessSection}>
                    <span className={styles.accessLabel}>Text Size</span>
                    <div className={styles.buttonGroup}>
                      {['Normal', 'Large', 'X-Large'].map(size => (
                        <button key={size} onClick={() => setA11y({...a11y, textSize: size})} className={`${styles.accessBtn} ${a11y.textSize === size ? styles.accessBtnActive : ''}`}>{size === 'Normal' ? 'A' : size === 'Large' ? 'A+' : 'A++'}</button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.accessSection}>
                    <span className={styles.accessLabel}>Theme Display</span>
                    <div className={styles.buttonGroup}>
                      {['Light', 'Dark', 'High Contrast'].map(theme => (
                        <button key={theme} onClick={() => setA11y({...a11y, theme})} className={`${styles.accessBtn} ${a11y.theme === theme ? styles.accessBtnActive : ''}`}>{theme}</button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.accessSection}>
                    <span className={styles.accessLabel}>Color Vision</span>
                    <div className={`${styles.buttonGroup} ${styles.columnGroup}`}>
                      {['Default', 'Protanopia', 'Deuteranopia', 'Tritanopia'].map(vision => (
                        <button key={vision} onClick={() => setA11y({...a11y, vision})} className={`${styles.accessBtn} ${styles.fullWidthBtn} ${a11y.vision === vision ? styles.accessBtnActive : ''}`}>{vision === 'Default' ? 'Standard Vision' : `${vision} Filter`}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showNotifDropdown && (
              <div className={`${styles.dropdown} ${styles.notifDropdown}`}>
                <div className={styles.dropdownHeader}>
                  Notifications
                  {unreadCount > 0 && <button onClick={handleMarkAllAsRead} className={styles.markRead}>Mark all read</button>}
                </div>
                <div className={styles.notificationList}>
                  {notifications.length === 0 ? (
                    <div className={styles.emptyNotifs}>You&apos;re all caught up!</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} onClick={() => !n.is_read && handleMarkAsRead(n.id)} className={`${styles.notificationItem} ${!n.is_read ? styles.unread : styles.read}`}>
                        <div className={styles.notifTitle}>{n.title}</div>
                        <div className={styles.notifMsg}>{n.message}</div>
                        <div className={styles.notifTime}>{new Date(n.created_at).toLocaleDateString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {showUserDropdown && (
              <div className={styles.userDropdown}>
                {settingsPath && (
                  <Link href={settingsPath} className={styles.dropdownItem} onClick={() => setShowUserDropdown(false)}>
                    ⚙️ Profile
                  </Link>
                )}
                <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.dangerItem}`}>
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </nav>

        <main className={styles.mainContent}>
          {children}
        </main>
      </div> 
    </div>
  );
}