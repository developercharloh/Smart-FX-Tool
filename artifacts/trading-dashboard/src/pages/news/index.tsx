import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, RefreshCw, ExternalLink, Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  category: string;
  publishedAt: string;
  imageUrl?: string;
}

interface NewsResponse {
  items: NewsItem[];
  cached: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  Reuters: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  MarketWatch: "bg-green-500/10 text-green-400 border-green-500/20",
  FXStreet: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Investing.com": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  ForexLive: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

const CATEGORIES = ["All", "Forex", "Markets", "Business"];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function fetchNews(): Promise<NewsResponse> {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const res = await fetch(`${base}/api/news`);
  if (!res.ok) throw new Error("Failed to fetch news");
  return res.json();
}

export default function MarketNews() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSource, setActiveSource] = useState("All");

  const { data, isLoading, isError, refetch, isFetching } = useQuery<NewsResponse>({
    queryKey: ["market-news"],
    queryFn: fetchNews,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const sources = data ? ["All", ...Array.from(new Set(data.items.map((i) => i.source)))] : ["All"];

  const filtered = (data?.items || []).filter((item) => {
    const catMatch = activeCategory === "All" || item.category === activeCategory;
    const srcMatch = activeSource === "All" || item.source === activeSource;
    return catMatch && srcMatch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">Market News</h1>
          <p className="text-muted-foreground mt-1">
            Live financial news from Reuters, MarketWatch, FXStreet and more — aggregated in real time.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          {isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Category filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Category:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
                activeCategory === cat
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-border/50 hover:border-border"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Source:</span>
          {sources.map((src) => (
            <button
              key={src}
              onClick={() => setActiveSource(src)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
                activeSource === src
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-border/50 hover:border-border"
              )}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      {data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Newspaper className="w-4 h-4" />
          <span>
            Showing <span className="text-foreground font-semibold">{filtered.length}</span> articles
            {data.cached && " (cached)"}
          </span>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-card border border-border/50 rounded-xl p-5 space-y-3 animate-pulse">
              <div className="h-3 bg-muted rounded w-1/3" />
              <div className="h-5 bg-muted rounded w-full" />
              <div className="h-5 bg-muted rounded w-4/5" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
          <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Could not load news right now.</p>
          <p className="text-sm mt-1">Check your connection and try refreshing.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      )}

      {/* News grid */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
          <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No articles match your filters.</p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-card border border-border/50 rounded-xl p-5 flex flex-col gap-3 hover:border-primary/40 hover:bg-card/80 transition-all duration-150"
            >
              {/* Top row */}
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider border",
                    SOURCE_COLORS[item.source] || "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {item.source}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {timeAgo(item.publishedAt)}
                </div>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-3">
                {item.title}
              </h3>

              {/* Description */}
              {item.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tag className="w-3 h-3" />
                  {item.category}
                </div>
                <span className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Read more <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
