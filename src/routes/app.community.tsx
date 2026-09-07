import { createFileRoute } from "@tanstack/react-router";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { MessageSquare, Heart, Share2, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/community")({
  head: () => ({
    meta: [
      { title: "Community — Agrisynapse" },
      { name: "description", content: "Connect with farmers and agronomists." },
    ],
  }),
  component: CommunityPage,
});

type Post = {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_has_liked?: boolean;
};

function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
    
    // Subscribe to realtime changes on posts
    const channel = supabase
      .channel("public:community_posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => {
        fetchPosts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "community_likes" }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      if (user?.id && data) {
        // Fetch likes for this user
        const { data: likes } = await supabase
          .from("community_likes")
          .select("post_id")
          .eq("user_id", user.id);
          
        const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
        setPosts(data.map(p => ({ ...p, user_has_liked: likedPostIds.has(p.id) })));
      } else {
        setPosts(data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load community feed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          user_name: user.name || "Anonymous Farmer",
          user_role: user.role || "farmer",
          content: newPost.trim()
        });
        
      if (error) throw error;
      setNewPost("");
      toast.success("Post published!");
    } catch (err) {
      toast.error("Failed to publish post.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (postId: string, hasLiked: boolean) => {
    if (!user) return toast.error("Please login to like posts.");
    
    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, user_has_liked: !hasLiked, likes_count: p.likes_count + (hasLiked ? -1 : 1) } 
        : p
    ));

    try {
      if (hasLiked) {
        await supabase
          .from("community_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("community_likes")
          .insert({ post_id: postId, user_id: user.id });
      }
    } catch (err) {
      toast.error("Action failed. Try again.");
      fetchPosts(); // Revert on failure
    }
  };

  return (
    <>
      <PageIntro
        index="05 / Connect"
        eyebrow="Farmer Network"
        title="Community Hub"
        subtitle="Share insights, ask questions, and connect with other farmers and agronomists in your region."
      />

      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        {/* Create Post Area */}
        <Panel className="p-4 sm:p-6 bg-card border border-border rounded-3xl shadow-sm">
          <form onSubmit={handlePostSubmit}>
            <div className="flex gap-4">
              <div className="shrink-0">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary font-bold text-sm">
                  {(user?.name ?? "F").charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex-1">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share an update, ask a question, or post a photo..."
                  className="w-full bg-muted/50 border-transparent rounded-2xl px-4 py-3 text-sm focus:bg-background focus:ring-2 focus:ring-primary outline-none transition resize-none min-h-[100px]"
                />
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-2">
                    {/* Placeholder for attachments */}
                  </div>
                  <button 
                    disabled={!newPost.trim() || submitting}
                    type="submit"
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-bold shadow-sm hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Post
                  </button>
                </div>
              </div>
            </div>
          </form>
        </Panel>

        {/* Feed */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-3xl">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-foreground">No posts yet</p>
            <p className="text-sm">Be the first to start a discussion!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <Panel key={post.id} className="p-5 sm:p-6 bg-card border border-border rounded-3xl shadow-sm transition-all hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {post.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-sm text-foreground truncate">{post.user_name}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                          {post.user_role}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <p className="mt-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>
                    
                    <div className="mt-5 flex items-center gap-6">
                      <button 
                        onClick={() => toggleLike(post.id, !!post.user_has_liked)}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition ${
                          post.user_has_liked ? "text-rose-500" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${post.user_has_liked ? "fill-rose-500" : ""}`} />
                        {post.likes_count}
                      </button>
                      <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition">
                        <MessageSquare className="w-4 h-4" />
                        {post.comments_count}
                      </button>
                      <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition ml-auto">
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
