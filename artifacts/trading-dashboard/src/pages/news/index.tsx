import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Newspaper, ExternalLink, Loader2, AlertTriangle, Clock } from "lucide-react";

interface NewsArticle {
  id: string | number;
  title: string;
  source?: string;
  url?: string;
  time?: string;
  publishedAt?: string;
  impact?: string;
}

export default function News() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch news");
        return res.json();
      })
      .then((data) => {
        setNews(Array.isArray(data) ? data : data.news || []);
        setError(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-destructive font-mono uppercase tracking-widest gap-2">
        <AlertTriangle className="w-5 h-5" /> Error loading news feed
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-widest uppercase flex items-center gap-2">
          <Newspaper className="w-6 h-6 text-primary" />
          Market News
        </h1>
        <p className="text-muted-foreground text-sm font-mono mt-1 uppercase">Global Macro Drivers & Headlines</p>
      </div>

      <div className="space-y-4">
        {news.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest">
            No news articles available at this time
          </div>
        ) : (
          news.map((article, i) => (
            <Card key={article.id || i} className="p-4 bg-card/30 border-border/50 hover:bg-card/60 transition-colors group">
              <a href={article.url || "#"} target="_blank" rel="noreferrer" className="block">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      {(article.time || article.publishedAt) && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.time || article.publishedAt}
                        </span>
                      )}
                      {article.source && (
                        <span className="px-2 py-0.5 bg-secondary rounded-sm">
                          {article.source}
                        </span>
                      )}
                      {article.impact && (
                        <span className={`px-2 py-0.5 rounded-sm font-bold ${
                          article.impact.toLowerCase() === 'high' ? 'bg-destructive/20 text-destructive' :
                          article.impact.toLowerCase() === 'medium' ? 'bg-chart-4/20 text-chart-4' :
                          'bg-primary/20 text-primary'
                        }`}>
                          {article.impact} IMPACT
                        </span>
                      )}
                    </div>
                  </div>
                  {article.url && (
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </a>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
