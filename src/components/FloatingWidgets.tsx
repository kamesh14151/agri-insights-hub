import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  MessageCircle, Mic, MicOff, X, Send, Sprout,
  Minimize2, RotateCcw, Volume2, VolumeX, ChevronDown,
  Sparkles, Radio
} from "lucide-react";
import { toast } from "sonner";
import { chatWithOpenRouter } from "@/lib/ai.functions";
import { useI18n } from "@/lib/i18n";

/* ─────────────────────────────────── shared types ─── */
type ChatMsg  = { role: "user" | "assistant"; content: string };
type VoiceTurn = { role: "user" | "assistant"; text: string; id: number };
type Phase    = "idle" | "listening" | "thinking" | "speaking";

const VOICE_LANGS = [
  { code: "ta-IN", label: "தமிழ்",   name: "Tamil",     appLang: "ta" },
  { code: "en-IN", label: "English", name: "English",   appLang: "en" },
  { code: "hi-IN", label: "हिन्दी",   name: "Hindi",     appLang: "hi" },
  { code: "te-IN", label: "తెలుగు",   name: "Telugu",    appLang: "te" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ",   name: "Punjabi",   appLang: "pa" },
  { code: "mr-IN", label: "मराठी",   name: "Marathi",   appLang: "mr" },
];

const CHAT_PROMPTS  = ["Yellow leaves on paddy?", "Best fertilizer for banana", "Control whitefly organically", "When to sell turmeric?"];
const VOICE_PROMPTS = [
  "What causes yellow leaves on paddy?",
  "Best organic pesticide for tomato leaf curl",
  "Current market price forecast for paddy",
  "How to improve soil nitrogen naturally?",
];

function cleanForTTS(text: string) {
  return text
    .replace(/[*#_`~>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ─────────────────────────────────── markdown renderer ─── */
function MD({ content, small }: { content: string; small?: boolean }) {
  const sz = small ? "text-[11px]" : "text-[12px]";
  const lines = content.split("\n");
  const els: React.ReactNode[] = [];
  let i = 0;
  const fmt = (t: string): React.ReactNode =>
    t.split(/(\*\*\*.+?\*\*\*|\*\*.+?\*\*|\*.+?\*|`.+?`)/g).map((p, k) => {
      if (/^\*\*\*.+\*\*\*$/.test(p)) return <strong key={k}><em>{p.slice(3,-3)}</em></strong>;
      if (/^\*\*.+\*\*$/.test(p))    return <strong key={k}>{p.slice(2,-2)}</strong>;
      if (/^\*.+\*$/.test(p))        return <em key={k}>{p.slice(1,-1)}</em>;
      if (/^`.+`$/.test(p))          return <code key={k} className="rounded bg-white/20 px-1 font-mono text-[10px]">{p.slice(1,-1)}</code>;
      return p;
    });
  while (i < lines.length) {
    const l = lines[i]!;
    if (/^#{1,3}\s/.test(l)) { els.push(<p key={i} className={`mt-1.5 font-semibold ${sz}`}>{fmt(l.replace(/^#{1,3}\s/,""))}</p>); i++; continue; }
    if (/^[-*]\s/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i]!)) { items.push(lines[i]!.replace(/^[-*]\s/,"")); i++; }
      els.push(<ul key={`u${i}`} className="my-1 space-y-0.5 pl-3">{items.map((it,k)=><li key={k} className={`flex gap-1.5 ${sz}`}><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-300"/><span>{fmt(it)}</span></li>)}</ul>);
      continue;
    }
    if (l.trim()==="") { els.push(<div key={i} className="h-0.5"/>); i++; continue; }
    els.push(<p key={i} className={`leading-relaxed ${sz}`}>{fmt(l)}</p>);
    i++;
  }
  return <div className="space-y-0.5">{els}</div>;
}

/* ─────────────────────────────────── voice orb ─── */
function VoiceOrb({ phase, onClick }: { phase: Phase; onClick: () => void }) {
  const g: Record<Phase, string> = {
    idle:      "linear-gradient(135deg,#16a34a,#15803d)",
    listening: "linear-gradient(135deg,#ef4444,#dc2626)",
    thinking:  "linear-gradient(135deg,#f59e0b,#d97706)",
    speaking:  "linear-gradient(135deg,#6366f1,#7c3aed)",
  };
  const glow: Record<Phase, string> = {
    idle: "0 0 16px 2px rgba(22,163,74,.3)",
    listening: "0 0 32px 8px rgba(239,68,68,.5)",
    thinking: "0 0 32px 8px rgba(245,158,11,.5)",
    speaking: "0 0 32px 8px rgba(99,102,241,.5)",
  };
  return (
    <div className="relative flex items-center justify-center w-22 h-22">
      {(phase === "listening" || phase === "speaking") && (
        <>
          <span className="absolute inset-0 rounded-full animate-ping opacity-25" style={{background:g[phase]}}/>
          <span className="absolute w-28 h-28 rounded-full animate-ping opacity-15 [animation-delay:300ms]" style={{background:g[phase]}}/>
        </>
      )}
      <button
        onClick={onClick}
        disabled={phase === "thinking"}
        className="relative z-10 w-20 h-20 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed shadow-2xl"
        style={{background:g[phase], boxShadow:glow[phase]}}
        aria-label="Voice Orb"
        title={phase === "listening" ? "Listening... tap to send" : phase === "speaking" ? "Speaking... tap to pause" : "Tap to speak"}
      >
        {phase === "idle"      && <Mic className="h-8 w-8 text-white"/>}
        {phase === "listening" && <MicOff className="h-8 w-8 text-white animate-pulse"/>}
        {phase === "thinking"  && <span className="flex gap-1.5">{[0,1,2].map(i=><span key={i} className="h-2.5 w-2.5 rounded-full bg-white animate-bounce" style={{animationDelay: (i * 150) + "ms"}}/>)}</span>}
        {phase === "speaking"  && <Volume2 className="h-8 w-8 text-white animate-pulse"/>}
      </button>
    </div>
  );
}

/* ─────────────────────────────────── waveform ─── */
function Waveform({ phase }: { phase: Phase }) {
  const active = phase === "listening" || phase === "speaking";
  const col = phase === "listening" ? "#ef4444" : phase === "speaking" ? "#6366f1" : "rgba(255,255,255,0.2)";
  return (
    <div className="flex h-7 items-center justify-center gap-[3px]">
      {Array.from({length:26}).map((_,i)=>(
        <div key={i} className="rounded-full" style={{
          width: 2.5,
          backgroundColor: col,
          opacity: active ? 0.5 + 0.5 * Math.sin(i * .7) : 0.25,
          height: active ? `${5 + Math.abs(Math.sin((i / 26) * Math.PI * 2)) * 18}px` : "3px",
          animation: active ? `fwBar ${0.35 + (i % 5) * .07}s ease-in-out infinite alternate` : undefined,
          animationDelay: (i * 20) + "ms",
        }}/>
      ))}
      <style dangerouslySetInnerHTML={{ __html: "@keyframes fwBar{from{transform:scaleY(1)}to{transform:scaleY(2.8)}}" }} />
    </div>
  );
}

/* ─────────────────────────────────── background layers ─── */
const BG = () => (
  <>
    <div aria-hidden style={{position:"absolute",inset:0,backgroundImage:"url('/schwoaze-nature-3526840_1920.jpg')",backgroundSize:"cover",backgroundPosition:"center",opacity:1,zIndex:0}}/>
    <div aria-hidden style={{position:"absolute",inset:0,background:"rgba(10,12,18,0.72)",backdropFilter:"blur(12px)",zIndex:1}}/>
  </>
);

/* ═══════════════════════════════════════════════════════════════════════
   Main wrapper — owns both open states, ensures mutual exclusivity
═══════════════════════════════════════════════════════════════════════ */
export function FloatingWidgets() {
  const { lang: appLang, fullName } = useI18n();
  const ask = useServerFn(chatWithOpenRouter);

  /* open/minimized state for each widget */
  const [chatOpen,      setChatOpen]      = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [voiceOpen,     setVoiceOpen]     = useState(false);

  /* ── chat state ── */
  const INIT_MSG: ChatMsg = { role:"assistant", content:"👋 Hi! I'm your Agri AI. Ask me anything about crops, pests, soil or market timing!" };
  const [chatMsgs,     setChatMsgs]     = useState<ChatMsg[]>([INIT_MSG]);
  const [chatInput,    setChatInput]    = useState("");
  const [chatBusy,     setChatBusy]     = useState(false);
  const [showPrompts,  setShowPrompts]  = useState(true);
  const [chatUnread,   setChatUnread]   = useState(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef    = useRef<HTMLDivElement>(null);
  const chatInputRef  = useRef<HTMLInputElement>(null);

  /* ── voice state ── */
  const [phase,          setPhase]          = useState<Phase>("idle");
  const [voiceTurns,     setVoiceTurns]     = useState<VoiceTurn[]>([]);
  const [muted,          setMuted]          = useState(false);
  const [autoListen,     setAutoListen]     = useState(true);
  const [voiceLang,      setVoiceLang]      = useState(VOICE_LANGS[0]!);
  const [langOpen,       setLangOpen]       = useState(false);
  const [voiceUnread,    setVoiceUnread]    = useState(0);

  /* stable refs for voice */
  const turnsRef          = useRef<VoiceTurn[]>([]);
  const liveRef           = useRef("");
  const isRespondingRef   = useRef(false);
  const recognitionRef    = useRef<any>(null);
  const silenceTimerRef   = useRef<any>(null);
  const idRef             = useRef(0);
  const voiceScrollRef    = useRef<HTMLDivElement>(null);
  const voiceEndRef       = useRef<HTMLDivElement>(null);
  const langRef           = useRef(voiceLang);
  const mutedRef          = useRef(muted);
  const autoListenRef     = useRef(autoListen);
  const phaseRef          = useRef<Phase>("idle");
  const voiceOpenRef      = useRef(false);

  /* Sync app language changes into voice assistant */
  useEffect(() => {
    const matched = VOICE_LANGS.find(l => l.appLang === appLang);
    if (matched) {
      setVoiceLang(matched);
      langRef.current = matched;
    }
  }, [appLang]);

  useEffect(() => { langRef.current = voiceLang; }, [voiceLang]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { autoListenRef.current = autoListen; }, [autoListen]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { voiceOpenRef.current = voiceOpen; }, [voiceOpen]);

  const setVoiceTurnsSafe = useCallback((updater: (prev: VoiceTurn[]) => VoiceTurn[]) => {
    setVoiceTurns(prev => { const next = updater(prev); turnsRef.current = next; return next; });
  }, []);

  /* ── auto-scrolling with multi-phase layout correction ── */
  const scrollChatToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTo({
          top: chatScrollRef.current.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      }
      chatEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    });
  }, []);

  const scrollVoiceToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      if (voiceScrollRef.current) {
        voiceScrollRef.current.scrollTo({
          top: voiceScrollRef.current.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      }
      voiceEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    });
  }, []);

  useEffect(() => {
    if (chatOpen && !chatMinimized) {
      scrollChatToBottom(true);
      const t1 = setTimeout(() => scrollChatToBottom(true), 60);
      const t2 = setTimeout(() => scrollChatToBottom(true), 180);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [chatMsgs, chatBusy, chatOpen, chatMinimized, scrollChatToBottom]);

  useEffect(() => {
    if (chatOpen && !chatMinimized) setTimeout(() => chatInputRef.current?.focus(), 300);
  }, [chatOpen, chatMinimized]);

  useEffect(() => {
    if (voiceOpen) {
      scrollVoiceToBottom(true);
      const t1 = setTimeout(() => scrollVoiceToBottom(true), 60);
      const t2 = setTimeout(() => scrollVoiceToBottom(true), 180);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [voiceTurns, phase, voiceOpen, scrollVoiceToBottom]);

  /* ── unread badges ── */
  const prevChatLen = useRef(chatMsgs.length);
  useEffect(() => {
    if (!chatOpen && chatMsgs.length > prevChatLen.current && chatMsgs[chatMsgs.length-1]?.role==="assistant") setChatUnread(n=>n+1);
    prevChatLen.current = chatMsgs.length;
  }, [chatMsgs, chatOpen]);
  const prevVoiceLen = useRef(0);
  useEffect(() => {
    if (!voiceOpen && voiceTurns.length > prevVoiceLen.current && voiceTurns[voiceTurns.length-1]?.role==="assistant") setVoiceUnread(n=>n+1);
    prevVoiceLen.current = voiceTurns.length;
  }, [voiceTurns, voiceOpen]);

  /* ────────── CHAT logic ────────── */
  const sendChat = async (text: string) => {
    if (!text.trim() || chatBusy) return;
    setShowPrompts(false);
    const next: ChatMsg[] = [...chatMsgs, {role:"user", content:text.trim()}];
    setChatMsgs(next); setChatInput(""); setChatBusy(true);
    try {
      const res = await ask({ data: { messages: next, language: fullName } });
      setChatMsgs([...next, {role:"assistant", content:res.reply}]);
    } catch { toast.error("Couldn't reach the assistant"); }
    finally { setChatBusy(false); }
  };
  const resetChat = () => { setChatMsgs([INIT_MSG]); setShowPrompts(true); setChatInput(""); };

  /* ────────── VOICE logic ────────── */
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice speech recognition needs Chrome, Edge or Safari");
      setPhase("idle");
      phaseRef.current = "idle";
      return;
    }

    try {
      window.speechSynthesis?.cancel();
    } catch {}

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    liveRef.current = "";
    const rec = new SR();
    rec.lang = langRef.current.code;
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    const commitAndSend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      const text = liveRef.current.trim();
      try { rec.stop(); } catch {}

      if (!text) {
        setVoiceTurnsSafe(prev => prev.filter(t => t.id !== -1));
        setPhase("idle");
        phaseRef.current = "idle";
        return;
      }

      const finalId = ++idRef.current;
      setVoiceTurnsSafe(prev => [...prev.filter(t => t.id !== -1), { role: "user", text, id: finalId }]);
      void respondVoice(text);
    };

    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          final += res[0].transcript + " ";
        } else {
          interim += res[0].transcript;
        }
      }
      const combined = (final + interim).trim();
      if (combined) {
        liveRef.current = combined;
        setVoiceTurnsSafe(prev => {
          const last = prev[prev.length - 1];
          if (last?.id === -1) return [...prev.slice(0, -1), { ...last, text: combined }];
          return [...prev, { role: "user", text: combined, id: -1 }];
        });

        // Reset silence debounce timer: send after 1.5 seconds of user silence
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          commitAndSend();
        }, 1500);
      }
    };

    rec.onerror = (e: any) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (e.error !== "no-speech" && e.error !== "aborted") {
        if (e.error === "not-allowed") {
          toast.error("Microphone access is blocked. Please allow mic permission in browser.");
        }
      }
      setVoiceTurnsSafe(prev => prev.filter(t => t.id !== -1));
      setPhase("idle");
      phaseRef.current = "idle";
    };

    rec.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (phaseRef.current === "listening") {
        const text = liveRef.current.trim();
        if (text) {
          commitAndSend();
        } else {
          setPhase("idle");
          phaseRef.current = "idle";
        }
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setPhase("listening");
      phaseRef.current = "listening";
    } catch (err) {
      console.warn("Recognition start failed:", err);
      setPhase("idle");
      phaseRef.current = "idle";
    }
  }, [setVoiceTurnsSafe]);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window) || mutedRef.current) {
      setPhase("idle");
      phaseRef.current = "idle";
      return;
    }
    window.speechSynthesis.cancel();
    const clean = cleanForTTS(text);
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = langRef.current.code;
    u.rate = 1.0;
    u.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices?.() || [];
    const matchedVoice = voices.find(v => v.lang.toLowerCase() === langRef.current.code.toLowerCase() || v.lang.startsWith(langRef.current.code.split("-")[0]));
    if (matchedVoice) {
      u.voice = matchedVoice;
    }

    u.onstart = () => {
      setPhase("speaking");
      phaseRef.current = "speaking";
    };
    u.onend = () => {
      setPhase("idle");
      phaseRef.current = "idle";
      // Auto-listen for next user question after natural pause
      if (autoListenRef.current && voiceOpenRef.current) {
        setTimeout(() => {
          if (phaseRef.current === "idle" && voiceOpenRef.current) {
            startListening();
          }
        }, 700);
      }
    };
    u.onerror = () => {
      setPhase("idle");
      phaseRef.current = "idle";
    };
    window.speechSynthesis.speak(u);
  }, [startListening]);

  const respondVoice = useCallback(async (text: string) => {
    if (isRespondingRef.current) return;
    isRespondingRef.current = true;
    setPhase("thinking");
    phaseRef.current = "thinking";
    const history = turnsRef.current.filter(t => t.id > 0).map(t => ({ role: t.role, content: t.text }));
    const msgs = [...history, { role: "user" as const, content: text }];
    try {
      const res = await ask({ data: { messages: msgs, language: langRef.current.name } });
      const ai: VoiceTurn = { role: "assistant", text: res.reply, id: ++idRef.current };
      setVoiceTurnsSafe(prev => [...prev, ai]);
      speak(res.reply);
    } catch {
      toast.error("Couldn't reach the assistant");
      setPhase("idle");
      phaseRef.current = "idle";
    } finally {
      isRespondingRef.current = false;
    }
  }, [ask, speak, setVoiceTurnsSafe]);

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    try { recognitionRef.current?.stop(); } catch {}
  };

  const handleOrb = () => {
    const p = phaseRef.current;
    if (p === "idle") {
      startListening();
    } else if (p === "listening") {
      stopListening();
    } else if (p === "speaking") {
      window.speechSynthesis?.cancel();
      setPhase("idle");
      phaseRef.current = "idle";
    }
  };

  const fireVoiceQuick = (q: string) => {
    if (phaseRef.current === "listening") stopListening();
    const finalId = ++idRef.current;
    setVoiceTurnsSafe(prev => [...prev.filter(t => t.id !== -1), { role: "user", text: q, id: finalId }]);
    void respondVoice(q);
  };

  /* ── mutual exclusivity & auto-start ── */
  const openChat = () => {
    setChatOpen(true);
    setChatMinimized(false);
    setVoiceOpen(false);
    voiceOpenRef.current = false;
    setChatUnread(0);
    window.speechSynthesis?.cancel();
    stopListening();
  };

  const openVoice = () => {
    setVoiceOpen(true);
    voiceOpenRef.current = true;
    setChatOpen(false);
    setVoiceUnread(0);

    // Auto-start listening immediately upon clicking voice assistant button!
    setTimeout(() => {
      startListening();
    }, 250);
  };

  const closeChat = () => {
    setChatOpen(false);
  };

  const closeVoice = () => {
    voiceOpenRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    window.speechSynthesis?.cancel();
    stopListening();
    setVoiceOpen(false);
    setPhase("idle");
    phaseRef.current = "idle";
  };

  const resetVoice = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    window.speechSynthesis?.cancel();
    stopListening();
    isRespondingRef.current = false;
    liveRef.current = "";
    setVoiceTurnsSafe(() => []);
    setPhase("idle");
    phaseRef.current = "idle";
  };

  /* ── helper: panel header ── */
  const panelHeader = (
    title: string,
    subtitle: React.ReactNode,
    accent: string,
    onReset: () => void,
    onClose: () => void,
    extra?: React.ReactNode,
    onMinimize?: () => void,
  ) => (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-4 border-b border-white/10"
      style={{background:accent, backdropFilter:"blur(12px)"}}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Sprout className="h-4 w-4 text-white"/>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{title}</p>
          <p className="text-[11px] text-white/75 truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {extra}
        <button onClick={onReset} title="Clear conversation" className="grid h-7 w-7 place-items-center rounded-lg text-white/70 hover:bg-white/15 hover:text-white transition"><RotateCcw className="h-3.5 w-3.5"/></button>
        {onMinimize && <button onClick={onMinimize} title="Minimize" className="grid h-7 w-7 place-items-center rounded-lg text-white/70 hover:bg-white/15 hover:text-white transition"><Minimize2 className="h-3.5 w-3.5"/></button>}
        <button onClick={onClose} title="Close" className="grid h-7 w-7 place-items-center rounded-lg text-white/70 hover:bg-white/15 hover:text-white transition"><X className="h-3.5 w-3.5"/></button>
      </div>
    </div>
  );

  const showChatFAB  = !chatOpen  && !voiceOpen;
  const showVoiceFAB = !voiceOpen && !chatOpen;

  const voiceStatusSubtitle = (
    <span className="flex items-center gap-1.5 font-medium">
      <span className={
        phase === "listening" ? "h-2 w-2 rounded-full bg-red-400 animate-ping" :
        phase === "speaking" ? "h-2 w-2 rounded-full bg-violet-400 animate-pulse" :
        phase === "thinking" ? "h-2 w-2 rounded-full bg-amber-400 animate-pulse" :
        "h-2 w-2 rounded-full bg-green-400"
      }/>
      {phase === "idle" ? "Ready" : phase === "listening" ? "Listening..." : phase === "thinking" ? "Thinking..." : "Speaking..."}
    </span>
  );

  const voiceSubBar = (
    <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/10 bg-black/25 backdrop-blur-md shrink-0 text-xs">
      <div className="flex items-center gap-1.5 font-medium text-white/90">
        <span className={
          phase === "listening" ? "h-2 w-2 rounded-full bg-red-400 animate-ping" :
          phase === "speaking" ? "h-2 w-2 rounded-full bg-violet-400 animate-pulse" :
          phase === "thinking" ? "h-2 w-2 rounded-full bg-amber-400 animate-pulse" :
          "h-2 w-2 rounded-full bg-green-400"
        }/>
        <span className="text-[11px]">
          {phase === "idle" ? "Ready · tap mic" : phase === "listening" ? "Listening... speak now" : phase === "thinking" ? "Gemini thinking..." : "Speaking response"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Auto Listen Toggle */}
        <button
          onClick={() => setAutoListen(v => !v)}
          title={autoListen ? "Auto-listen ON (hands-free dialogue)" : "Auto-listen OFF (single shot)"}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
            autoListen ? "bg-violet-500/30 text-violet-200 ring-1 ring-violet-400/50" : "bg-white/10 text-white/50 hover:bg-white/15"
          }`}
        >
          <Radio className="h-2.5 w-2.5"/>
          <span>Auto: {autoListen ? "ON" : "OFF"}</span>
        </button>

        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(v => !v)}
            className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/25 transition border border-white/20"
          >
            <span>{voiceLang.label}</span>
            <ChevronDown className="h-3 w-3 opacity-70"/>
          </button>

          {langOpen && (
            <>
              {/* Click outside backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
              <div
                className="absolute right-0 top-full z-50 mt-1.5 w-40 rounded-xl overflow-hidden shadow-2xl border border-white/20"
                style={{ background: "rgba(18, 18, 30, 0.98)", backdropFilter: "blur(20px)" }}
              >
                <div className="p-1">
                  {VOICE_LANGS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setVoiceLang(l); setLangOpen(false); }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-[11px] rounded-lg transition ${
                        voiceLang.code === l.code
                          ? "bg-violet-600/40 text-violet-200 font-semibold"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{l.label}</span>
                      <span className="text-[10px] text-white/45">{l.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const voiceHeaderExtra = (
    <button
      onClick={() => { setMuted(v => !v); window.speechSynthesis?.cancel(); }}
      title={muted ? "Unmute audio" : "Mute audio"}
      className={`grid h-7 w-7 place-items-center rounded-lg transition ${
        muted ? "bg-red-500/30 text-red-300" : "text-white/70 hover:bg-white/15 hover:text-white"
      }`}
    >
      {muted ? <VolumeX className="h-3.5 w-3.5"/> : <Volume2 className="h-3.5 w-3.5"/>}
    </button>
  );

  /* ════════════════════════════════════ RENDER ════════════════════════════════════ */
  return (
    <>
      {/* ── CHAT FAB ── */}
      {showChatFAB && (
        <button onClick={openChat} aria-label="Open AI chat"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
          style={{background:"linear-gradient(135deg,var(--primary),#16a34a)"}}>
          <MessageCircle className="h-6 w-6 text-white"/>
          {chatUnread>0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{chatUnread>9?"9+":chatUnread}</span>}
          <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{background:"var(--primary)"}}/>
        </button>
      )}

      {/* ── VOICE FAB ── slightly moved upward ── */}
      {showVoiceFAB && (
        <button
          onClick={openVoice}
          aria-label="Open voice assistant"
          title="Open Voice Assistant (Auto-listening)"
          className="fixed z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
          style={{
            bottom: "98px",
            right: "24px",
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
          }}
        >
          <Mic className="h-5 w-5 text-white"/>
          {voiceUnread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {voiceUnread > 9 ? "9+" : voiceUnread}
            </span>
          )}
          <span className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{background:"linear-gradient(135deg,#4f46e5,#7c3aed)"}}/>
        </button>
      )}

      {/* ═══════════ CHAT PANEL — desktop ═══════════ */}
      {chatOpen && (
        <div className={`hidden sm:flex fixed bottom-6 right-6 z-50 flex-col rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${chatMinimized?"h-14 w-72":"h-[580px] w-[380px] lg:w-[420px]"}`}
          style={{boxShadow:"0 25px 60px rgba(0,0,0,0.5)", backdropFilter:"blur(2px)", animation:"fwSlide .25s ease-out"}}>
          <BG/>
          <div className="relative z-10 flex flex-col h-full">
            {panelHeader(
              "Agri AI",
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse"/> Online · crop expert</span>,
              "linear-gradient(135deg,rgba(22,101,52,0.9),rgba(21,128,61,0.85))",
              resetChat, closeChat, undefined,
              ()=>setChatMinimized(v=>!v),
            )}
            {!chatMinimized && (
              <>
                <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3" style={{scrollbarWidth:"thin"}}>
                  {chatMsgs.map((m,i)=>(
                    <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
                      {m.role==="assistant" && <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600/80"><Sprout className="h-3 w-3 text-white"/></div>}
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-white backdrop-blur-sm ${m.role==="user"?"rounded-br-sm":"rounded-bl-sm"}`}
                        style={m.role==="user"?{background:"linear-gradient(135deg,rgba(22,101,52,0.9),rgba(21,128,61,0.9))"}:{background:"rgba(0,0,0,0.5)"}}>
                        {m.role==="assistant"?<MD content={m.content}/>:<span className="text-[12px] leading-relaxed whitespace-pre-wrap">{m.content}</span>}
                      </div>
                    </div>
                  ))}
                  {chatBusy && (
                    <div className="flex justify-start">
                      <div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600/80"><Sprout className="h-3 w-3 text-white"/></div>
                      <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-sm px-3.5 py-3" style={{background:"rgba(0,0,0,0.5)"}}>
                        {[0,1,2].map(i=><span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" style={{animationDelay: (i * 120) + "ms"}}/>)}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} className="h-0.5 w-full shrink-0" />
                </div>
                {showPrompts && (
                  <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                    {CHAT_PROMPTS.map(p=><button key={p} onClick={()=>sendChat(p)} className="rounded-full border border-white/30 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur-sm transition hover:bg-white/20 hover:text-white active:scale-95">{p}</button>)}
                  </div>
                )}
                <div className="px-3 pb-3">
                  <form onSubmit={e=>{e.preventDefault();sendChat(chatInput);}} className="flex items-center gap-2 rounded-full px-4 py-2" style={{background:"rgba(255,255,255,0.15)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.25)"}}>
                    <input ref={chatInputRef} value={chatInput} onChange={e=>setChatInput(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat(chatInput);}}}
                      placeholder="Ask about crops, pests, soil…"
                      className="min-w-0 flex-1 bg-transparent py-1 text-sm text-white placeholder:text-white/50 focus:outline-none"/>
                    <button type="submit" disabled={chatBusy||!chatInput.trim()} aria-label="Send"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 disabled:opacity-40"
                      style={{background:chatInput.trim()?"linear-gradient(135deg,var(--primary),#16a34a)":"rgba(255,255,255,0.2)"}}>
                      <Send className="h-3.5 w-3.5 text-white"/>
                    </button>
                  </form>
                  <p className="mt-1.5 text-center text-[10px] text-white/40"><Sprout className="mr-1 inline h-2.5 w-2.5"/>Gemini 2.5 Flash · AI guidance only</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ CHAT PANEL — mobile bottom sheet ═══════════ */}
      {chatOpen && (
        <div className="sm:hidden">
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={closeChat}/>
          <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-3xl"
            style={{height:"82dvh",boxShadow:"0 -8px 40px rgba(0,0,0,0.5)",animation:"fwUp .3s cubic-bezier(0.32,0.72,0,1)"}}>
            <BG/>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="h-1 w-10 rounded-full bg-white/30"/></div>
              {panelHeader("Agri AI","Online · crop expert","linear-gradient(135deg,rgba(22,101,52,0.9),rgba(21,128,61,0.85))",resetChat,closeChat)}
              <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3" style={{scrollbarWidth:"thin"}}>
                {chatMsgs.map((m,i)=>(
                  <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    {m.role === "assistant" && <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600/80"><Sprout className="h-3 w-3 text-white"/></div>}
                    <div
                      className={m.role === "user" ? "max-w-[80%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-white backdrop-blur-sm" : "max-w-[80%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-white backdrop-blur-sm"}
                      style={{background: m.role === "user" ? "linear-gradient(135deg,rgba(22,101,52,.9),rgba(21,128,61,.9))" : "rgba(0,0,0,.5)"}}
                    >
                      {m.role === "assistant" ? <MD content={m.content}/> : <span className="text-[12px] leading-relaxed whitespace-pre-wrap">{m.content}</span>}
                    </div>
                  </div>
                ))}
                {chatBusy && (
                  <div className="flex justify-start">
                    <div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600/80"><Sprout className="h-3 w-3 text-white"/></div>
                    <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-sm px-3.5 py-3" style={{background:"rgba(0,0,0,.5)"}}>
                      {[0,1,2].map(i=><span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" style={{animationDelay: (i * 120) + "ms"}}/>)}
                    </div>
                  </div>
                )}
              </div>
              {showPrompts&&<div className="flex flex-wrap gap-1.5 px-4 pb-2">{CHAT_PROMPTS.map(p=><button key={p} onClick={()=>sendChat(p)} className="rounded-full border border-white/30 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur-sm transition hover:bg-white/20 active:scale-95">{p}</button>)}</div>}
              <div className="px-3 pb-3">
                <form onSubmit={e=>{e.preventDefault();sendChat(chatInput);}} className="flex items-center gap-2 rounded-full px-4 py-2" style={{background:"rgba(255,255,255,.15)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,.25)"}}>
                  <input ref={chatInputRef} value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Ask about crops, pests, soil…" className="min-w-0 flex-1 bg-transparent py-1 text-sm text-white placeholder:text-white/50 focus:outline-none"/>
                  <button type="submit" disabled={chatBusy||!chatInput.trim()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all hover:scale-110 disabled:opacity-40" style={{background:chatInput.trim()?"linear-gradient(135deg,var(--primary),#16a34a)":"rgba(255,255,255,.2)"}}><Send className="h-3.5 w-3.5 text-white"/></button>
                </form>
                <p className="mt-1.5 text-center text-[10px] text-white/40"><Sprout className="mr-1 inline h-2.5 w-2.5"/>Gemini 2.5 Flash · AI guidance only</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ VOICE PANEL — desktop ═══════════ */}
      {voiceOpen && (
        <div className="hidden sm:flex fixed bottom-6 right-6 z-50 flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{width:410,height:580,boxShadow:"0 25px 60px rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",animation:"fwSlide .25s ease-out"}}>
          <BG/>
          <div className="relative z-10 flex flex-col h-full">
            {panelHeader(
              "Agri Voice Assistant",
              "Live voice conversation",
              "linear-gradient(135deg,rgba(79,70,229,0.95),rgba(124,58,237,0.90))",
              resetVoice,
              closeVoice,
              voiceHeaderExtra,
            )}
            {voiceSubBar}

            {/* Conversation turns */}
            <div ref={voiceScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{scrollbarWidth:"thin"}}>
              {voiceTurns.length===0?(
                <div className="flex h-full flex-col items-center justify-center gap-3 py-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600/30 ring-2 ring-violet-500/40 text-violet-200">
                    <Mic className="h-6 w-6 animate-pulse"/>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/90">Listening automatically...</p>
                    <p className="mt-1 text-xs text-white/60">Speak your question or choose a prompt below</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                    {VOICE_PROMPTS.map(q=><button key={q} onClick={()=>void fireVoiceQuick(q)} className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/20 hover:text-white transition active:scale-95">{q}</button>)}
                  </div>
                </div>
              ):(
                <>
                  {voiceTurns.map(t => (
                    <div key={t.id} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
                      {t.role === "assistant" && (
                        <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/80"><Sprout className="h-3 w-3 text-white"/></div>
                      )}
                      <div
                        className={t.role === "user" ? "max-w-[82%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-white backdrop-blur-sm" : "max-w-[82%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-white backdrop-blur-sm"}
                        style={{background: t.role === "user" ? "linear-gradient(135deg,rgba(79,70,229,.88),rgba(124,58,237,.88))" : "rgba(0,0,0,.60)"}}
                      >
                        {t.role === "assistant" ? <MD content={t.text} small/> : <span className={t.id === -1 ? "text-[12px] leading-relaxed italic opacity-85 text-violet-200" : "text-[12px] leading-relaxed"}>{t.text}</span>}
                      </div>
                      {t.role === "user" && (
                        <div className="ml-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/60"><Mic className="h-3 w-3 text-white"/></div>
                      )}
                    </div>
                  ))}
                  {phase === "thinking" && (
                    <div className="flex justify-start">
                      <div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/80"><Sprout className="h-3 w-3 text-white"/></div>
                      <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-sm px-3.5 py-3" style={{background:"rgba(0,0,0,.60)"}}>
                        {[0,1,2].map(i=><span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" style={{animationDelay: (i * 120) + "ms"}}/>)}
                      </div>
                    </div>
                  )}
                  <div ref={voiceEndRef} className="h-0.5 w-full shrink-0" />
                </>
              )}
            </div>

            {/* Voice Orb and status */}
            <div className="shrink-0 pb-3 pt-1">
              <Waveform phase={phase}/>
              <div className="mt-2.5 flex items-center justify-center">
                <VoiceOrb phase={phase} onClick={handleOrb}/>
              </div>
              <p className="mt-2 text-center text-[10px] text-white/50">
                <Sparkles className="mr-1 inline h-2.5 w-2.5 text-violet-300"/>
                {phase === "listening" ? "Listening... speak now" : phase === "speaking" ? "Speaking... tap orb to pause" : phase === "thinking" ? "Analyzing with Gemini..." : "Tap mic to speak"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ VOICE PANEL — mobile ═══════════ */}
      {voiceOpen && (
        <div className="sm:hidden">
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={closeVoice}/>
          <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-3xl"
            style={{height:"84dvh",boxShadow:"0 -8px 40px rgba(0,0,0,.6)",animation:"fwUp .3s cubic-bezier(0.32,0.72,0,1)"}}>
            <BG/>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="h-1 w-10 rounded-full bg-white/30"/></div>
              {panelHeader("Agri Voice",
                "Live voice assistant",
                "linear-gradient(135deg,rgba(79,70,229,.92),rgba(124,58,237,.88))",
                resetVoice, closeVoice, voiceHeaderExtra
              )}
              {voiceSubBar}
              <div ref={voiceScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{scrollbarWidth:"thin"}}>
                {voiceTurns.length===0?(
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <p className="text-sm font-medium text-white/90">Listening automatically...</p>
                    <p className="text-xs text-white/60">Speak your question or tap below</p>
                    <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                      {VOICE_PROMPTS.map(q=><button key={q} onClick={()=>void fireVoiceQuick(q)} className="rounded-full border border-white/20 px-3 py-1 text-[11px] text-white/80 hover:bg-white/20 transition">{q}</button>)}
                    </div>
                  </div>
                ):(
                  <>
                    {voiceTurns.map(t => (
                      <div key={t.id} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
                        {t.role === "assistant" && (
                          <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/80"><Sprout className="h-3 w-3 text-white"/></div>
                        )}
                        <div
                          className={t.role === "user" ? "max-w-[82%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-white" : "max-w-[82%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-white"}
                          style={{background: t.role === "user" ? "linear-gradient(135deg,rgba(79,70,229,.88),rgba(124,58,237,.88))" : "rgba(0,0,0,.60)"}}
                        >
                          {t.role === "assistant" ? <MD content={t.text} small/> : <span className={t.id === -1 ? "text-[12px] italic opacity-80 text-violet-200" : "text-[12px]"}>{t.text}</span>}
                        </div>
                        {t.role === "user" && (
                          <div className="ml-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/60"><Mic className="h-3 w-3 text-white"/></div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="shrink-0 pb-4 pt-1">
                <Waveform phase={phase}/>
                <div className="mt-3 flex items-center justify-center">
                  <VoiceOrb phase={phase} onClick={handleOrb}/>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: "@keyframes fwSlide { from { transform:translateY(24px); opacity:0; } to { transform:translateY(0); opacity:1; } } @keyframes fwUp { from { transform:translateY(100%); } to { transform:translateY(0); } }" }} />
    </>
  );
}
