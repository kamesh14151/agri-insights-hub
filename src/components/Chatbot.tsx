import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { chatWithAgriAi } from "@/lib/ai.functions";
import { MessageCircle, X, Send, Sprout } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

export function Chatbot() {
  const { t, fullName } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm Agri AI. Ask me about crops, pests, soil health, irrigation or weather planning." },
  ]);
  const send = useServerFn(chatWithAgriAi);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, busy]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", content: text } as Msg];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await send({ data: { messages: next, language: fullName } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      console.error(e);
      toast.error(t("toast_failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("chat_open")}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      <div
        className={`fixed bottom-24 right-6 z-50 w-[92vw] sm:w-[400px] h-[560px] max-h-[80vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col origin-bottom-right transition-all duration-200 ${
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Sprout className="w-5 h-5 text-primary" />
          <h3 className="font-serif text-lg">{t("chat_title")}</h3>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="bg-muted text-muted-foreground text-sm px-3.5 py-2.5 rounded-2xl rounded-bl-sm max-w-[60%] inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:120ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:240ms]" />
            </div>
          )}
        </div>
        <form onSubmit={submit} className="p-3 border-t border-border flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chat_placeholder")}
            className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="px-3 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50 inline-flex items-center gap-1.5 text-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
}