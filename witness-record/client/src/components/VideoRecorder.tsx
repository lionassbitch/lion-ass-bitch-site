import { useEffect, useRef, useState } from "react";
import { useT } from "../lib/i18n";

export type RecorderState = "idle" | "requesting" | "ready" | "recording" | "preview" | "unsupported" | "denied";

const MIME_CANDIDATES = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
const HARD_STOP_SECONDS = 600; // generous ceiling; recommendation is 60–120 s

export function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of MIME_CANDIDATES) if (MediaRecorder.isTypeSupported(m)) return m;
  return "";
}

/**
 * In-browser recorder. Produces the raw MediaRecorder output as a Blob —
 * no trimming, re-encoding or post-processing of any kind.
 */
export function VideoRecorder({ onRecorded, disabled }: { onRecorded: (blob: Blob, mime: string) => void; disabled?: boolean }) {
  const { t } = useT();
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const liveRef = useRef<HTMLVideoElement>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const mime = useRef<string>("");

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    stopStream();
    if (timer.current) window.clearInterval(timer.current);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    const picked = pickMimeType();
    if (picked === null || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    mime.current = picked;
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
      streamRef.current = stream;
      if (liveRef.current) {
        liveRef.current.srcObject = stream;
        await liveRef.current.play().catch(() => {});
      }
      setState("ready");
    } catch {
      setState("denied");
    }
  };

  const beginRecording = () => {
    if (!streamRef.current) return;
    chunks.current = [];
    const rec = new MediaRecorder(streamRef.current, mime.current ? { mimeType: mime.current } : undefined);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      const type = rec.mimeType || mime.current || "video/webm";
      const out = new Blob(chunks.current, { type });
      setBlob(out);
      const url = URL.createObjectURL(out);
      setPreviewUrl(url);
      setState("preview");
      stopStream();
    };
    rec.start(1000);
    setElapsed(0);
    setState("recording");
    timer.current = window.setInterval(() => {
      setElapsed((s) => {
        if (s + 1 >= HARD_STOP_SECONDS) stopRecording();
        return s + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBlob(null);
    setElapsed(0);
    void start();
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div>
      {state === "unsupported" && <div className="notice">{t.video.unsupported}</div>}
      {state === "denied" && <div className="notice error">{t.video.cameraDenied}</div>}
      {(state === "idle" || state === "unsupported" || state === "denied") && (
        <button type="button" className="btn" onClick={start} disabled={disabled || state === "unsupported"}>
          {t.video.record}
        </button>
      )}
      {(state === "requesting" || state === "ready" || state === "recording") && (
        <div>
          <div className="video-frame">
            <video ref={liveRef} muted playsInline autoPlay aria-label={t.video.preview} />
          </div>
          <div className="actions between" aria-live="polite">
            <span>
              {state === "recording" && <span className="rec-dot" aria-hidden="true" />}
              {t.video.elapsed}: {fmt(elapsed)}
            </span>
            {state === "ready" && (
              <button type="button" className="btn gold lg" onClick={beginRecording}>
                {t.video.startRecording}
              </button>
            )}
            {state === "recording" && (
              <button type="button" className="btn danger lg" onClick={stopRecording}>
                {t.video.stopRecording}
              </button>
            )}
          </div>
        </div>
      )}
      {state === "preview" && previewUrl && blob && (
        <div>
          <div className="video-frame">
            <video src={previewUrl} controls playsInline aria-label={t.video.preview} />
          </div>
          <p className="muted small">
            {fmt(elapsed)} · {(blob.size / 1024 / 1024).toFixed(1)} MB · {blob.type || "video"}
          </p>
          <div className="actions">
            <button type="button" className="btn" onClick={() => onRecorded(blob, blob.type || mime.current || "video/webm")} disabled={disabled}>
              {t.video.useThis}
            </button>
            <button type="button" className="btn secondary" onClick={retake} disabled={disabled}>
              {t.video.retake}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
