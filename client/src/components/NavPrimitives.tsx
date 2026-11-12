import React, { useCallback, useEffect, useRef, useState } from 'react';

export const cn = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/** 40px hit area, press feedback, exact transition properties (never `transition-all`). */
export const controlBase =
  'inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] px-3 text-sm select-none ' +
  'transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400';

export const ghostControl = cn(controlBase, 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100');

/* ------------------------------------------------------------------ Popover */

interface PopoverProps {
  label: string;
  trigger: (api: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
  align?: 'left' | 'right';
  widthClass?: string;
}

/** Outer radius 16 = inner item radius 10 + 6px padding (concentric). */
export const Popover: React.FC<PopoverProps> = ({
  label,
  trigger,
  children,
  align = 'left',
  widthClass = 'w-72',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle })}
      <div
        role="dialog"
        aria-label={label}
        aria-hidden={!open}
        className={cn(
          'absolute top-[calc(100%+8px)] z-50 rounded-2xl bg-zinc-900 p-1.5',
          'shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_16px_40px_-8px_rgba(0,0,0,0.65)]',
          'transition-[opacity,transform,visibility] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
          align === 'right' ? 'right-0' : 'left-0',
          widthClass,
          open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0',
        )}
      >
        {typeof children === 'function' ? children({ close }) : children}
      </div>
    </div>
  );
};

export const MenuHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h5 className="px-2.5 pb-1 pt-2 font-mono text-[11px] uppercase tracking-[0.07em] text-zinc-500">{children}</h5>
);

interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  trailing?: React.ReactNode;
  danger?: boolean;
}

export const MenuItem: React.FC<MenuItemProps> = ({ icon, title, hint, trailing, danger, className, ...rest }) => (
  <button
    type="button"
    className={cn(
      'flex min-h-11 w-full items-center gap-3 rounded-[10px] px-2.5 py-1.5 text-left text-sm',
      'transition-[background-color] duration-150',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400',
      danger ? 'text-red-300 hover:bg-red-500/10' : 'text-zinc-200 hover:bg-white/5',
      className,
    )}
    {...rest}
  >
    {icon && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-zinc-400">{icon}</span>}
    <span className="min-w-0 flex-1">
      <span className="block font-medium">{title}</span>
      {hint && <span className="block truncate text-xs text-zinc-500">{hint}</span>}
    </span>
    {trailing}
  </button>
);

export const MenuDivider = () => <div className="mx-2.5 my-1 border-t border-dashed border-ide-border" />;

/* ------------------------------------------------------------------- Avatar */

export interface AvatarUser {
  username: string;
  avatarColor?: string;
}

interface AvatarProps {
  user: AvatarUser;
  size?: 'sm' | 'md';
  presence?: 'live' | 'idle';
  /** Add a ring in the surface colour when stacking avatars. */
  stacked?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ user, size = 'md', presence, stacked }) => (
  <span
    className={cn(
      'relative grid shrink-0 place-items-center rounded-full font-semibold text-white',
      'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]',
      size === 'md' ? 'h-7 w-7 text-[10.5px]' : 'h-6 w-6 text-[10px]',
      stacked && '-ml-2 ring-2 ring-ide-sidebar first:ml-0',
    )}
    style={{ backgroundColor: user.avatarColor || '#6366f1' }}
    title={user?.username || ''}
  >
    {(user?.username || '?').slice(0, 1).toUpperCase()}
    {presence && (
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-ide-sidebar',
          presence === 'live' ? 'bg-emerald-400' : 'bg-zinc-500',
        )}
      />
    )}
  </span>
);
