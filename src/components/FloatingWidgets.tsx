/**
 * FloatingWidgets
 *
 * Single mount-point for all floating widgets (Chat + Voice).
 * Manages open-state here so:
 *   - When chat panel is open  → voice FAB is hidden
 *   - When voice panel is open → chat FAB is hidden
 *   - Both can never overlap
 *
 * FAB positions (both stack at bottom-right corner):
 *   Chat  → bottom-6  right-6   (rightmost)
 *   Voice → bottom-24 right-6   (above chat FAB, only when chat is closed)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  MessageCircle, Mic, MicOff, X, Send, Sprout,
  Minimize2, RotateCcw, Volume2, VolumeX, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { chatWithOpenRouter } from "@/lib/ai.functions";
import { useI18n } from "@/lib/i18n";

/* ─────────────────────────────────── shared types ─── */
type ChatMsg  = { role: "user" | "assistant"; content: string };
type VoiceTurn = { role: "user" | "assistant"; text: string; id: number };
type Phase    = "idle" | "listening" | "thinking" | "speaking";

const VOICE_LANGS = [
  { code: "ta-IN", label: "தமிழ்",  name: "Tamil"     },
  { code: "en-IN", label: "English", name: "English"   },
  { code: "hi-IN", label: "हिन्दी",  name: "Hindi"     },
  { code: "te-IN", label: "తెలుగు",  name: "Telugu"    },
  { code: "kn-IN", label: "ಕನ್ನಡ",  name: "Kannada"   },
  { code: "ml-IN", label: "മലയാളം",  name: "Malayalam" },
];

const CHAT_PROMPTS  = ["Yellow leaves on paddy?", "Best fertilizer for banana", "Control whitefly organically", "When to sell turmeric?"];
const VOICE_PROMPTS = ["Yellow leaves on my paddy?", "Best time to harvest turmeric", "Control whitefly organically"];

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
    idle: "none", listening: "0 0 28px 6px rgba(239,68,68,.4)",
    thinking: "0 0 28px 6px rgba(245,158,11,.4)", speaking: "0 0 28px 6px rgba(99,102,241,.4)",
  };
  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      {(phase==="listening"||phase==="speaking") && (
        <>
          <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{background:g[phase]}}/>
          <span className="absolute w-28 h-28 rounded-full animate-ping opacity-10 [animation-delay:300ms]" style={{background:g[phase]}}/>
        </>
      )}
      <button onClick={onClick} disabled={phase==="thinking"}
        className="relative z-10 w-20 h-20 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        style={{background:g[phase], boxShadow:glow[phase]}} aria-label="Voice">
        {phase==="idle"      && <Mic     className="h-8 w-8 text-white"/>}
        {phase==="listening" && <MicOff  className="h-8 w-8 text-white"/>}
        {phase==="thinking"  && <span className="flex gap-1.5">{[0,1,2].map(i=><span key={i} className="h-2 w-2 rounded-full bg-white animate-bounce" style={{animationDelay:`${i*150}ms`}}/>)}</span>}
        {phase==="speaking"  && <Volume2 className="h-8 w-8 text-white animate-pulse"/>}
      </button>
    </div>
  );
}

/* ─────────────────────────────────── waveform ─── */
function Waveform({ phase }: { phase: Phase }) {
  const active = phase==="listening"||phase==="speaking";
  const col = phase==="listening"?"#ef4444":phase==="speaking"?"#6366f1":"var(--border)";
  return (
    <div className="flex h-7 items-center justify-center gap-[2px]">
      {Array.from({length:24}).map((_,i)=>(
        <div key={i} className="rounded-full" style={{
          width:2, backgroundColor:col, opacity: active?0.5+0.5*Math.sin(i*.7):0.2,
          height: active?`${4+Math.abs(Math.sin((i/24)*Math.PI*2))*16}px`:"3px",
          animation: active?`fwBar ${0.35+(i%5)*.07}s ease-in-out infinite alternate`:undefined,
          animationDelay:`${i*22}ms`,
        }}/>
      ))}
      <style>{`@keyframes fwBar{from{transform:scaleY(1)}to{transform:scaleY(2.6)}}`}</style>
    </div>
  );
}

/* ─────────────────────────────────── background layers ─── */
const BG = () => (
  <>
    <div aria-hidden style={{position:"absolute",inset:0,backgroundImage:"url('/schwoaze-nature-3526840_1920.jpg')",backgroundSize:"cover",backgroundPosition:"center",opacity:1,zIndex:0}}/>
    <div aria-hidden style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.60)",zIndex:1}}/>
  </>
);

/* ═══════════════════════════════════════════════════════════════════════
   Main wrapper — owns both open states, ensures mutual exclusivity
═══════════════════════════════════════════════════════════════════════ */
export function FloatingWidgets() {
  const { fullName } = useI18n();
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
  const chatInputRef  = useRef<HTMLInputElement>(null);

  /* ── voice state ── */
  const [phase,       setPhase]       = useState<Phase>("idle");
  const [voiceTurns,  setVoiceTurns]  = useState<VoiceTurn[]>([]);
  const [muted,       setMuted]       = useState(false);
  const [lang,        setLang]        = useState(VOICE_LANGS[0]!);
  const [langOpen,    setLangOpen]    = useState(false);
  const [voiceUnread, setVoiceUnread] = useState(0);

  /* stable refs for voice */
  const turnsRef        = useRef<VoiceTurn[]>([]);
  const liveRef         = useRef("");
  const isRespondingRef = useRef(false);
  const recRef          = useRef<any>(null);
  const idRef           = useRef(0);
  const voiceScrollRef  = useRef<HTMLDivElement>(null);
  const langRef         = useRef(lang);
  const mutedRef        = useRef(muted);
  const phaseRef        = useRef<Phase>("idle");

  useEffect(() => { langRef.current  = lang;  }, [lang]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const setVoiceTurnsSafe = useCallback((updater: (prev: VoiceTurn[]) => VoiceTurn[]) => {
    setVoiceTurns(prev => { const next = updater(prev); turnsRef.current = next; return next; });
  }, []);

  /* ── mutual exclusivity ── */
  const openChat  = () => { setChatOpen(true);  setChatMinimized(false); setVoiceOpen(false); setChatUnread(0); };
  const openVoice = () => { setVoiceOpen(true); setChatOpen(false);  setVoiceUnread(0); };
  const closeChat = () => { setChatOpen(false); };
  const closeVoice = () => {
    window.speechSynthesis?.cancel();
    recRef.current?.stop();
    setVoiceOpen(false);
    setPhase("idle"); phaseRef.current = "idle";
  };

  /* ── scrolling ── */
  useEffect(() => {
    if (chatOpen && !chatMinimized) chatScrollRef.current?.scrollTo({top:99999, behavior:"smooth"});
  }, [chatMsgs, chatBusy, chatOpen, chatMinimized]);
  useEffect(() => {
    if (chatOpen && !chatMinimized) setTimeout(()=>chatInputRef.current?.focus(), 300);
  }, [chatOpen, chatMinimized]);
  useEffect(() => {
    if (voiceOpen) setTimeout(()=>voiceScrollRef.current?.scrollTo({top:99999,behavior:"smooth"}), 60);
  }, [voiceTurns, voiceOpen]);

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
  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window) || mutedRef.current) { setPhase("idle"); phaseRef.current="idle"; return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langRef.current.code; u.rate = 0.95;
    u.onstart = () => { setPhase("speaking"); phaseRef.current="speaking"; };
    u.onend   = () => { setPhase("idle");     phaseRef.current="idle";     };
    u.onerror = () => { setPhase("idle");     phaseRef.current="idle";     };
    window.speechSynthesis.speak(u);
  }, []);

  const respondVoice = useCallback(async (text: string) => {
    if (isRespondingRef.current) return;
    isRespondingRef.current = true;
    setPhase("thinking"); phaseRef.current = "thinking";
    const history = turnsRef.current.filter(t=>t.id>0).map(t=>({role:t.role, content:t.text}));
    const msgs = [...history, {role:"user" as const, content:text}];
    try {
      const res = await ask({ data: { messages:msgs, language:langRef.current.name } });
      const ai: VoiceTurn = {role:"assistant", text:res.reply, id:++idRef.current};
      setVoiceTurnsSafe(prev=>[...prev, ai]);
      speak(res.reply);
    } catch { toast.error("Couldn't reach the assistant"); setPhase("idle"); phaseRef.current="idle"; }
    finally { isRespondingRef.current = false; }
  }, [ask, speak, setVoiceTurnsSafe]);

  const startListening = useCallback(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { toast.error("Voice input needs Chrome or Edge"); return; }
    window.speechSynthesis?.cancel();
    liveRef.current = "";
    const rec = new SR();
    rec.lang = langRef.current.code; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as any[]).map((r:any)=>r[0].transcript).join("");
      liveRef.current = text;
      setVoiceTurnsSafe(prev => {
        const last = prev[prev.length-1];
        if (last?.id===-1) return [...prev.slice(0,-1), {...last, text}];
        return [...prev, {role:"user", text, id:-1}];
      });
    };
    rec.onspeechend = () => rec.stop();
    rec.onend = () => {
      const text = liveRef.current.trim();
      if (!text) { setVoiceTurnsSafe(prev=>prev.filter(t=>t.id!==-1)); setPhase("idle"); phaseRef.current="idle"; return; }
      const finalId = ++idRef.current;
      setVoiceTurnsSafe(prev => [...prev.filter(t=>t.id!==-1), {role:"user", text, id:finalId}]);
      void respondVoice(text);
    };
    rec.onerror = (e: any) => {
      if (e.error!=="no-speech") toast.error("Couldn't hear you — try again");
      setVoiceTurnsSafe(prev=>prev.filter(t=>t.id!==-1));
      setPhase("idle"); phaseRef.current="idle";
    };
    recRef.current = rec; rec.start();
    setPhase("listening"); phaseRef.current="listening";
  }, [respondVoice, setVoiceTurnsSafe]);

  const stopListening  = () => recRef.current?.stop();
  const handleOrb      = () => {
    const p = phaseRef.current;
    if      (p==="idle")      startListening();
    else if (p==="listening") stopListening();
    else if (p==="speaking")  { window.speechSynthesis?.cancel(); setPhase("idle"); phaseRef.current="idle"; }
  };
  const resetVoice = () => {
    window.speechSynthesis?.cancel(); recRef.current?.stop();
    isRespondingRef.current=false; liveRef.current="";
    setVoiceTurnsSafe(()=>[]); setPhase("idle"); phaseRef.current="idle";
  };
  const fireVoiceQuick = async (text: string) => {
    if (isRespondingRef.current) return;
    setVoiceTurnsSafe(prev=>[...prev, {role:"user", text, id:++idRef.current}]);
    await respondVoice(text);
  };

  /* ── both panels closed → show FABs ──
     Rule: show voice FAB only when chat panel is NOT open.
           show chat FAB always (it's the rightmost anchor). */
  const chatPanelOpen  = chatOpen && !chatMinimized;
  const showVoiceFAB   = !voiceOpen && !chatPanelOpen;
  const showChatFAB    = !chatOpen || chatMinimized;

  /* ── shared header builder ── */
  const panelHeader = (
    title: string, subtitle: React.ReactNode, accent: string,
    onReset: ()=>void, onClose: ()=>void,
    extra?: React.ReactNode,
    onMinimize?: ()=>void,
  ) => (
    <div className="flex h-14 shrink-0 items-center gap-3 px-4"
      style={{background:accent, backdropFilter:"blur(8px)"}}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Sprout className="h-4 w-4 text-white"/>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-[11px] text-white/75">{subtitle}</p>
      </div>
      {extra}
      <div className="flex items-center gap-1">
        <button onClick={onReset} className="grid h-7 w-7 place-items-center rounded-lg text-white/70 hover:bg-white/15 hover:text-white transition"><RotateCcw className="h-3.5 w-3.5"/></button>
        {onMinimize && <button onClick={onMinimize} className="grid h-7 w-7 place-items-center rounded-lg text-white/70 hover:bg-white/15 hover:text-white transition"><Minimize2 className="h-3.5 w-3.5"/></button>}
        <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-white/70 hover:bg-white/15 hover:text-white transition"><X className="h-3.5 w-3.5"/></button>
      </div>
    </div>
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

      {/* ── VOICE FAB ── only when chat panel is closed ── */}
      {showVoiceFAB && (
        <button
          onClick={openVoice}
          aria-label="Open voice assistant"
          className="fixed z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
          style={{
            bottom: "88px",
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
          <span className="absolute inset-0 rounded-full animate-ping opacity-15"
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
                        {[0,1,2].map(i=><span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" style={{animationDelay:`${i*120}ms`}}/>)}
                      </div>
                    </div>
                  )}
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
                  <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
                    {m.role==="assistant"&&<div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600/80"><Sprout className="h-3 w-3 text-white"/></div>}
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-white backdrop-blur-sm ${m.role==="user"?"rounded-br-sm":"rounded-bl-sm"}`}
                      style={m.role==="user"?{background:"linear-gradient(135deg,rgba(22,101,52,.9),rgba(21,128,61,.9))"}:{background:"rgba(0,0,0,.5)"}}>
                      {m.role==="assistant"?<MD content={m.content}/>:<span className="text-[12px] leading-relaxed whitespace-pre-wrap">{m.content}</span>}
                    </div>
                  </div>
                ))}
                {chatBusy&&<div className="flex justify-start"><div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600/80"><Sprout className="h-3 w-3 text-white"/></div><div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-sm px-3.5 py-3" style={{background:"rgba(0,0,0,.5)"}}>{[0,1,2].map(i=><span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" style={{animationDelay:`${i*120}ms`}}/>)}</div></div>}
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
        <div className="hidden sm:flex fixed bottom-6 right-6 z-50 flex-col rounded-2xl overflow-hidden"
          style={{width:370,height:540,boxShadow:"0 25px 60px rgba(0,0,0,0.55)",backdropFilter:"blur(2px)",animation:"fwSlide .25s ease-out"}}>
          <BG/>
          <div className="relative z-10 flex flex-col h-full">
            {panelHeader("Agri Voice",
              <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full animate-pulse ${phase==="idle"?"bg-green-300":phase==="listening"?"bg-red-300":"bg-amber-300"}`}/>{phase==="idle"?"Ready · tap mic":phase}</span>,
              "linear-gradient(135deg,rgba(79,70,229,0.9),rgba(124,58,237,0.85))",
              resetVoice, closeVoice,
              /* lang + mute */
              <div className="flex items-center gap-1 mr-1">
                <div className="relative">
                  <button onClick={()=>setLangOpen(v=>!v)} className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] text-white/90 hover:bg-white/25 transition">
                    {lang.label}<ChevronDown className="h-3 w-3"/>
                  </button>
                  {langOpen&&(
                    <div className="absolute left-0 top-full z-30 mt-1 w-36 rounded-xl overflow-hidden shadow-2xl" style={{background:"rgba(10,10,20,.96)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,.1)"}}>
                      {VOICE_LANGS.map(l=><button key={l.code} onClick={()=>{setLang(l);setLangOpen(false);}} className={`flex w-full items-center gap-2 px-3 py-2 text-[11px] text-white/80 hover:bg-white/10 transition ${lang.code===l.code?"text-violet-300":""}`}>{l.label}<span className="ml-auto text-white/40">{l.name}</span></button>)}
                    </div>
                  )}
                </div>
                <button onClick={()=>{setMuted(v=>!v);window.speechSynthesis?.cancel();}} className={`grid h-7 w-7 place-items-center rounded-lg transition ${muted?"bg-red-500/30 text-red-300":"text-white/70 hover:bg-white/15 hover:text-white"}`}>
                  {muted?<VolumeX className="h-3.5 w-3.5"/>:<Volume2 className="h-3.5 w-3.5"/>}
                </button>
              </div>,
            )}
            <div ref={voiceScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{scrollbarWidth:"thin"}}>
              {voiceTurns.length===0?(
                <div className="flex h-full flex-col items-center justify-center gap-3 py-4 text-center">
                  <p className="text-sm font-medium text-white/80">Tap the mic and speak</p>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                    {VOICE_PROMPTS.map(q=><button key={q} onClick={()=>void fireVoiceQuick(q)} className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/15 hover:text-white transition active:scale-95">{q}</button>)}
                  </div>
                </div>
              ):(
                <>
                  {voiceTurns.map(t=>(
                    <div key={t.id} className={`flex ${t.role==="user"?"justify-end":"justify-start"}`}>
                      {t.role==="assistant"&&<div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/80"><Sprout className="h-3 w-3 text-white"/></div>}
                      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-white backdrop-blur-sm ${t.role==="user"?"rounded-br-sm":"rounded-bl-sm"}`}
                        style={t.role==="user"?{background:"linear-gradient(135deg,rgba(79,70,229,.85),rgba(124,58,237,.85))"}:{background:"rgba(0,0,0,.55)"}}>
                        {t.role==="assistant"?<MD content={t.text} small/>:<span className={`text-[12px] leading-relaxed ${t.id===-1?"italic opacity-60":""}`}>{t.text}</span>}
                      </div>
                      {t.role==="user"&&<div className="ml-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/60"><Mic className="h-3 w-3 text-white"/></div>}
                    </div>
                  ))}
                  {phase==="thinking"&&<div className="flex justify-start"><div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/80"><Sprout className="h-3 w-3 text-white"/></div><div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-sm px-3.5 py-3" style={{background:"rgba(0,0,0,.55)"}}>{[0,1,2].map(i=><span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" style={{animationDelay:`${i*120}ms`}}/>)}</div></div>}
                </>
              )}
            </div>
            <div className="shrink-0 pb-4 pt-1">
              <Waveform phase={phase}/>
              <div className="mt-3 flex items-center justify-center"><VoiceOrb phase={phase} onClick={handleOrb}/></div>
              <p className="mt-2 text-center text-[10px] text-white/35"><Sprout className="mr-1 inline h-2.5 w-2.5"/>Gemini 2.5 Flash · Voice AI</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ VOICE PANEL — mobile ═══════════ */}
      {voiceOpen && (
        <div className="sm:hidden">
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={closeVoice}/>
          <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-3xl"
            style={{height:"82dvh",boxShadow:"0 -8px 40px rgba(0,0,0,.5)",animation:"fwUp .3s cubic-bezier(0.32,0.72,0,1)"}}>
            <BG/>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="h-1 w-10 rounded-full bg-white/30"/></div>
              {panelHeader("Agri Voice","Ready · tap mic","linear-gradient(135deg,rgba(79,70,229,.9),rgba(124,58,237,.85))",resetVoice,closeVoice)}
              <div ref={voiceScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{scrollbarWidth:"thin"}}>
                {voiceTurns.length===0?(<div className="flex h-full flex-col items-center justify-center gap-2 text-center"><p className="text-sm text-white/80">Tap the mic and speak</p>{VOICE_PROMPTS.map(q=><button key={q} onClick={()=>void fireVoiceQuick(q)} className="rounded-full border border-white/20 px-3 py-1 text-[11px] text-white/70 hover:bg-white/15 hover:text-white transition">{q}</button>)}</div>):(
                  <>{voiceTurns.map(t=><div key={t.id} className={`flex ${t.role==="user"?"justify-end":"justify-start"}`}>{t.role==="assistant"&&<div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/80"><Sprout className="h-3 w-3 text-white"/></div>}<div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-white ${t.role==="user"?"rounded-br-sm":"rounded-bl-sm"}`} style={t.role==="user"?{background:"linear-gradient(135deg,rgba(79,70,229,.85),rgba(124,58,237,.85))"}:{background:"rgba(0,0,0,.55)"}}>{t.role==="assistant"?<MD content={t.text} small/>:<span className={`text-[12px] ${t.id===-1?"italic opacity-60":""}`}>{t.text}</span>}</div>{t.role==="user"&&<div className="ml-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/60"><Mic className="h-3 w-3 text-white"/></div>}</div>)}</>
                )}
              </div>
              <div className="shrink-0 pb-4 pt-1"><Waveform phase={phase}/><div className="mt-3 flex items-center justify-center"><VoiceOrb phase={phase} onClick={handleOrb}/></div></div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fwSlide { from { transform:translateY(24px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes fwUp    { from { transform:translateY(100%); } to { transform:translateY(0); } }
      `}</style>
    </>
  );
}
