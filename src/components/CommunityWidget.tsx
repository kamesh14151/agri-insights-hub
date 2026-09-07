import { useState, useEffect, useRef } from "react";
import { Users, X, Send, Loader2, MessageSquare, Heart, Wifi, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Message = {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  content: string;
  likes_count: number;
  created_at: string;
  user_has_liked?: boolean;
};

export function CommunityWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { user } = useAuth();

  const currentUserId = user?.id || (user?.email ? `usr_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}` : "");

  useEffect(() => {
    if (!open) return;

    fetchMessages();

    // Setup high-speed WebSocket Realtime channel
    const channel = supabase.channel("room:community_network", {
      config: {
        broadcast: { self: false },
        presence: { key: currentUserId || "guest" },
      },
    });

    // 1. Instant WebSocket peer-to-peer message broadcast (0ms latency)
    channel.on("broadcast", { event: "new_message" }, ({ payload }) => {
      if (payload && payload.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id || (m.content === payload.content && m.user_id === payload.user_id && Math.abs(new Date(m.created_at).getTime() - new Date(payload.created_at).getTime()) < 3000))) {
            return prev;
          }
          return [...prev, payload];
        });
      }
    });

    // 2. Instant WebSocket like broadcast
    channel.on("broadcast", { event: "like_update" }, ({ payload }) => {
      if (payload && payload.postId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.postId
              ? { ...m, likes_count: Math.max(0, m.likes_count + payload.delta) }
              : m
          )
        );
      }
    });

    // 3. Fallback to Postgres CDC changes (for persistence events)
    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, (payload) => {
      const newPost = payload.new as Message;
      if (newPost) {
        setMessages((prev) => {
          // Replace matching optimistic temp post or add if missing
          const exists = prev.some((m) => m.id === newPost.id || (m.user_id === newPost.user_id && m.content === newPost.content && Math.abs(new Date(m.created_at).getTime() - new Date(newPost.created_at).getTime()) < 5000));
          if (exists) {
            return prev.map(m => (m.content === newPost.content && m.user_id === newPost.user_id) ? { ...newPost, user_has_liked: m.user_has_liked } : m);
          }
          return [...prev, { ...newPost, user_has_liked: false }];
        });
      }
    });

    channel.on("postgres_changes", { event: "*", schema: "public", table: "community_likes" }, () => {
      // Refresh likes quietly
      syncLikes();
    });

    // 4. WebSocket Presence tracking
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      setOnlineCount(Math.max(1, count));
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setWsConnected(true);
        if (currentUserId) {
          channel.track({
            user_name: user?.name || "Farmer",
            online_at: new Date().toISOString(),
          });
        }
      } else {
        setWsConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setWsConnected(false);
    };
  }, [open, currentUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const syncLikes = async () => {
    if (!currentUserId) return;
    try {
      const { data: likes, error } = await supabase
        .from("community_likes")
        .select("post_id")
        .eq("user_id", currentUserId);

      if (!error && likes) {
        const likedIds = new Set(likes.map((l) => l.post_id));
        setMessages((prev) =>
          prev.map((m) => ({ ...m, user_has_liked: likedIds.has(m.id) }))
        );
      }
    } catch (e) {
      /* ignore */
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      const posts = data || [];

      if (currentUserId && posts.length > 0) {
        try {
          const { data: likes } = await supabase
            .from("community_likes")
            .select("post_id")
            .eq("user_id", currentUserId);

          const likedIds = new Set(likes?.map((l) => l.post_id) || []);
          setMessages(posts.map((m) => ({ ...m, user_has_liked: likedIds.has(m.id) })));
        } catch {
          setMessages(posts.map((m) => ({ ...m, user_has_liked: false })));
        }
      } else {
        setMessages(posts.map((m) => ({ ...m, user_has_liked: false })));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to load chat: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const content = newMessage.trim();
    setNewMessage("");

    // 1. Instant Optimistic Message creation
    const tempId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMessage: Message = {
      id: tempId,
      user_id: currentUserId,
      user_name: user.name || "Farmer",
      user_role: user.role || "farmer",
      content,
      likes_count: 0,
      created_at: new Date().toISOString(),
      user_has_liked: false,
    };

    // Immediately show on sender UI (0ms delay)
    setMessages((prev) => [...prev, optimisticMessage]);

    // 2. Broadcast immediately over WebSocket to peers (0ms latency)
    channelRef.current?.send({
      type: "broadcast",
      event: "new_message",
      payload: optimisticMessage,
    });

    // 3. Persist to Postgres database in background
    setSubmitting(true);
    try {
      const { error } = await supabase.from("community_posts").insert({
        user_id: currentUserId,
        user_name: user.name || "Farmer",
        user_role: user.role || "farmer",
        content,
        likes_count: 0,
        comments_count: 0,
      });

      if (error) {
        console.error("Supabase insert error details:", error);
        toast.error(`Error saving message: ${error.message || error.details}`);
      }
    } catch (err: any) {
      console.error("Exception during insert:", err);
      toast.error("Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (msgId: string, hasLiked: boolean) => {
    if (!user || !currentUserId) return toast.error("Please login to like messages.");

    const delta = hasLiked ? -1 : 1;

    // 1. Instant optimistic update locally
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, user_has_liked: !hasLiked, likes_count: Math.max(0, m.likes_count + delta) }
          : m
      )
    );

    // 2. Broadcast like delta over WebSocket
    channelRef.current?.send({
      type: "broadcast",
      event: "like_update",
      payload: { postId: msgId, delta },
    });

    // 3. Persist like in Supabase
    try {
      if (hasLiked) {
        await supabase.from("community_likes").delete().eq("post_id", msgId).eq("user_id", currentUserId);
      } else {
        await supabase.from("community_likes").insert({ post_id: msgId, user_id: currentUserId });
      }
    } catch (err) {
      console.warn("Like action error:", err);
      syncLikes();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[180px] right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 transition-transform hover:scale-105 active:scale-95"
        title="Open Community Network (WebSockets Active)"
      >
        <Users className="h-6 w-6" />
        <span className="absolute top-1 right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[85vh] w-[380px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-[24px] border border-black/[0.08] bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between bg-emerald-600 px-5 py-3.5 text-white">
        <div className="flex items-center gap-3">
          <div className="relative grid h-10 w-10 place-items-center rounded-full bg-white/20">
            <Users className="h-5 w-5 text-white" />
            <span
              className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-emerald-600 ${
                wsConnected ? "bg-emerald-300 animate-pulse" : "bg-amber-300"
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-[15px] font-bold tracking-tight">Farmer's Network</h2>
              <span className="flex items-center gap-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-100">
                <Radio className="h-2.5 w-2.5 text-emerald-200 animate-pulse" /> WS
              </span>
            </div>
            <p className="text-[11px] font-medium text-emerald-100 opacity-90 flex items-center gap-1">
              {wsConnected ? `Live WebSockets · ${onlineCount} active` : "Connecting live..."}
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-[#F0F2F5] p-4 space-y-4"
        style={{
          backgroundImage: "radial-gradient(#d5d8dc 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-4 opacity-60">
            <MessageSquare className="h-10 w-10 text-slate-400 mb-3" />
            <p className="text-sm font-semibold text-slate-600">No messages yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Send a message to start the instant WebSocket conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = Boolean(
              currentUserId &&
                (msg.user_id === currentUserId ||
                  msg.user_id === user?.email ||
                  (user?.name && msg.user_name === user?.name && (!msg.user_id || msg.user_id === "undefined")))
            );
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && (
                  <span className="text-[10px] font-bold text-slate-500 mb-1 ml-1 flex items-center gap-1.5">
                    {msg.user_name}
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-[8px] uppercase tracking-wider">
                      {msg.user_role}
                    </span>
                  </span>
                )}
                <div
                  className={`relative max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-[13px] leading-relaxed ${
                    isMe
                      ? "bg-[#E7FFDB] text-slate-800 rounded-tr-sm border border-[#D1F4C9]"
                      : "bg-white text-slate-800 rounded-tl-sm border border-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                  <div className={`flex items-center gap-2 mt-1.5 ${isMe ? "justify-end" : "justify-between"}`}>
                    <span className="text-[9px] font-medium text-slate-400">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    {!isMe && (
                      <button
                        onClick={() => toggleLike(msg.id, !!msg.user_has_liked)}
                        className={`flex items-center gap-1 text-[10px] font-bold transition ${
                          msg.user_has_liked ? "text-rose-500" : "text-slate-400 hover:text-rose-500"
                        }`}
                      >
                        <Heart className={`h-3 w-3 ${msg.user_has_liked ? "fill-rose-500" : ""}`} />
                        {msg.likes_count > 0 && msg.likes_count}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-[#F0F2F5] px-4 py-3">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Type a message..."
            className="flex-1 max-h-32 min-h-[44px] rounded-2xl border-none bg-white px-4 py-3 text-[13px] shadow-sm outline-none resize-none focus:ring-1 focus:ring-emerald-500"
            rows={1}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
