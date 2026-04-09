const { motion } = Motion;

window.Recorder = function Recorder({
  isListening,
  isProcessing,
  isAnalyzing,
  speechApiAvailable,
  onStart,
  onStop,
  onUpload,
  onLanguageChange,
  onTargetLanguageChange,
  onAutoCorrectChange,
  onVocabularyChange,
  onAnalyze,
  selectedLanguage,
  targetLanguage,
  autoCorrect,
  userVocabulary,
  confidenceScore,
  error,
}) {
  const buttonStateClass = isListening
    ? "from-rose-500 via-pink-500 to-orange-400"
    : "from-fuchsia-500 via-purple-500 to-orange-400";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
      className="rounded-3xl border border-white/35 bg-white/30 p-6 shadow-[0_20px_90px_-45px_rgba(17,24,39,0.65)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/40"
    >
      <div className="flex flex-col items-center justify-center gap-6">
        <motion.button
          onClick={isListening ? onStop : onStart}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          animate={isListening ? { boxShadow: ["0 0 0px rgba(244,63,94,0.2)", "0 0 50px rgba(236,72,153,0.7)", "0 0 0px rgba(251,146,60,0.2)"] } : { boxShadow: "0 0 0px rgba(0,0,0,0)" }}
          transition={{ duration: 1.7, repeat: isListening ? Infinity : 0 }}
          className={`relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-r ${buttonStateClass} text-white shadow-2xl sm:h-32 sm:w-32`}
          aria-label={isListening ? "Stop Recording" : "Start Recording"}
        >
          {isListening ? (
            <span className="h-7 w-7 rounded-sm bg-white" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-9 w-9 fill-current">
              <path d="M12 15a3 3 0 003-3V7a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a1 1 0 112 0 7 7 0 11-14 0 1 1 0 112 0 5 5 0 1010 0zm-4 8v-2h-2v2a1 1 0 102 0z" />
            </svg>
          )}

          {isListening && (
            <span className="absolute inset-0 rounded-full border-2 border-white/70 animate-ping" />
          )}
        </motion.button>

        {isListening && (
          <div className="flex h-10 items-end gap-1">
            {[...Array(14)].map((_, index) => (
              <span
                key={index}
                className="w-1 rounded-full bg-gradient-to-t from-fuchsia-500 to-orange-400 animate-pulse"
                style={{
                  height: `${12 + ((index * 7) % 24)}px`,
                  animationDelay: `${index * 0.06}s`,
                  animationDuration: `${0.6 + (index % 3) * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <button
            onClick={onStart}
            disabled={isListening || isProcessing}
            className="rounded-full border border-white/45 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition enabled:hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            Start Recording
          </button>
          <button
            onClick={onStop}
            disabled={!isListening}
            className="rounded-full border border-white/45 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition enabled:hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            Stop Recording
          </button>
          <label className="cursor-pointer rounded-full border border-white/45 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">
            Upload Audio
            <input
              type="file"
              className="hidden"
              accept="audio/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onUpload(file);
                }
                event.target.value = "";
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <label className="text-sm font-medium text-slate-700">Language</label>
          <select
            value={selectedLanguage}
            onChange={(event) => onLanguageChange(event.target.value)}
            className="rounded-full border border-white/45 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 outline-none ring-purple-500/60 transition focus:ring-2 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="hi-IN">Hindi</option>
            <option value="es-ES">Spanish</option>
            <option value="fr-FR">French</option>
          </select>

          <select
            value={targetLanguage}
            onChange={(event) => onTargetLanguageChange(event.target.value)}
            className="rounded-full border border-white/45 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 outline-none ring-purple-500/60 transition focus:ring-2 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100"
          >
            <option value="auto">No Translation</option>
            <option value="en">Translate → English</option>
            <option value="es">Translate → Spanish</option>
            <option value="fr">Translate → French</option>
            <option value="hi">Translate → Hindi</option>
          </select>
        </div>

        <div className="flex w-full flex-col gap-3 rounded-2xl border border-white/40 bg-white/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={autoCorrect}
              onChange={(event) => onAutoCorrectChange(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
            />
            Auto-correct transcript
          </label>

          <input
            type="text"
            value={userVocabulary}
            onChange={(event) => onVocabularyChange(event.target.value)}
            placeholder="Custom vocabulary (comma separated)"
            className="w-full rounded-xl border border-white/45 bg-white/75 px-3 py-2 text-sm text-slate-700 outline-none ring-purple-500/60 transition focus:ring-2 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing || isProcessing}
              className="rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAnalyzing ? "Summarizing..." : "Summarize"}
            </button>

            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Confidence: <span className="font-bold">{Math.round((confidenceScore || 0) * 100)}%</span>
            </p>
          </div>
        </div>

        {!speechApiAvailable && (
          <p className="max-w-xl text-center text-sm text-amber-700 dark:text-amber-300">
            Real-time SpeechRecognition is not available in this browser. Recording uses backend transcription after stopping.
          </p>
        )}

        {isProcessing && <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Processing audio…</p>}

        {error && (
          <p className="max-w-xl text-center text-sm font-medium text-rose-600">{error}</p>
        )}
      </div>
    </motion.section>
  );
};
