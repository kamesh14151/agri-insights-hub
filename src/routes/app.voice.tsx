import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mic, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { chatWithAgriAi } from "@/lib/ai.functions";

export const Route = createFileRoute("/app/voice")({
  head: () => ({
    meta: [
      { title: "Voice Assistant — Agrisynapse" },
      { name: "description", content: "Speak your farming question in Tamil, Hindi or English and hear the answer read back to you." },
      { property: "og:title", content: "Voice Assistant — Agrisynapse" },
      { property: "og:description", content: "Hands-free multilingual voice assistant for farmers in the field." },
    ],
  }),
  component: VoicePage,
});

const VOICE_LANGS = [
  { code: "ta-IN", label: "தமிழ் (Tamil)", name: "Tamil" },
  { code: "en-IN", label: "English (India)", name: "English" },
  { code: "hi-IN", label: "हिन्दी (Hindi)", name: "Hindi" },
  { code: "te-IN", label: "తెలుగు (Telugu)", name: "Telugu" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)", name: "Kannada" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)", name: "Malayalam" },
];

function VoicePage() {
  const ask = useServerFn(chatWithAgriAi);
  const [lang, setLang] = useState(VOICE_LANGS[0]!);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang.code;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const respond = async (text: string) => {
    setBusy(true);
    try {
      const res = await ask({ data: { messages: [{ role: "user", content: text }], language: lang.name } });
      setReply(res.reply);
      speak(res.reply);
    } catch (e) {
      console.error(e);
      toast.error("Could not reach the assistant");
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input is not supported in this browser");
      return;
    }
    const rec = new SR();
    rec.lang = lang.code;
    rec.interimResults = false;
    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript as string;
      setTranscript(text);
      void respond(text);
    };
    rec.onerror = () => toast.error("Didn't catch that — please try again");
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setTranscript("");
    setReply("");
    setListening(true);
    rec.start();
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  return (
    <>
      <PageIntro
        index="11 / Speak"
        eyebrow="Hands-free in the field"
        title="Just ask out loud."
        subtitle="Speak in Tamil, Hindi, Telugu, Kannada, Malayalam or English — Agrisynapse listens, answers and reads the advice back while your hands stay busy."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Microphone">
          <select
            value={lang.code}
            onChange={(e) => setLang(VOICE_LANGS.find((l) => l.code === e.target.value)!)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Voice language"
          >
            {VOICE_LANGS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>

          <div className="mt-8 flex flex-col items-center">
            <button
              onClick={listening ? stop : start}
              className={`grid h-28 w-28 place-items-center rounded-full transition-all ${
                listening ? "bg-destructive text-primary-foreground scale-105 animate-pulse" : "bg-primary text-primary-foreground hover:scale-105"
              }`}
              aria-label={listening ? "Stop listening" : "Start listening"}
            >
              {listening ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </button>
            <p className="mt-5 text-sm text-muted-foreground">
              {busy ? "Thinking…" : listening ? "Listening…" : "Tap to speak"}
            </p>
            {!supported && (
              <p className="mt-3 text-center text-xs text-destructive">
                Voice input needs Chrome or Edge. You can still read replies below.
              </p>
            )}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="You said">
            <p className="text-sm text-muted-foreground">{transcript || "Nothing captured yet."}</p>
          </Panel>
          <Panel
            title="Assistant"
            action={
              reply ? (
                <button onClick={() => speak(reply)} className="inline-flex items-center gap-1.5 text-xs text-primary" aria-label="Replay answer">
                  <Volume2 className="h-4 w-4" /> Replay
                </button>
              ) : null
            }
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{reply || "Your spoken answer will appear here."}</p>
          </Panel>
        </div>
      </div>
    </>
  );
}