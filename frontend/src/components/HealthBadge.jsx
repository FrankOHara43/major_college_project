import clsx from 'clsx';

export default function HealthBadge({ status }) {
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm',
        status === 'online' && 'border-emerald-300/50 bg-emerald-400/20 text-emerald-100',
        status === 'offline' && 'border-rose-300/50 bg-rose-400/20 text-rose-100',
        status === 'checking' && 'border-amber-300/50 bg-amber-400/20 text-amber-100'
      )}
    >
      <span>Backend:</span>
      <strong className="uppercase">{status}</strong>
    </div>
  );
}
