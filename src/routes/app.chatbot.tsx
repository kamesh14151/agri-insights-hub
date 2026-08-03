import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Send, Sprout } from "lucide-react";
import { toast } from "sonner";
import { PageIntro } from "@/components/DashboardShell";
import { chatWithAgriAi } from "@/lib/ai.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/chatbot")({
  head: () => ({
    meta: [
      { title: "AI Chatbot — Agrisynapse" },
      { name: "description", content: "Ask an AI agronomist about crops, pests, soil, irrigation and market timing in your language." },
      { property: "og:title", content: "AI Chatbot — Agrisynapse" },
      { property: "og:description", content: "Multilingual AI agronomist for crops, pests, soil and irrigation questions." },
    ],
  }),
  component: ChatbotPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const PROMPTS = [
  "Why are my paddy leaves turning yellow?",
  "Best fertilizer schedule for banana?",
  "How do I control whitefly organically?",
  "When should I sell my turmeric stock?",
];

function ChatbotPage() {
  const { fullName, t } = useI18n();
  const send = useServerFn(chatWithAgriAi);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hello! I'm the Agrisynapse agronomist. Ask me about crops, pests, soil health, irrigation or market timing." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const ask = async (text: string) => {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
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
      <PageIntro
        index="10 / Ask"
        eyebrow="Multilingual AI agronomist"
        title="A crop doctor on call."
        subtitle="Describe what you see in the field and get practical, local advice — in English, Tamil, Hindi, Telugu, Kannada or Malayalam."
      />
      <div className="flex h-[620px] max-h-[76vh] flex-col rounded-2xl border border-border bg-card">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border px-4 pt-3 sm:px-6">
          {PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => ask(p)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              {p}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex gap-2 p-4 sm:px-6"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about crops, pests, soil…"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="px-4 pb-4 text-xs text-muted-foreground sm:px-6">
          <Sprout className="mr-1 inline h-3 w-3 text-primary" /> Advice is guidance, not a substitute for local extension officers.
        </p>
      </div>
    </>
  );
}