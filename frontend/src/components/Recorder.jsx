import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Upload } from 'lucide-react';
import { transcribeFile } from '../utils/api';

export default function Recorder({ speech, onBackendTranscript, onError, onSuccess }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    onError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await transcribeFile(formData);
      onBackendTranscript(result.transcript || '');
      onSuccess();
    } catch (err) {
      onError(err.message || 'Transcription failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <h3 className="mb-4 text-lg font-semibold">Recorder</h3>
      <div className="flex flex-wrap gap-3">
        {!speech.listening ? (
          <button
            onClick={speech.start}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/80 px-4 py-2 text-white hover:bg-emerald-500"
          >
            <Mic size={16} /> Start Mic
          </button>
        ) : (
          <button
            onClick={speech.stop}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-500/80 px-4 py-2 text-white hover:bg-rose-500"
          >
            <MicOff size={16} /> Stop Mic
          </button>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2 hover:bg-white/10"
          disabled={uploading}
        >
          <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Audio'}
        </button>
        <button
          onClick={speech.clear}
          className="rounded-lg border border-white/30 px-4 py-2 hover:bg-white/10"
        >
          Clear Live Transcript
        </button>
      </div>
      {!speech.supported && (
        <p className="mt-3 text-sm text-amber-200">Web Speech API is not supported in this browser.</p>
      )}
      {speech.error && <p className="mt-2 text-sm text-rose-200">{speech.error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleUpload}
      />
    </motion.section>
  );
}
