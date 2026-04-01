import { motion } from 'framer-motion';

export default function TranscriptBox({ transcript, backendTranscript, error }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <h3 className="mb-3 text-lg font-semibold">Transcript</h3>
      {error ? (
        <p className="rounded-lg border border-rose-200/40 bg-rose-400/20 p-3 text-rose-100">{error}</p>
      ) : (
        <div className="space-y-3">
          <p className="rounded-lg bg-black/20 p-3 text-slate-100 min-h-20">
            <span className="text-xs uppercase text-slate-300">Live (Web Speech):</span>
            <br />
            {transcript || 'No live transcript yet.'}
          </p>
          <p className="rounded-lg bg-black/20 p-3 text-slate-100 min-h-20">
            <span className="text-xs uppercase text-slate-300">Backend (Google ASR):</span>
            <br />
            {backendTranscript || 'Upload audio to get backend transcript.'}
          </p>
        </div>
      )}
    </motion.section>
  );
}
