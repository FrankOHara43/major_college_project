const { motion } = Motion;

const API_BASE_URL = "http://127.0.0.1:8000";

const EMPTY_ANALYSIS = {
  transcript: "",
  corrected_text: "",
  summary: "",
  keywords: [],
  entities: [],
  confidence_score: 0,
  intent: "unknown",
  detected_language: "en",
  translated_text: "",
  suggestions: [],
  model_metadata: {},
};

function App() {
  const [transcript, setTranscript] = React.useState("");
  const [interimText, setInterimText] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [selectedLanguage, setSelectedLanguage] = React.useState("en-US");
  const [targetLanguage, setTargetLanguage] = React.useState("auto");
  const [autoCorrect, setAutoCorrect] = React.useState(true);
  const [userVocabulary, setUserVocabulary] = React.useState("");
  const [historyItems, setHistoryItems] = React.useState([]);
  const [backendStatus, setBackendStatus] = React.useState("checking");
  const [analysis, setAnalysis] = React.useState(EMPTY_ANALYSIS);

  const recognitionRef = React.useRef(null);
  const mediaRecorderRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const chunksRef = React.useRef([]);
  const transcriptRef = React.useRef("");
  const interimRef = React.useRef("");

  React.useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  React.useEffect(() => {
    interimRef.current = interimText;
  }, [interimText]);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechApiAvailable = Boolean(SpeechRecognition);

  const parseVocabulary = React.useCallback(() => {
    return userVocabulary
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [userVocabulary]);

  const typeIntoTranscript = React.useCallback((fullText) => {
    let index = 0;
    setTranscript("");

    const writer = window.setInterval(() => {
      index += 1;
      setTranscript(fullText.slice(0, index));
      if (index >= fullText.length) {
        window.clearInterval(writer);
      }
    }, 12);
  }, []);

  const fetchHistory = React.useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/history`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setHistoryItems(data.items || []);
    } catch (_) {
      // UI continues without history when backend is unavailable
    }
  }, []);

  const analyzeTranscript = React.useCallback(
    async (overrideText = "") => {
      const text = (overrideText || `${transcriptRef.current} ${interimRef.current}`).trim();
      if (!text) {
        return;
      }

      setIsAnalyzing(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            auto_correct: autoCorrect,
            target_language: targetLanguage,
            user_vocabulary: parseVocabulary(),
            include_suggestions: true,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.detail || "Analysis failed.");
        }

        setAnalysis(result);
        if (autoCorrect && result.corrected_text) {
          setTranscript(result.corrected_text);
          setInterimText("");
        }
      } catch (exception) {
        setError(exception.message || "Could not analyze transcript.");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [autoCorrect, targetLanguage, parseVocabulary],
  );

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  React.useEffect(() => {
    let intervalId;

    const pingBackend = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/`, { method: "GET" });
        setBackendStatus(response.ok ? "online" : "offline");
      } catch (_) {
        setBackendStatus("offline");
      }
    };

    pingBackend();
    intervalId = window.setInterval(pingBackend, 15000);

    return () => window.clearInterval(intervalId);
  }, []);

  React.useEffect(() => {
    if (!speechApiAvailable) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage;

    recognition.onresult = (event) => {
      let finalText = "";
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const chunk = event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          finalText += `${chunk} `;
        } else {
          interim += chunk;
        }
      }

      if (finalText) {
        setTranscript((prev) => `${prev}${finalText}`.trim());
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setError("Microphone access is blocked. Please allow permission and try again.");
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [SpeechRecognition, speechApiAvailable, selectedLanguage]);

  const sendAudioForTranscription = React.useCallback(
    async (audioBlob, filename = "recording.webm") => {
      setIsProcessing(true);
      setError("");

      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, filename);
        formData.append("language", selectedLanguage);
        formData.append("auto_correct", String(autoCorrect));
        formData.append("target_language", targetLanguage);
        formData.append("user_vocabulary", parseVocabulary().join(","));

        const response = await fetch(`${API_BASE_URL}/transcribe`, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (!response.ok) {
          const detail = result.detail;
          const message = typeof detail === "string" ? detail : detail?.message;
          throw new Error(message || "Transcription failed.");
        }

        typeIntoTranscript(result.text || "");
        setInterimText("");
        if (result.analysis) {
          setAnalysis(result.analysis);
        }
        await fetchHistory();
      } catch (exception) {
        setError(exception.message || "Unable to transcribe audio.");
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedLanguage, autoCorrect, targetLanguage, parseVocabulary, typeIntoTranscript, fetchHistory],
  );

  const startRecording = React.useCallback(async () => {
    setError("");

    if (speechApiAvailable && recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage;
      recognitionRef.current.start();
      setIsListening(true);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not support microphone recording.");
      return;
    }

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const recorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await sendAudioForTranscription(audioBlob, "recording.webm");
      };

      recorder.start();
      setIsListening(true);
    } catch (_) {
      setError("Could not access microphone. Check browser permissions.");
    }
  }, [selectedLanguage, sendAudioForTranscription, speechApiAvailable]);

  const stopRecording = React.useCallback(() => {
    setInterimText("");

    if (speechApiAvailable && recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      window.setTimeout(() => {
        analyzeTranscript();
      }, 250);
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsListening(false);
  }, [speechApiAvailable, isListening, analyzeTranscript]);

  const clearText = React.useCallback(() => {
    setTranscript("");
    setInterimText("");
    setAnalysis(EMPTY_ANALYSIS);
    setError("");
  }, []);

  const copyToClipboard = React.useCallback(async () => {
    const text = `${transcript}${interimText ? ` ${interimText}` : ""}`.trim();
    if (!text) {
      setError("There is no text to copy yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setError("Copied to clipboard.");
      setTimeout(() => setError(""), 1500);
    } catch (_) {
      setError("Clipboard access failed. Try manually selecting the text.");
    }
  }, [transcript, interimText]);

  const handleUpload = React.useCallback(
    async (file) => {
      await sendAudioForTranscription(file, file.name);
    },
    [sendAudioForTranscription],
  );

  const downloadTranscript = React.useCallback(() => {
    const fullText = `${transcript}${interimText ? ` ${interimText}` : ""}`.trim();

    if (!fullText) {
      setError("There is no text to download yet.");
      return;
    }

    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `transcript-${Date.now()}.txt`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }, [transcript, interimText]);

  const deleteTranscript = React.useCallback(
    async (entryId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/history/${entryId}`, {
          method: "DELETE",
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.detail || "Could not delete transcript.");
        }

        setHistoryItems((prev) => prev.filter((item) => item.id !== entryId));
      } catch (exception) {
        setError(exception.message || "Delete failed.");
      }
    },
    [],
  );

  const clearPreviousTranscripts = React.useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/history`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Could not clear history.");
      }

      setHistoryItems([]);
    } catch (exception) {
      setError(exception.message || "Clear history failed.");
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-rose-100 via-purple-100 to-orange-100 pb-12 text-slate-900 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100">
      <div className="pointer-events-none absolute -left-20 top-20 h-56 w-56 rounded-full bg-fuchsia-400/30 blur-3xl dark:bg-fuchsia-700/20" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-64 w-64 rounded-full bg-orange-300/40 blur-3xl dark:bg-orange-700/20" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-purple-400/25 blur-3xl dark:bg-purple-700/20" />

      <Navbar />

      <section className="mx-auto mt-4 flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/35 px-4 py-2 text-xs font-semibold text-slate-700 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              backendStatus === "online"
                ? "bg-emerald-500"
                : backendStatus === "offline"
                  ? "bg-rose-500"
                  : "bg-amber-400"
            }`}
          />
          {backendStatus === "online"
            ? "Backend Connected"
            : backendStatus === "offline"
              ? "Backend Offline"
              : "Checking Backend"}
        </div>
      </section>

      <Hero />

      <main className="mx-auto mt-10 grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
        <Recorder
          isListening={isListening}
          isProcessing={isProcessing}
          isAnalyzing={isAnalyzing}
          speechApiAvailable={speechApiAvailable}
          onStart={startRecording}
          onStop={stopRecording}
          onUpload={handleUpload}
          onLanguageChange={setSelectedLanguage}
          onTargetLanguageChange={setTargetLanguage}
          onAutoCorrectChange={setAutoCorrect}
          onVocabularyChange={setUserVocabulary}
          onAnalyze={() => analyzeTranscript()}
          selectedLanguage={selectedLanguage}
          targetLanguage={targetLanguage}
          autoCorrect={autoCorrect}
          userVocabulary={userVocabulary}
          confidenceScore={analysis.confidence_score}
          error={error}
        />

        <TranscriptBox
          transcript={transcript}
          interimText={interimText}
          isListening={isListening}
          onCopy={copyToClipboard}
          onClear={clearText}
          onDownload={downloadTranscript}
          analysis={analysis}
        />
      </main>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto mt-10 w-full max-w-7xl px-4 sm:px-6"
      >
        <div className="rounded-3xl border border-white/35 bg-white/30 p-6 shadow-[0_20px_80px_-45px_rgba(15,23,42,0.65)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Ready to transcribe your ideas?</h3>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Capture meetings, voice notes, and thoughts in seconds.</p>
            </div>
            <button
              onClick={startRecording}
              className="rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:scale-[1.03] active:scale-[0.98]"
            >
              Start Speaking Now
            </button>
          </div>
        </div>
      </motion.section>

      <section className="mx-auto mt-8 w-full max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl border border-white/35 bg-white/25 p-6 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/40">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Recent Transcriptions</h3>
            <button
              onClick={clearPreviousTranscripts}
              disabled={!historyItems.length}
              className="rounded-full border border-white/45 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100"
            >
              Clear Previous
            </button>
          </div>
          <div className="space-y-3">
            {historyItems.length ? (
              historyItems.slice(0, 5).map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/45 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/65">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-300">
                      {new Date(item.created_at).toLocaleString()} • {item.language} • {item.source_filename}
                    </p>
                    <button
                      onClick={() => deleteTranscript(item.id)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-100">{item.summary || item.text}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-200">Intent: {item.intent || "unknown"} • Confidence: {Math.round((item.confidence_score || 0) * 100)}%</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">No history yet. Record or upload audio to generate transcripts.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
