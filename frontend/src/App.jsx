import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Recorder from './components/Recorder';
import TranscriptBox from './components/TranscriptBox';
import HistoryPanel from './components/HistoryPanel';
import HealthBadge from './components/HealthBadge';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useBackendHealth } from './hooks/useBackendHealth';
import { useTranscriptHistory } from './hooks/useTranscriptHistory';

export default function App() {
  const speech = useSpeechRecognition();
  const backendStatus = useBackendHealth();
  const { history, loading, error: historyError, refresh } = useTranscriptHistory();
  const [backendTranscript, setBackendTranscript] = useState('');
  const [transcriptError, setTranscriptError] = useState('');

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Navbar />
      <main className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Hero />
          <div className="glass-card p-4">
            <HealthBadge status={backendStatus} />
          </div>
          <Recorder
            speech={speech}
            onBackendTranscript={setBackendTranscript}
            onError={setTranscriptError}
            onSuccess={refresh}
          />
        </div>
        <div className="space-y-4">
          <TranscriptBox
            transcript={speech.transcript}
            backendTranscript={backendTranscript}
            error={transcriptError}
          />
          <HistoryPanel
            history={history}
            loading={loading}
            error={historyError}
            onRefresh={refresh}
          />
        </div>
      </main>
    </div>
  );
}
