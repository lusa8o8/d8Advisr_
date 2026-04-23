import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  Home, Calendar, User, Bell, Map, Sparkles, Settings, LogOut,
} from 'lucide-react';
import { cn } from '@/components/SharedUI';

const NAV = [
  { label: 'Discover',   icon: Home,     path: '/home' },
  { label: 'My Plans',   icon: Calendar, path: '/plans' },
  { label: 'Map',        icon: Map,      path: '/map' },
  { label: 'Notifications', icon: Bell,  path: '/notifications' },
  { label: 'Profile',    icon: User,     path: '/profile' },
];

function Sidebar() {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) =>
    path === '/home'
      ? location === '/home' || location === '/'
      : location.startsWith(path);

  return (
    <aside
      className="w-[240px] shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: '#0F0F0F' }}
    >
      {/* Logo */}
      <div
        className="px-6 pt-7 pb-6 cursor-pointer"
        onClick={() => setLocation('/home')}
      >
        <div className="flex items-baseline gap-0.5">
          <span
            className="font-black text-[26px] leading-none"
            style={{ color: '#FF5A5F', letterSpacing: '-1px' }}
          >
            D8
          </span>
          <span
            className="font-black text-[26px] leading-none text-white"
            style={{ letterSpacing: '-1px' }}
          >
            Advisr
          </span>
        </div>
        <p className="text-[11px] font-medium mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Date &amp; Group Planning
        </p>
      </div>

      {/* Surprise Me CTA */}
      <div className="px-4 mb-6">
        <button
          onClick={() => setLocation('/plan/generate')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-[14px] active:scale-[0.97] transition-all"
          style={{
            background: 'linear-gradient(135deg, #FF5A5F 0%, #FF3D6B 100%)',
            boxShadow: '0 6px 18px -4px rgba(255,90,95,0.55)',
          }}
        >
          <Sparkles size={15} />
          Surprise Me
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 px-3">
        {NAV.map(item => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold transition-all text-left w-full group',
                active
                  ? 'text-white'
                  : 'hover:bg-white/5',
              )}
              style={active ? { background: 'rgba(255,90,95,0.15)', color: '#FF5A5F' } : { color: 'rgba(255,255,255,0.5)' }}
            >
              <item.icon
                size={18}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? '' : 'group-hover:text-white/70 transition-colors'}
                style={active ? { color: '#FF5A5F' } : undefined}
              />
              <span className={active ? 'text-white' : ''}>{item.label}</span>
              {item.label === 'Notifications' && (
                <span
                  className="ml-auto w-2 h-2 rounded-full"
                  style={{ background: '#FF5A5F' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-4" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

      {/* Bottom: user + settings */}
      <div className="px-4 pb-6 flex flex-col gap-2">
        <button
          onClick={() => setLocation('/profile')}
          className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors w-full text-left"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: 'rgba(255,90,95,0.15)' }}
          >
            🥰
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-[13px] leading-tight truncate">Alex</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Your profile
            </p>
          </div>
        </button>
        <button
          onClick={() => setLocation('/settings')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left hover:bg-white/5 transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <Settings size={16} strokeWidth={1.8} />
          <span className="text-[13px] font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
}

export function DesktopShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#F7F7F7' }}>
      <Sidebar />

      {/* Vertical rule */}
      <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

      {/* Main content area — flex col + h-screen so page flex-1/min-h-0 chains work.
          transform: translateZ(0) makes this the containing block for any fixed children. */}
      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{ height: '100vh', transform: 'translateZ(0)' }}
      >
        {children}
      </main>
    </div>
  );
}
