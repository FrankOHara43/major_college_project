import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-6"
    >
      <h2 className="text-3xl font-semibold">Turn Voice into Text Instantly</h2>
      <p className="mt-2 text-slate-200">
        Record in browser or upload audio and get clean transcripts with persistent history.
      </p>
    </motion.section>
  );
}
