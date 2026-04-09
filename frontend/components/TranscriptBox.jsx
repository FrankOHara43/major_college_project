const { motion, AnimatePresence } = Motion;

window.TranscriptBox = function TranscriptBox({
  transcript,
  interimText,
  isListening,
  onCopy,
  onClear,
  onDownload,
  analysis,
}) {
  const highlightedWords = React.useMemo(() => {
    const map = new Map();
    (analysis?.entities || []).forEach((entity) => {
      map.set(entity.text.toLowerCase(), entity.label);
    });
    return map;
  }, [analysis]);

  const renderHighlightedText = (value) => {
    const chunks = value.split(/(\s+)/);
    return chunks.map((chunk, index) => {
      const key = `${chunk}-${index}`;
      const normalized = chunk.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const tag = highlightedWords.get(normalized);

      if (!tag) {
        return <React.Fragment key={key}>{chunk}</React.Fragment>;
      }

      return (
        <span key={key} className="rounded-md bg-purple-200/70 px-1 text-slate-900 dark:bg-purple-500/40 dark:text-purple-100">
          {chunk}
        </span>
      );
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.55 }}
      className="rounded-3xl border border-white/35 bg-white/30 p-5 shadow-[0_20px_80px_-45px_rgba(30,41,59,0.6)] backdrop-blur-xl sm:p-6 dark:border-slate-700/60 dark:bg-slate-900/40"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800 sm:text-xl dark:text-slate-100">Live Transcription</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="rounded-full border border-white/45 bg-white/65 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100"
          >
            Clear Text
          </button>
          <button
            onClick={onDownload}
            className="rounded-full border border-white/45 bg-white/65 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100"
          >
            Download .txt
          </button>
          <button
            onClick={onCopy}
            className="rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:scale-[1.03] active:scale-[0.98]"
          >
            Copy to Clipboard
          </button>
        </div>
      </div>

      <div className="relative min-h-[220px] max-h-[360px] overflow-y-auto rounded-2xl border border-white/50 bg-white/65 p-4 text-slate-800 shadow-inner shadow-white/30 sm:p-5 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100">
        <AnimatePresence mode="wait">
          <motion.p
            key={`${transcript}-${interimText}`}
            initial={{ opacity: 0.25 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.15 }}
            transition={{ duration: 0.25 }}
            className="whitespace-pre-wrap break-words text-base leading-relaxed sm:text-lg"
          >
            {transcript ? renderHighlightedText(transcript) : "Your transcribed text appears here in real-time..."}
            {interimText && (
              <span className="ml-1 italic text-slate-500 dark:text-slate-400">{interimText}</span>
            )}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-purple-500 to-fuchsia-500 transition-all"
          style={{ width: `${Math.max(6, Math.round((analysis?.confidence_score || 0) * 100))}%` }}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="rounded-2xl border border-white/45 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Summary</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-100">{analysis?.summary || "No summary yet."}</p>
        </article>

        <article className="rounded-2xl border border-white/45 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Translation</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-100">{analysis?.translated_text || "No translation selected."}</p>
        </article>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(analysis?.keywords || []).length ? (
          analysis.keywords.map((keyword) => (
            <span key={keyword} className="rounded-full border border-purple-200 bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:border-purple-500/40 dark:bg-purple-500/20 dark:text-purple-100">
              {keyword}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-300">Keywords will appear after analysis.</span>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-white/45 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">AI Suggestions</p>
        {(analysis?.suggestions || []).length ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-100">
            {analysis.suggestions.map((suggestion, index) => (
              <li key={`${suggestion}-${index}`}>• {suggestion}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">No suggestions at the moment.</p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        <span
          className={`inline-flex h-2.5 w-2.5 rounded-full ${
            isListening ? "bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.85)]" : "bg-slate-400"
          }`}
        />
        {isListening ? (
          <span className="inline-flex items-center gap-1">
            Listening
            <span className="inline-flex gap-0.5">
              <span className="h-1 w-1 animate-bounce rounded-full bg-slate-600 [animation-delay:-0.2s]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-slate-600 [animation-delay:-0.1s]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-slate-600" />
            </span>
          </span>
        ) : (
          <span>Idle</span>
        )}
      </div>
    </motion.section>
  );
};
