'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const path = usePathname();

  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 28,
              height: 28,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" fill="white" opacity="0.9"/>
                <rect x="8" y="1" width="5" height="5" fill="white" opacity="0.5"/>
                <rect x="1" y="8" width="5" height="5" fill="white" opacity="0.5"/>
                <rect x="8" y="8" width="5" height="5" fill="white" opacity="0.9"/>
              </svg>
            </div>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 18,
              fontWeight: 500,
              color: 'var(--text)',
              letterSpacing: '-0.01em',
            }}>AADS Survey</span>
          </div>
        </Link>

        <nav style={{ display: 'flex', gap: 4 }}>
          {[
            { href: '/', label: 'Survey' },
            { href: '/results', label: 'Results' },
            { href: '/admin', label: 'Admin' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              padding: '6px 14px',
              borderRadius: 2,
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              color: path === href ? 'var(--accent)' : 'var(--text-muted)',
              background: path === href ? 'var(--accent-dim)' : 'transparent',
              transition: 'color 0.2s, background 0.2s',
              border: path === href ? '1px solid var(--accent-border)' : '1px solid transparent',
            }}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
