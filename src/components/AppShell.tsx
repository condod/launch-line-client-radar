import { useEffect, useRef, type ReactNode } from 'react';
import type { NavigationTab } from '../types';

type NavItem = {
  id: NavigationTab;
  label: string;
  shortLabel: string;
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home' },
  { id: 'prospects', label: 'Lead Database', shortLabel: 'Leads' },
  { id: 'pipeline', label: 'Pipeline Board', shortLabel: 'Pipe' },
  { id: 'audit', label: 'Audit Workspace', shortLabel: 'Audit' },
  { id: 'research', label: 'Playbooks', shortLabel: 'Plays' },
  { id: 'offer', label: 'Offer Builder', shortLabel: 'Offer' },
  { id: 'calls', label: 'Call Center', shortLabel: 'Calls' },
  { id: 'export', label: 'Export Center', shortLabel: 'Export' },
  { id: 'settings', label: 'Settings', shortLabel: 'Setup' }
];

type AppShellProps = {
  activeTab: NavigationTab;
  businessName: string;
  guideTitle: string;
  ownerEmail: string;
  ownerPhone: string;
  onTabChange: (tab: NavigationTab) => void;
  children: ReactNode;
};

export function AppShell({ activeTab, businessName, guideTitle, ownerEmail, ownerPhone, onTabChange, children }: AppShellProps) {
  const activeBottomItem = useRef<HTMLButtonElement>(null);
  const phoneDigits = ownerPhone.replace(/\D/g, '');
  const phoneHref = phoneDigits.length === 10 ? `tel:+1${phoneDigits}` : `tel:${phoneDigits}`;

  useEffect(() => {
    activeBottomItem.current?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-block">
          <div className="brand-logo-crop">
            <img alt="Launch Line Digital" height="1254" src="./launch-line-digital.png" width="1254" />
          </div>
          <div className="brand-copy">
            <p>{businessName}</p>
            <h1>{guideTitle}</h1>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              className={activeTab === item.id ? 'nav-item active' : 'nav-item'}
              key={item.id}
              onClick={() => onTabChange(item.id)}
              type="button"
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <header className="operator-contact" aria-label={`${businessName} contact information`}>
          <div>
            <span>Sales &amp; support</span>
            <strong>{businessName}</strong>
          </div>
          <div className="operator-contact-actions">
            {ownerPhone ? <a href={phoneHref}>Call {ownerPhone}</a> : null}
            {ownerEmail ? <a href={`mailto:${ownerEmail}`}>{ownerEmail}</a> : null}
          </div>
        </header>
        {children}
      </main>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <button
            className={activeTab === item.id ? 'bottom-nav-item active' : 'bottom-nav-item'}
            key={item.id}
            onClick={() => onTabChange(item.id)}
            ref={activeTab === item.id ? activeBottomItem : undefined}
            type="button"
          >
            {item.shortLabel}
          </button>
        ))}
      </nav>
    </div>
  );
}
