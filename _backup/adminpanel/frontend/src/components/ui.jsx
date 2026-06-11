import React from 'react';
import { Search, X } from 'lucide-react';

const toneSurfaceMap = {
  brand: { background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' },
  secondary: { background: 'var(--brand-secondary-soft)', color: 'var(--brand-secondary)' },
  success: { background: 'var(--c-success-soft)', color: 'var(--c-success)' },
  warning: { background: 'var(--c-warning-soft)', color: 'var(--c-warning)' },
  danger: { background: 'var(--c-danger-soft)', color: 'var(--c-danger)' },
  info: { background: 'var(--c-info-soft)', color: 'var(--c-info)' },
  neutral: { background: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' },
  default: { background: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' },
};

const readToneSurface = (tone) => {
  if (tone === 'var(--brand-secondary)') return toneSurfaceMap.secondary;
  if (tone === 'var(--brand-primary)' || tone === 'var(--c-accent)') return toneSurfaceMap.brand;
  if (tone === 'var(--c-success)') return toneSurfaceMap.success;
  if (tone === 'var(--c-warning)') return toneSurfaceMap.warning;
  if (tone === 'var(--c-danger)') return toneSurfaceMap.danger;
  if (tone === 'var(--c-info)') return toneSurfaceMap.info;
  return toneSurfaceMap.default;
};

export const PageHeader = ({ eyebrow, title, description, actions, aside }) => (
  <section className="surface-panel px-4 py-4 lg:px-5">
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
          <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h1 className="page-title">{title}</h1>
              {description ? <p className="page-description mt-2">{description}</p> : null}
            </div>
            {aside ? <div className="flex shrink-0 items-center gap-2">{aside}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  </section>
);

export const StatCard = ({ label, value, icon: Icon, tone = 'var(--brand-primary)', helper, trend }) => {
  const surface = readToneSurface(tone);

  return (
    <section className="surface-card surface-card-hover p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="section-title">{label}</p>
          <p className="stat-value mt-2 text-[1.6rem] lg:text-[1.8rem]" style={{ color: tone }}>
            {value}
          </p>
          {helper ? (
            <p className="mt-1.5 text-xs leading-5" style={{ color: 'var(--c-text-muted)' }}>
              {helper}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.7rem]" style={surface}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
      {trend ? <div className="mt-3">{trend}</div> : null}
    </section>
  );
};

export const MiniStat = ({ label, value, helper, tone = 'var(--brand-primary)' }) => (
  <div className="rounded-[0.8rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
    <p className="section-title">{label}</p>
    <p className="stat-value mt-2 text-[1.35rem]" style={{ color: tone }}>
      {value}
    </p>
    {helper ? (
      <p className="mt-2 text-xs leading-5" style={{ color: 'var(--c-text-muted)' }}>
        {helper}
      </p>
    ) : null}
  </div>
);

export const Panel = ({ title, subtitle, action, children, className = '', bodyClassName = '' }) => (
  <section className={`surface-panel ${className}`}>
    {(title || subtitle || action) && (
      <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5" style={{ borderColor: 'var(--c-border)' }}>
        <div className="min-w-0">
          {title ? <h2 className="text-base font-black" style={{ color: 'var(--c-text)' }}>{title}</h2> : null}
          {subtitle ? (
            <p className="mt-1 text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    )}
    <div className={`p-4 lg:p-5 ${bodyClassName}`}>{children}</div>
  </section>
);

export const SurfaceMetric = ({ title, value, detail, tone = 'var(--brand-primary)' }) => (
  <div className="rounded-[0.85rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
    <p className="section-title">{title}</p>
    <p className="stat-value mt-2 text-[1.5rem]" style={{ color: tone }}>
      {value}
    </p>
    {detail ? (
      <p className="mt-1.5 text-xs leading-5" style={{ color: 'var(--c-text-muted)' }}>
        {detail}
      </p>
    ) : null}
  </div>
);

export const StatusPill = ({ children, tone = 'default' }) => (
  <span className="badge" style={toneSurfaceMap[tone] || toneSurfaceMap.default}>
    {children}
  </span>
);

export const FilterChip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-[0.65rem] border px-3 py-1.5 text-xs font-black uppercase tracking-[0.06em] transition-colors"
    style={
      active
        ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: '#ffffff' }
        : { background: 'var(--c-panel)', borderColor: 'var(--c-border)', color: 'var(--c-text-soft)' }
    }
  >
    {children}
  </button>
);

export const SearchInput = ({ value, onChange, placeholder = 'Search', icon: Icon = Search }) => (
  <div className="relative w-full">
    <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--c-text-faint)' }} />
    <input value={value} onChange={onChange} placeholder={placeholder} className="input-base" style={{ paddingLeft: 40 }} />
  </div>
);

export const InfoStrip = ({ title, description, tone = 'brand', actions }) => {
  const surface = toneSurfaceMap[tone] || toneSurfaceMap.default;

  return (
    <div className="flex flex-col gap-3 rounded-[0.85rem] border px-4 py-3 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--c-border)', ...surface }}>
      <div className="min-w-0">
        <p className="text-sm font-black">{title}</p>
        {description ? <p className="mt-1 text-sm leading-6 opacity-85">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
};

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <section className="surface-panel px-5 py-10 text-center">
    {Icon ? (
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[0.8rem]" style={{ background: 'var(--c-panel-subtle)', color: 'var(--brand-primary)' }}>
        <Icon className="h-6 w-6" />
      </div>
    ) : null}
    <h3 className="mt-4 text-lg font-black" style={{ color: 'var(--c-text)' }}>
      {title}
    </h3>
    {description ? (
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>
        {description}
      </p>
    ) : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </section>
);

export const LoadingScreen = ({ height = 'calc(100vh - 150px)' }) => (
  <div className="flex items-center justify-center" style={{ height }}>
    <div className="relative flex h-12 w-12 items-center justify-center rounded-full border" style={{ borderColor: 'var(--c-border)' }}>
      <div className="h-7 w-7 animate-spin rounded-full border-[3px]" style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }} />
    </div>
  </div>
);

export const Modal = ({ open, title, subtitle, onClose, children, width = 'max-w-lg' }) => {
  if (!open) return null;

  return (
    <>
      <button type="button" className="fixed inset-0 z-50 bg-slate-950/45" onClick={onClose} aria-label="Close dialog" />
      <div className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[94vw] -translate-x-1/2 -translate-y-1/2 ${width}`}>
        <div className="surface-panel max-h-[90vh] overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex items-start justify-between gap-4 border-b px-4 py-3 lg:px-5" style={{ borderColor: 'var(--c-border)' }}>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black" style={{ color: 'var(--c-text)' }}>
                {title}
              </h3>
              {subtitle ? (
                <p className="mt-1 text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            <button type="button" onClick={onClose} className="btn-ghost h-9 w-9 rounded-[0.7rem] p-0" aria-label="Close dialog">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-4 lg:p-5">{children}</div>
        </div>
      </div>
    </>
  );
};

export const ProgressBar = ({ value, tone = 'var(--brand-primary)', height = 9, track = 'var(--c-panel-strong)' }) => (
  <div className="overflow-hidden rounded-full" style={{ height, background: track }}>
    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${value}%`, background: tone }} />
  </div>
);

export const AvatarStack = ({ items = [], limit = 4 }) => (
  <div className="flex -space-x-3">
    {items.slice(0, limit).map((item, index) => (
      <div
        key={item._id || index}
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-black text-white"
        style={{
          borderColor: 'var(--c-panel)',
          background: index % 2 === 0 ? 'var(--brand-primary)' : 'var(--brand-secondary)',
        }}
      >
        {(item.firstName || item.fullName || 'U')[0]}
      </div>
    ))}
    {items.length > limit ? (
      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-black" style={{ borderColor: 'var(--c-panel)', background: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' }}>
        +{items.length - limit}
      </div>
    ) : null}
  </div>
);

export const SegmentedTabs = ({ items, value, onChange }) => (
  <div className="inline-flex rounded-[0.75rem] border p-1" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        onClick={() => onChange(item.value)}
        className="rounded-[0.55rem] px-3 py-1.5 text-xs font-black uppercase tracking-[0.06em] transition-colors"
        style={
          value === item.value
            ? { background: 'var(--c-panel)', color: 'var(--c-text)', boxShadow: 'var(--shadow-xs)' }
            : { color: 'var(--c-text-soft)' }
        }
      >
        {item.label}
      </button>
    ))}
  </div>
);
