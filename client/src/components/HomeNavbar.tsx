import React from 'react';
import {
  Bell,
  ChevronDown,
  ChevronsUpDown,
  Cloud,
  Code2,
  GitPullRequest,
  KeyRound,
  LogOut,
  Plus,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import {
  Avatar,
  MenuDivider,
  MenuHeading,
  MenuItem,
  Popover,
  cn,
  controlBase,
  ghostControl,
} from './NavPrimitives.js';
import './navbar.css';

interface HomeNavbarProps {
  workspaceName?: string;
  unreadCount?: number;
  activeLink?: string;
  onLogin?: () => void;
  onGetStarted?: () => void;
  onNewProject?: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
}

const PUBLIC_LINKS = [
  { label: 'Docs', href: '/docs' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Changelog', href: '/changelog' },
];

const APP_LINKS = [
  { label: 'Projects', href: '/projects' },
  { label: 'Shared with me', href: '/shared' },
  { label: 'Templates', href: '/templates' },
  { label: 'Docs', href: '/docs' },
];

const Logo = () => (
  <a
    href="/"
    aria-label="CoDev home"
    className="flex h-10 items-center gap-2.5 rounded-[10px] px-2 transition-[background-color,transform] duration-150 active:scale-[0.96] hover:bg-white/5"
  >
    <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 p-1.5">
      <Code2 className="h-4 w-4 text-indigo-400" />
    </span>
    <span className="font-mono text-sm font-bold tracking-tight text-zinc-100">CoDev</span>
  </a>
);

export const HomeNavbar: React.FC<HomeNavbarProps> = ({
  workspaceName = 'Personal',
  unreadCount = 0,
  activeLink = '/projects',
  onLogin,
  onGetStarted,
  onNewProject,
  onOpenSearch,
  onOpenSettings,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="nav-root sticky top-0 z-40 h-16 border-b border-ide-border bg-ide-sidebar/90 backdrop-blur select-none">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-1 px-3 sm:px-4">
        <Logo />

        {/* key forces a remount so the swap between states animates in */}
        {!user ? (
          <div key="out" className="nav-rise flex flex-1 items-center gap-1">
            <nav aria-label="Primary" className="ml-2 hidden items-center gap-0.5 md:flex">
              <Popover
                label="Product"
                trigger={({ open, toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    aria-haspopup="true"
                    className={cn(ghostControl, open && 'bg-white/5 text-zinc-100')}
                  >
                    Product
                    <ChevronDown
                      className={cn('h-4 w-4 transition-[transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)]', open && 'rotate-180')}
                    />
                  </button>
                )}
                widthClass="w-80"
              >
                <MenuHeading>Platform</MenuHeading>
                <MenuItem icon={<Cloud className="h-4 w-4" />} title="Cloud workspaces" hint="Every project in the browser, zero setup" />
                <MenuItem icon={<Users className="h-4 w-4" />} title="Live collaboration" hint="Edit together with presence and cursors" />
                <MenuItem icon={<GitPullRequest className="h-4 w-4" />} title="Review & merge" hint="Resolve conflicts without leaving the editor" />
              </Popover>
              {PUBLIC_LINKS.map((l) => (
                <a key={l.href} href={l.href} className={ghostControl}>
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex-1" />
            <button type="button" onClick={onLogin} className={cn(controlBase, 'px-4 font-medium text-zinc-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] hover:bg-white/5')}>
              Sign in
            </button>
            <button type="button" onClick={onGetStarted} className={cn(controlBase, 'bg-indigo-500 px-4 font-medium text-white hover:bg-indigo-400')}>
              Start building
            </button>
          </div>
        ) : (
          <div key="in" className="nav-rise flex flex-1 items-center gap-1">
            <Popover
              label="Workspaces"
              trigger={({ open, toggle }) => (
                <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="true" className={cn(ghostControl, 'pl-2 text-zinc-200')}>
                  <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-sky-700 text-[11px] font-semibold text-white">
                    {(workspaceName || 'WS').slice(0, 2).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[10rem] truncate sm:inline">{workspaceName}</span>
                  <ChevronsUpDown className="h-4 w-4 text-zinc-500" />
                </button>
              )}
            >
              <MenuHeading>Workspaces</MenuHeading>
              <MenuItem title={workspaceName} hint="Current workspace" />
            </Popover>

            <nav aria-label="Primary" className="ml-1 hidden items-center gap-0.5 lg:flex">
              {APP_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  aria-current={l.href === activeLink ? 'page' : undefined}
                  className={cn(ghostControl, l.href === activeLink && 'bg-white/5 text-zinc-100')}
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex-1" />

            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Search projects"
              className={cn(controlBase, 'w-10 justify-center px-0 text-zinc-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-white/5 md:w-56 md:justify-start md:px-3')}
            >
              <Search className="h-4 w-4" />
              <span className="hidden flex-1 text-left md:inline">Search projects</span>
              <kbd className="hidden rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-zinc-500 md:inline">⌘K</kbd>
            </button>

            <button type="button" aria-label={`Notifications, ${unreadCount} unread`} className={cn(ghostControl, 'relative w-10 justify-center px-0')}>
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-indigo-500 px-1 text-center text-[10px] font-semibold leading-4 text-white [font-variant-numeric:tabular-nums]">
                  {unreadCount}
                </span>
              )}
            </button>

            <button type="button" onClick={onNewProject} className={cn(controlBase, 'bg-indigo-500 px-3 font-medium text-white hover:bg-indigo-400 sm:px-4')}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New project</span>
            </button>

            <Popover
              label="Account"
              align="right"
              widthClass="w-64"
              trigger={({ open, toggle }) => (
                <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="true" aria-label="Account" className={cn(ghostControl, 'px-1.5')}>
                  <Avatar user={user} />
                </button>
              )}
            >
              {({ close }) => (
                <>
                  <div className="flex items-center gap-3 px-2.5 py-2">
                    <Avatar user={user} />
                    <span className="truncate text-sm font-medium text-zinc-200">{user.username}</span>
                  </div>
                  <MenuDivider />
                  <MenuItem icon={<Settings className="h-4 w-4" />} title="Settings" onClick={() => { close(); onOpenSettings?.(); }} />
                  <MenuItem icon={<KeyRound className="h-4 w-4" />} title="API keys" onClick={close} />
                  <MenuItem icon={<LogOut className="h-4 w-4" />} title="Sign out" danger onClick={() => { close(); logout(); }} />
                </>
              )}
            </Popover>
          </div>
        )}
      </div>
    </header>
  );
};
