import { useState, useEffect, useRef } from "react";
import { Users, X, Send, Loader2, MessageSquare, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      fetchMessages();
      const channel = supabase
        .channel("public:community_posts")
        .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => {
          fetchMessages();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "community_likes" }, () => {
          fetchMessages();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [open, user?.id, user?.email]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const currentUserId = user?.id || (user?.email ? `usr_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}` : "");

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);
        
      if (error) {
        console.error("Supabase fetch error:", error);
        throw error;
      }
      
      const posts = data || [];

      if (currentUserId && posts.length > 0) {
        try {
          const { data: likes, error: likesError } = await supabase
            .from("community_likes")
            .select("post_id")
            .eq("user_id", currentUserId);
            
          if (!likesError && likes) {
            const likedIds = new Set(likes.map(l => l.post_id));
            setMessages(posts.map(m => ({ ...m, user_has_liked: likedIds.has(m.id) })));
          } else {
            setMessages(posts.map(m => ({ ...m, user_has_liked: false })));
          }
        } catch (likeErr) {
          console.warn("Could not query community_likes:", likeErr);
          setMessages(posts.map(m => ({ ...m, user_has_liked: false })));
        }
      } else {
        setMessages(posts.map(m => ({ ...m, user_has_liked: false })));
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
    
    setSubmitting(true);
    const content = newMessage.trim();
    setNewMessage(""); // Optimistic clear

    try {
      const { error } = await supabase
        .from("community_posts")
        .insert({
          user_id: currentUserId,
          user_name: user.name || "Farmer",
          user_role: user.role || "farmer",
          content: content,
          likes_count: 0,
          comments_count: 0
        });
        
      if (error) {
        console.error("Supabase insert error details:", error);
        toast.error(`Error sending message: ${error.message || error.details || error.hint}`);
        setNewMessage(content); // Revert clear on failure
      } else {
        // Trigger fetch so message displays immediately
        await fetchMessages();
      }
    } catch (err: any) {
      console.error("Exception during insert:", err);
      toast.error("Failed to send message. Network error?");
      setNewMessage(content);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (msgId: string, hasLiked: boolean) => {
    if (!user || !currentUserId) return toast.error("Please login to like messages.");
    
    // Optimistic update
    setMessages(prev => prev.map(m => 
      m.id === msgId 
        ? { ...m, user_has_liked: !hasLiked, likes_count: Math.max(0, m.likes_count + (hasLiked ? -1 : 1)) } 
        : m
    ));

    try {
      if (hasLiked) {
        await supabase.from("community_likes").delete().eq("post_id", msgId).eq("user_id", currentUserId);
      } else {
        await supabase.from("community_likes").insert({ post_id: msgId, user_id: currentUserId });
      }
    } catch (err) {
      console.warn("Like action error:", err);
      fetchMessages(); // Revert on failure
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[180px] right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 transition-transform hover:scale-105 active:scale-95"
        title="Open Community Network"
      >
        <Users className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[85vh] w-[380px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-[24px] border border-black/[0.08] bg-white shadow-2xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between bg-emerald-600 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-white/20">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold tracking-tight">Farmer's Network</h2>
            <p className="text-[11px] font-medium text-emerald-100 opacity-90">Live Community Chat</p>
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
        style={{ backgroundImage: 'radial-gradient(#d5d8dc 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-4 opacity-60">
            <MessageSquare className="h-10 w-10 text-slate-400 mb-3" />
            <p className="text-sm font-semibold text-slate-600">No messages yet</p>
            <p className="text-[11px] text-slate-500 mt-1">Send a message to start the conversation with your local community!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = Boolean(
              currentUserId && (msg.user_id === currentUserId || msg.user_id === user?.email || (user?.name && msg.user_name === user?.name && (!msg.user_id || msg.user_id === "undefined")))
            );
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span className="text-[10px] font-bold text-slate-500 mb-1 ml-1 flex items-center gap-1.5">
                    {msg.user_name}
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-[8px] uppercase tracking-wider">{msg.user_role}</span>
                  </span>
                )}
                <div className={`relative max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-[13px] leading-relaxed ${
                  isMe 
                    ? 'bg-[#E7FFDB] text-slate-800 rounded-tr-sm border border-[#D1F4C9]' 
                    : 'bg-white text-slate-800 rounded-tl-sm border border-slate-100'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  
                  <div className={`flex items-center gap-2 mt-1.5 ${isMe ? 'justify-end' : 'justify-between'}`}>
                    <span className="text-[9px] font-medium text-slate-400">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    
                    {!isMe && (
                      <button 
                        onClick={() => toggleLike(msg.id, !!msg.user_has_liked)}
                        className={`flex items-center gap-1 text-[10px] font-bold transition ${
                          msg.user_has_liked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
                        }`}
                      >
                        <Heart className={`h-3 w-3 ${msg.user_has_liked ? 'fill-rose-500' : ''}`} />
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
              if (e.key === 'Enter' && !e.shiftKey) {
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
            disabled={!newMessage.trim() || submitting}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
