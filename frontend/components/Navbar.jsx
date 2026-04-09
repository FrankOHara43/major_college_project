const { motion } = Motion;

window.Navbar = function Navbar() {

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-6"
    >
      <div className="flex items-center justify-between rounded-2xl border border-white/30 bg-white/20 px-4 py-3 shadow-[0_20px_80px_-35px_rgba(67,56,202,0.45)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/45">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-orange-400 text-sm font-black text-white shadow-lg shadow-purple-500/30">
            VT
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">VoiceFlow AI</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:scale-[1.03] active:scale-[0.98] sm:px-5">
            Get Started
          </button>
        </div>
      </div>
    </motion.header>
  );
};
