import { motion } from 'framer-motion';

export default function HistoryPanel({ history, loading, error, onRefresh }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">History</h3>
        <button
          className="rounded-lg border border-white/30 px-3 py-1 text-sm hover:bg-white/10"
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>
      {loading && <p className="text-slate-200">Loading history...</p>}
      {error && <p className="text-rose-200">{error}</p>}
      {!loading && !error && history.length === 0 && <p className="text-slate-200">No transcripts yet.</p>}
      <ul className="space-y-2">
        {history.map((item) => (
          <li key={item.id} className="rounded-lg bg-black/20 p-3 text-sm">
            <p className="font-medium">{item.transcript}</p>
            <p className="mt-1 text-xs text-slate-300">{item.source} • {new Date(item.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
