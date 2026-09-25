import { useMemo, useState } from 'react';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { useHealthCheck, useGetMarketAnalysis, getGetMarketAnalysisQueryKey, useGetMarketScanner, getGetMarketScannerQueryKey } from '@workspace/api-client-react';
import type { Candle, IndicatorSet, MarketAnalysis, MarketType, ScannerItem, Signal, Timeframe, Trend } from '@workspace/api-client-react';
import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, BookOpen, CheckCircle2, ChevronDown, ChevronUp, CircleAlert, Clock3, Filter, Gauge, Layers3, ListFilter, Menu, Radar, RefreshCw, Search, ShieldAlert, SlidersHorizontal, SortAsc, Wifi } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const timeframes: Timeframe[] = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];
const trendTimeframes: Timeframe[] = ['15m', '1h', '4h', '1d'];
const markets: MarketType[] = ['spot', 'usdm'];

function formatPrice(value: number) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 8 });
}
function formatCompact(value: number) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
function formatTime(value?: string | number) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function signalTone(signal: string) {
  return signal.includes('BULLISH') ? 'up' : signal.includes('BEARISH') || signal === 'INVALIDATED' ? 'down' : 'neutral';
}
function trendTone(trend: Trend) { return trend === 'BULLISH' ? 'up' : trend === 'BEARISH' ? 'down' : 'neutral'; }

function SelectBox({ value, options, onChange, label, testId }: { value: string; options: string[]; onChange: (value: string) => void; label: string; testId: string }) {
  return <label className="flex min-w-[92px] flex-col gap-1.5">
    <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">{label}</span>
    <span className="relative">
      <select data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full appearance-none rounded border border-border bg-secondary px-3 pr-8 text-xs font-semibold text-foreground outline-none transition focus:border-primary">
        {options.map((option) => <option value={option} key={option}>{option}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
    </span>
  </label>;
}

function Brand() {
  return <Link href="/" data-testid="link-brand" className="flex items-center gap-3">
    <span className="relative flex h-8 w-8 items-center justify-center rounded border border-primary/50 bg-primary/10 text-primary">
      <span className="absolute h-3.5 w-3.5 rounded-sm border-2 border-primary rotate-45" />
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
    </span>
    <span className="hidden sm:block">
      <span className="block text-sm font-extrabold tracking-tight text-foreground">REVERSAL</span>
      <span className="block text-[9px] font-semibold uppercase tracking-[.26em] text-muted-foreground">Intelligence</span>
    </span>
  </Link>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const health = useHealthCheck({ query: { refetchInterval: 30000, queryKey: ['/api/healthz'] } });
  const online = health.isSuccess && health.data?.status !== 'unhealthy';
  return <div className="min-h-[100dvh] bg-background">
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-[60px] max-w-[1680px] items-center gap-5 px-4 sm:px-6">
        <Brand />
        <div className="hidden h-6 w-px bg-border md:block" />
        <div className="hidden items-center gap-2 text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground md:flex">
          <span className="text-primary" data-testid="status-market-feed">Read-only market data</span>
        </div>
        <nav className="ml-auto hidden items-center gap-1 sm:flex">
          <Link href="/" data-testid="link-live-signals" className={`rounded px-3 py-2 text-xs font-semibold transition ${location === '/' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Live signals</Link>
          <Link href="/scanner" data-testid="link-scanner" className={`rounded px-3 py-2 text-xs font-semibold transition ${location === '/scanner' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Scanner</Link>
          <span className="rounded px-3 py-2 text-xs font-semibold text-muted-foreground/50">Paper trading <span className="ml-1 text-[9px] uppercase">Soon</span></span>
        </nav>
        <div className="ml-auto flex items-center gap-3 sm:ml-3">
          <div className="hidden items-center gap-2 text-[11px] text-muted-foreground lg:flex"><span className={`status-dot ${online ? '' : 'offline'}`} /> {online ? 'API connected' : health.isLoading ? 'Connecting' : 'API unavailable'}</div>
          <button type="button" aria-label="Open navigation" data-testid="button-open-menu" onClick={() => setMenuOpen(!menuOpen)} className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground sm:hidden"><Menu className="h-4 w-4" /></button>
        </div>
      </div>
      {menuOpen && <div className="border-t border-border bg-card px-4 py-3 sm:hidden">
         <Link href="/" data-testid="link-mobile-live-signals" onClick={() => setMenuOpen(false)} className={`block rounded px-3 py-2 text-xs font-semibold ${location === '/' ? 'bg-secondary' : ''}`}>Live signals</Link>
         <Link href="/scanner" data-testid="link-mobile-scanner" onClick={() => setMenuOpen(false)} className={`mt-1 block rounded px-3 py-2 text-xs font-semibold ${location === '/scanner' ? 'bg-secondary' : ''}`}>Scanner</Link>
        <div className="mt-2 px-3 py-2 text-xs text-muted-foreground">Paper trading is unavailable until implemented.</div>
      </div>}
    </header>
    <main className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:py-7">{children}</main>
    <footer className="mx-auto flex max-w-[1680px] items-center justify-between border-t border-border px-4 py-4 text-[10px] uppercase tracking-[.14em] text-muted-foreground sm:px-6">
      <span>Analysis mode only</span><span>Public exchange data · Non-guaranteed evidence</span>
    </footer>
  </div>;
}

function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
    <div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-primary"><span className="h-px w-5 bg-primary" /> {eyebrow}</div>
      <h1 className="text-2xl font-extrabold tracking-[-.04em] text-foreground sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
    {children}
  </div>;
}

function ScannerSkeleton() {
  return <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <div className="skeleton h-[58px] rounded" key={index} />)}</div>;
}

function SignalBadge({ signal, testId }: { signal: Signal | string; testId?: string }) {
  const tone = signalTone(signal);
  return <span data-testid={testId} className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${tone === 'up' ? 'border-[hsl(155_62%_54%/.25)] bg-up text-up' : tone === 'down' ? 'border-[hsl(3_73%_59%/.25)] bg-down text-down' : 'border-border bg-neutral text-neutral'}`}>
    {tone === 'up' ? <ArrowUpRight className="h-3 w-3" /> : tone === 'down' ? <ArrowDownRight className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}{signal}
  </span>;
}

function TrendPill({ label, trend }: { label: string; trend: Trend }) {
  return <div className="flex items-center gap-2"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span><span className={`mono text-[10px] font-medium ${trendTone(trend) === 'up' ? 'text-up' : trendTone(trend) === 'down' ? 'text-down' : 'text-neutral'}`}>{trend}</span></div>;
}

function OverviewCard({ label, value, detail, tone = 'neutral', icon, testId }: { label: string; value: string; detail: string; tone?: 'up' | 'down' | 'neutral'; icon: React.ReactNode; testId?: string }) {
  return <div className="terminal-panel rounded p-4" data-testid={testId}>
    <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">{label}</span><span className={tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-primary'}>{icon}</span></div>
    <div className="mono tabular text-xl font-medium text-foreground" data-testid={testId ? `${testId}-value` : undefined}>{value}</div><div className="mt-1 text-[10px] text-muted-foreground">{detail}</div>
  </div>;
}

function ScannerTable({ items, sort, onSort }: { items: ScannerItem[]; sort: { key: keyof ScannerItem; direction: 'asc' | 'desc' }; onSort: (key: keyof ScannerItem) => void }) {
  return <div className="overflow-x-auto scrollbar-thin">
    <table className="w-full min-w-[960px] border-collapse text-left">
      <thead><tr className="border-b border-border text-[10px] uppercase tracking-[.13em] text-muted-foreground">
        {([['symbol', 'Market'], ['lastPrice', 'Last price'], ['priceChangePercent', '24h change'], ['quoteVolume', 'Quote volume'], ['signal', 'Evidence'], ['confidence', 'Confidence'], ['bullishScore', 'Bull'], ['bearishScore', 'Bear']] as [keyof ScannerItem, string][]).map(([key, label]) => <th key={String(key)} className="whitespace-nowrap px-4 py-3 font-semibold first:pl-5"><button type="button" data-testid={`button-sort-${String(key)}`} onClick={() => onSort(key)} className="inline-flex items-center gap-1 hover:text-foreground">{label}{sort.key === key ? sort.direction === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" /> : <SortAsc className="h-3 w-3 opacity-40" />}</button></th>)}
      </tr></thead>
      <tbody>{items.map((item) => <tr key={item.symbol} className="group border-b border-border/70 transition hover:bg-secondary/45" data-testid={`row-market-${item.symbol}`}>
        <td className="px-4 py-3.5 first:pl-5"><Link href={`/markets/${item.symbol}`} data-testid={`link-market-${item.symbol}`} className="block"><div className="mono text-sm font-medium text-foreground group-hover:text-primary">{item.baseAsset}<span className="text-muted-foreground">/{item.quoteAsset}</span></div><div className="mt-1 flex gap-2 text-[10px] text-muted-foreground"><span>{item.primaryTimeframe}</span><span>·</span><span>{item.confirmationTimeframe}</span><span>·</span><span>{item.trendTimeframe}</span></div></Link></td>
        <td className="mono tabular px-4 py-3.5 text-xs text-foreground">{formatPrice(item.lastPrice)}</td>
        <td className={`mono tabular px-4 py-3.5 text-xs ${item.priceChangePercent >= 0 ? 'text-up' : 'text-down'}`}>{item.priceChangePercent >= 0 ? '+' : ''}{item.priceChangePercent.toFixed(2)}%</td>
        <td className="mono tabular px-4 py-3.5 text-xs text-foreground">{formatCompact(item.quoteVolume)}</td>
        <td className="px-4 py-3.5"><SignalBadge signal={item.signal} /></td>
        <td className="px-4 py-3.5"><span className="text-xs text-foreground">{item.confidence}</span><div className="mt-1 h-1 w-16 overflow-hidden rounded bg-secondary"><div className="h-full bg-primary" style={{ width: `${Math.min(100, item.bullishScore + item.bearishScore > 0 ? Math.max(item.bullishScore, item.bearishScore) : 0)}%` }} /></div></td>
        <td className="mono tabular px-4 py-3.5 text-xs text-up">{item.bullishScore.toFixed(0)}</td><td className="mono tabular px-4 py-3.5 text-xs text-down">{item.bearishScore.toFixed(0)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function OpportunityCard({ item }: { item: ScannerItem }) {
  const isBull = item.bullishScore >= item.bearishScore;
  const factors = isBull ? item.bullishFactors : item.bearishFactors;
  return <Link href={`/markets/${item.symbol}`} data-testid={`card-opportunity-${item.symbol}`} className="group terminal-panel rounded p-4 transition hover:border-primary/50">
    <div className="flex items-start justify-between gap-3"><div><div className="mono text-base font-medium text-foreground group-hover:text-primary">{item.baseAsset}<span className="text-muted-foreground">/{item.quoteAsset}</span></div><div className="mt-1 text-[10px] text-muted-foreground">Relative volume <span className="mono text-foreground">{item.relativeVolume.toFixed(2)}×</span></div></div><SignalBadge signal={item.signal} /></div>
    <div className="mt-4 flex items-end justify-between"><div><div className="mono text-lg tabular">{formatPrice(item.lastPrice)}</div><div className={`mono mt-1 text-xs ${item.priceChangePercent >= 0 ? 'text-up' : 'text-down'}`}>{item.priceChangePercent >= 0 ? '+' : ''}{item.priceChangePercent.toFixed(2)}%</div></div><div className="text-right"><div className={`mono text-2xl font-medium ${isBull ? 'text-up' : 'text-down'}`}>{isBull ? item.bullishScore.toFixed(0) : item.bearishScore.toFixed(0)}</div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">{isBull ? 'bullish' : 'bearish'} evidence</div></div></div>
    <div className="mt-4 border-t border-border pt-3">{factors.slice(0, 2).map((factor) => <div key={factor} className="mb-1 flex gap-2 text-[10px] leading-4 text-muted-foreground"><span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${isBull ? 'bg-[hsl(155_62%_54%)]' : 'bg-[hsl(3_73%_59%)]'}`} />{factor}</div>)}</div>
  </Link>;
}

const signalPriority: Record<string, number> = {
  'CONFIRMED BULLISH': 6,
  'CONFIRMED BEARISH': 6,
  'STRONG BULLISH': 5,
  'STRONG BEARISH': 5,
  'DEVELOPING BULLISH': 4,
  'DEVELOPING BEARISH': 4,
  WATCH: 2,
  'NO SIGNAL': 1,
  INVALIDATED: 0,
};

function isDirectionalSignal(signal: Signal | string) {
  return signal.includes('BULLISH') || signal.includes('BEARISH');
}

function isBoardSignal(item: ScannerItem) {
  return isDirectionalSignal(item.signal) || item.signal === 'WATCH';
}

function signalScore(item: ScannerItem) {
  return Math.max(item.bullishScore, item.bearishScore);
}

function SignalContext({ item }: { item: ScannerItem }) {
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground" data-testid={`context-signal-${item.symbol}`}>
    <span>Primary <strong className="mono font-medium text-foreground">{item.primaryTimeframe}</strong></span>
    <span>Confirm <strong className="mono font-medium text-foreground">{item.confirmationTimeframe}</strong></span>
    <span>Trend <strong className="mono font-medium text-foreground">{item.trendTimeframe}</strong></span>
  </div>;
}

function LiveSignalCard({ item, featured = false }: { item: ScannerItem; featured?: boolean }) {
  const bullish = item.signal.includes('BULLISH') || (item.signal === 'WATCH' && item.bullishScore >= item.bearishScore);
  const factors = bullish ? item.bullishFactors : item.bearishFactors;
  const factorHeading = item.signal === 'WATCH'
    ? `${bullish ? 'Bullish' : 'Bearish'} evidence lead`
    : `${bullish ? 'Bullish' : 'Bearish'} factors`;
  const tone = bullish ? 'up' : 'down';
  return <Link href={`/markets/${item.symbol}`} data-testid={`card-live-signal-${item.symbol}`} className={`group terminal-panel block rounded p-4 transition hover:border-primary/60 ${featured ? 'border-primary/35 bg-[linear-gradient(135deg,hsl(220_22%_12%),hsl(220_22%_9%))] lg:p-5' : ''}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="mono text-lg font-medium text-foreground group-hover:text-primary" data-testid={`text-live-symbol-${item.symbol}`}>{item.baseAsset}<span className="text-muted-foreground">/{item.quoteAsset}</span></span>
          {featured && <span className="rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-primary">Priority read</span>}
        </div>
        <div className="mt-1"><SignalContext item={item} /></div>
      </div>
      <SignalBadge signal={item.signal} testId={`badge-live-signal-${item.symbol}`} />
    </div>
    <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4">
      <div>
        <div className="mono tabular text-xl text-foreground" data-testid={`text-live-price-${item.symbol}`}>{formatPrice(item.lastPrice)}</div>
        <div className={`mono mt-1 text-xs ${item.priceChangePercent >= 0 ? 'text-up' : 'text-down'}`}>{item.priceChangePercent >= 0 ? '+' : ''}{item.priceChangePercent.toFixed(2)}% / 24h</div>
      </div>
      <div className="text-right">
        <div className={`mono tabular text-2xl font-medium ${tone === 'up' ? 'text-up' : 'text-down'}`} data-testid={`text-live-score-${item.symbol}`}>{signalScore(item).toFixed(0)}</div>
        <div className="text-[9px] uppercase tracking-[.12em] text-muted-foreground">evidence / 100</div>
      </div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 border-y border-border py-3 sm:grid-cols-4">
      <div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Confidence</div><div className="mt-1 text-[11px] text-foreground" data-testid={`text-live-confidence-${item.symbol}`}>{item.confidence}</div></div>
      <div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Rel. volume</div><div className="mono mt-1 text-[11px] text-foreground">{item.relativeVolume.toFixed(2)}×</div></div>
      <div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">RSI</div><div className="mono mt-1 text-[11px] text-foreground">{item.rsi == null ? '—' : item.rsi.toFixed(1)}</div></div>
      <div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">MACD</div><div className={`mono mt-1 text-[11px] ${trendTone(item.macdState) === 'up' ? 'text-up' : trendTone(item.macdState) === 'down' ? 'text-down' : 'text-neutral'}`}>{item.macdState}</div></div>
    </div>
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[.14em] text-muted-foreground"><span>{factorHeading}</span><span className="mono text-muted-foreground">{item.spreadPercent == null ? 'Spread —' : `Spread ${item.spreadPercent.toFixed(3)}%`}</span></div>
      {factors.length ? factors.slice(0, featured ? 3 : 2).map((factor, index) => <div key={`${item.symbol}-${factor}`} className="mb-1.5 flex gap-2 text-[10px] leading-4 text-muted-foreground" data-testid={`text-live-factor-${item.symbol}-${index}`}><span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${tone === 'up' ? 'bg-[hsl(155_62%_54%)]' : 'bg-[hsl(3_73%_59%)]'}`} />{factor}</div>) : <div className="text-[10px] text-muted-foreground">No directional factors returned.</div>}
    </div>
    <div className="mt-4 flex items-center justify-between text-[9px] uppercase tracking-[.12em] text-muted-foreground"><span>Updated {formatTime(item.updatedAt)}</span><span className="inline-flex items-center gap-1 text-primary opacity-80 group-hover:opacity-100">Open analysis <ArrowRight className="h-3 w-3" /></span></div>
  </Link>;
}

function LiveSignals() {
  const [market, setMarket] = useState<MarketType>('spot');
  const [primary, setPrimary] = useState<Timeframe>('15m');
  const [confirmation, setConfirmation] = useState<Timeframe>('1h');
  const [trend, setTrend] = useState<Timeframe>('4h');
  const [contextOpen, setContextOpen] = useState(false);
  const params = useMemo(() => ({ market, primaryTimeframe: primary, confirmationTimeframe: confirmation, trendTimeframe: trend, minimumQuoteVolume: 1000000, limit: 30 }), [market, primary, confirmation, trend]);
  const scanner = useGetMarketScanner(params, { query: { refetchInterval: 15000, staleTime: 10000, queryKey: getGetMarketScannerQueryKey(params) } });
  const snapshot = scanner.data;
  const liveSignals = useMemo(() => (snapshot?.items ?? [])
    .filter(isBoardSignal)
    .sort((a, b) => signalPriority[b.signal] - signalPriority[a.signal] || signalScore(b) - signalScore(a) || b.quoteVolume - a.quoteVolume), [snapshot?.items]);
  const featured = liveSignals[0];
  const bullishCount = liveSignals.filter((item) => item.signal.includes('BULLISH')).length;
  const bearishCount = liveSignals.filter((item) => item.signal.includes('BEARISH')).length;
  const watchCount = liveSignals.filter((item) => item.signal === 'WATCH').length;
  const confirmedCount = liveSignals.filter((item) => item.signal.startsWith('CONFIRMED')).length;
  return <div className="scan-grid -mx-4 -mt-5 min-h-[calc(100dvh-125px)] px-4 pb-10 pt-5 sm:-mx-6 sm:px-6 lg:-mt-7 lg:pt-7">
    <PageHeading eyebrow="Live market read / 01" title="Signals, while they are still signals." description="Live directional evidence from public Binance markets, ranked by signal strength. Open any read to inspect its factors and timeframes.">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded border border-primary/30 bg-primary/10 px-3 py-2 text-[10px] text-primary" data-testid="status-live-signal-feed"><span className={`status-dot ${scanner.isError ? 'offline' : ''}`} /><span className="mono">{scanner.isError ? 'Feed unavailable' : scanner.isFetching ? 'Refreshing' : 'Live signal feed'}</span><span className="text-primary/50">·</span><span className="mono">15s</span></div>
        <Link href="/scanner" data-testid="link-open-full-scanner" className="inline-flex items-center gap-2 rounded border border-border bg-card px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground transition hover:border-primary hover:text-primary">Full scanner <ArrowRight className="h-3 w-3" /></Link>
      </div>
    </PageHeading>
    <section className="terminal-panel mb-4 rounded p-3 sm:mb-5 sm:p-4" data-testid="panel-live-context">
      <button type="button" aria-expanded={contextOpen} aria-controls="live-signal-context-controls" data-testid="button-toggle-live-context" onClick={() => setContextOpen(!contextOpen)} className="flex w-full items-center justify-between gap-3 text-left lg:hidden">
        <span className="flex min-w-0 items-center gap-2"><Radar className="h-3.5 w-3.5 shrink-0 text-primary" /><span className="shrink-0 text-[10px] font-bold uppercase tracking-[.16em] text-primary">Signal context</span><span className="truncate text-[10px] text-muted-foreground">{market} · {primary}/{confirmation}/{trend}</span></span>
        {contextOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      <div id="live-signal-context-controls" className={`${contextOpen ? 'block' : 'hidden'} lg:block`}>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-primary lg:flex"><Radar className="h-3.5 w-3.5" /> Signal context</div>
            <p className="hidden max-w-xl text-[11px] leading-5 text-muted-foreground lg:block">These controls set the evidence windows for this board. Use the full scanner for universe filters, sorting, and the complete no-signal population.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SelectBox label="Market" value={market} options={markets} onChange={(value) => setMarket(value as MarketType)} testId="select-live-market" />
            <SelectBox label="Primary" value={primary} options={timeframes} onChange={(value) => setPrimary(value as Timeframe)} testId="select-live-primary-timeframe" />
            <SelectBox label="Confirm" value={confirmation} options={timeframes} onChange={(value) => setConfirmation(value as Timeframe)} testId="select-live-confirmation-timeframe" />
            <SelectBox label="Trend" value={trend} options={trendTimeframes} onChange={(value) => setTrend(value as Timeframe)} testId="select-live-trend-timeframe" />
          </div>
        </div>
      </div>
    </section>
    {scanner.isLoading && <div className="space-y-3" data-testid="loading-live-signals"><div className="skeleton h-44 rounded" /><div className="grid gap-3 md:grid-cols-2"><div className="skeleton h-64 rounded" /><div className="skeleton h-64 rounded" /></div></div>}
    {scanner.isError && <div className="terminal-panel flex flex-col items-center justify-center rounded px-6 py-16 text-center" data-testid="state-live-signals-error"><CircleAlert className="mb-3 h-7 w-7 text-down" /><h2 className="text-sm font-semibold">Live signal feed unavailable</h2><p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">{scanner.error instanceof Error ? scanner.error.message : 'The scanner could not reach Binance public market data.'} Nothing is inferred while the snapshot is unavailable.</p><button type="button" data-testid="button-retry-live-signals" onClick={() => scanner.refetch()} className="mt-5 inline-flex items-center gap-2 rounded border border-border bg-secondary px-3 py-2 text-xs font-semibold hover:border-primary"><RefreshCw className="h-3.5 w-3.5" /> Retry connection</button></div>}
    {!scanner.isLoading && !scanner.isError && snapshot && <>
      {!liveSignals.length ? <section className="terminal-panel rounded" data-testid="state-live-signals-empty"><div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center"><Activity className="mb-4 h-7 w-7 text-muted-foreground/60" /><h2 className="text-sm font-semibold">No live signals</h2><p className="mt-2 max-w-lg text-xs leading-5 text-muted-foreground">The current verified snapshot returned no bullish, bearish, or WATCH states at these timeframes and volume settings. That is an honest read, not a missing forecast.</p><div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] text-muted-foreground"><span className="rounded bg-secondary px-2 py-1">Primary {primary}</span><span className="rounded bg-secondary px-2 py-1">Confirm {confirmation}</span><span className="rounded bg-secondary px-2 py-1">Trend {trend}</span><span className="rounded bg-secondary px-2 py-1">{snapshot.items.length} markets checked</span></div><Link href="/scanner" data-testid="link-empty-open-scanner" className="mt-6 inline-flex items-center gap-2 rounded border border-border bg-secondary px-3 py-2 text-xs font-semibold hover:border-primary hover:text-primary">Inspect full universe <ArrowRight className="h-3.5 w-3.5" /></Link></div></section> : <section data-testid="list-live-signals">
       <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em]"><Activity className="h-3.5 w-3.5 text-primary" /> Evidence-ranked board</div><div className="mt-1 text-[11px] text-muted-foreground">Directional and WATCH states only · sorted by signal tier, then heuristic score</div></div><div className="mono text-[10px] text-muted-foreground">Updated {formatTime(snapshot.updatedAt)}</div></div>
      <div className="grid gap-4 lg:grid-cols-2">{featured && <LiveSignalCard item={featured} featured />}{liveSignals.slice(1).map((item) => <LiveSignalCard item={item} key={item.symbol} />)}</div>
      </section>}
      <section className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4" data-testid="summary-live-signals">
        <OverviewCard label="Live signals" value={String(liveSignals.length)} detail={`${bullishCount + bearishCount} directional · ${watchCount} watch · $1M volume floor`} tone="neutral" icon={<Radar className="h-4 w-4" />} testId="card-live-signal-count" />
        <OverviewCard label="Confirmed reads" value={String(confirmedCount)} detail="Highest current evidence tier" tone="up" icon={<CheckCircle2 className="h-4 w-4" />} testId="card-live-confirmed-count" />
        <OverviewCard label="Bullish / bearish" value={`${bullishCount} / ${bearishCount}`} detail="Direction of returned signals" tone={bullishCount >= bearishCount ? 'up' : 'down'} icon={bullishCount >= bearishCount ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />} testId="card-live-direction-split" />
        <OverviewCard label="Snapshot" value={formatTime(snapshot.updatedAt)} detail={`${market === 'spot' ? 'Spot' : 'USDⓈ-M'} · refreshed every 15s`} icon={<Clock3 className="h-4 w-4" />} testId="card-live-snapshot-time" />
      </section>
    <div className="mt-5 flex gap-3 rounded border border-[hsl(38_86%_58%/.25)] bg-[hsl(38_86%_58%/.06)] p-4" data-testid="notice-live-signal-boundary"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><div><div className="text-xs font-semibold text-accent">Evidence is not probability</div><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Scores are heuristic evidence from the returned snapshot, not win probabilities or trading instructions. Verify the factors, timeframes, liquidity, and your own risk context before forming a view.</p></div></div>
    </>}
  </div>;
}

function Dashboard() {
  const [market, setMarket] = useState<MarketType>('spot');
  const [primary, setPrimary] = useState<Timeframe>('15m');
  const [confirmation, setConfirmation] = useState<Timeframe>('1h');
  const [trend, setTrend] = useState<Timeframe>('4h');
  const [minVolume, setMinVolume] = useState('1000000');
  const [search, setSearch] = useState('');
  const [signalFilter, setSignalFilter] = useState('ALL');
  const [sort, setSort] = useState<{ key: keyof ScannerItem; direction: 'asc' | 'desc' }>({ key: 'bullishScore', direction: 'desc' });
  const params = useMemo(() => ({ market, primaryTimeframe: primary, confirmationTimeframe: confirmation, trendTimeframe: trend, minimumQuoteVolume: Number(minVolume) || 0, limit: 30, search: search.trim() || undefined }), [market, primary, confirmation, trend, minVolume, search]);
  const scanner = useGetMarketScanner(params, { query: { refetchInterval: 15000, staleTime: 10000, queryKey: getGetMarketScannerQueryKey(params) } });
  const snapshot = scanner.data;
  const filteredItems = useMemo(() => {
    const items = (snapshot?.items ?? []).filter((item) => signalFilter === 'ALL' || item.signal.includes(signalFilter));
    return [...items].sort((a, b) => {
      const av = a[sort.key]; const bv = b[sort.key];
      if (typeof av === 'number' && typeof bv === 'number') return sort.direction === 'desc' ? bv - av : av - bv;
      return sort.direction === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }, [snapshot?.items, signalFilter, sort]);
  const bullish = useMemo(() => [...(snapshot?.items ?? [])].sort((a, b) => b.bullishScore - a.bullishScore).slice(0, 2), [snapshot?.items]);
  const bearish = useMemo(() => [...(snapshot?.items ?? [])].sort((a, b) => b.bearishScore - a.bearishScore).slice(0, 2), [snapshot?.items]);
  const handleSort = (key: keyof ScannerItem) => setSort((current) => current.key === key ? { key, direction: current.direction === 'desc' ? 'asc' : 'desc' } : { key, direction: 'desc' });
  return <div className="scan-grid -mx-4 -mt-5 min-h-[calc(100dvh-125px)] px-4 pb-10 pt-5 sm:-mx-6 sm:px-6 lg:-mt-7 lg:pt-7">
     <PageHeading eyebrow="Full universe / 02" title="Reversal scanner" description="The complete ranked universe of public exchange evidence. Signals describe confluence, not certainty; every row is a starting point for verification.">
      <div className="flex items-center gap-2 rounded border border-border bg-card px-3 py-2 text-[10px] text-muted-foreground"><span className={`status-dot ${scanner.isError ? 'offline' : ''}`} /><span className="mono">{scanner.isError ? 'Feed unavailable' : scanner.isFetching ? 'Refreshing' : 'Live snapshot'}</span><span className="text-border">·</span><span className="mono">{formatTime(snapshot?.updatedAt)}</span></div>
    </PageHeading>
    <section className="terminal-panel mb-5 rounded p-3 sm:p-4" data-testid="panel-scanner-controls">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Scan parameters</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[105px_105px_105px_105px_1fr_170px]">
        <SelectBox label="Market" value={market} options={markets} onChange={(value) => setMarket(value as MarketType)} testId="select-market" />
        <SelectBox label="Primary" value={primary} options={timeframes} onChange={(value) => setPrimary(value as Timeframe)} testId="select-primary-timeframe" />
        <SelectBox label="Confirm" value={confirmation} options={timeframes} onChange={(value) => setConfirmation(value as Timeframe)} testId="select-confirmation-timeframe" />
        <SelectBox label="Trend" value={trend} options={trendTimeframes} onChange={(value) => setTrend(value as Timeframe)} testId="select-trend-timeframe" />
        <label className="flex flex-col gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Min quote volume</span><div className="relative"><span className="absolute left-3 top-2.5 text-xs text-muted-foreground">$</span><input data-testid="input-min-volume" type="number" min="0" value={minVolume} onChange={(event) => setMinVolume(event.target.value)} className="h-9 w-full rounded border border-border bg-secondary pl-7 pr-3 text-xs outline-none focus:border-primary" /></div></label>
        <label className="flex flex-col gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Search symbols</span><div className="relative"><Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><input data-testid="input-search-symbols" type="search" placeholder="BTC, ETH..." value={search} onChange={(event) => setSearch(event.target.value.toUpperCase())} className="h-9 w-full rounded border border-border bg-secondary pl-9 pr-3 text-xs uppercase outline-none focus:border-primary" /></div></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3"><Filter className="h-3.5 w-3.5 text-muted-foreground" /><span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">Evidence filter</span>{['ALL', 'BULLISH', 'BEARISH', 'WATCH'].map((filter) => <button type="button" key={filter} data-testid={`button-filter-${filter.toLowerCase()}`} onClick={() => setSignalFilter(filter)} className={`rounded border px-2.5 py-1.5 text-[10px] font-bold transition ${signalFilter === filter ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>{filter}</button>)}</div>
    </section>
    {scanner.isLoading && <ScannerSkeleton />}
    {scanner.isError && <div className="terminal-panel flex flex-col items-center justify-center rounded px-6 py-16 text-center"><CircleAlert className="mb-3 h-7 w-7 text-down" /><h2 className="text-sm font-semibold">Waiting for live Binance feed</h2><p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">{scanner.error instanceof Error ? scanner.error.message : 'The scanner could not reach Binance public market data.'} No market rows are shown until a verified snapshot is available.</p><button type="button" data-testid="button-retry-scanner" onClick={() => scanner.refetch()} className="mt-5 inline-flex items-center gap-2 rounded border border-border bg-secondary px-3 py-2 text-xs font-semibold hover:border-primary"><RefreshCw className="h-3.5 w-3.5" /> Retry connection</button></div>}
    {!scanner.isLoading && !scanner.isError && snapshot && <><div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <OverviewCard label="Eligible markets" value={String(snapshot.eligibleSymbols)} detail={`${snapshot.supportedSymbols} supported by venue`} icon={<Layers3 className="h-4 w-4" />} />
      <OverviewCard label="Bullish evidence" value={String(snapshot.items.filter((item) => item.signal.includes('BULLISH')).length)} detail="Current ranked universe" tone="up" icon={<ArrowUpRight className="h-4 w-4" />} />
      <OverviewCard label="Bearish evidence" value={String(snapshot.items.filter((item) => item.signal.includes('BEARISH')).length)} detail="Current ranked universe" tone="down" icon={<ArrowDownRight className="h-4 w-4" />} />
      <OverviewCard label="Snapshot age" value={snapshot.updatedAt ? formatTime(snapshot.updatedAt) : '—'} detail={`${market === 'spot' ? 'Spot' : 'USDⓈ-M'} · polling every 15s`} icon={<Clock3 className="h-4 w-4" />} />
    </div>
    <div className="mb-5 grid gap-4 lg:grid-cols-2"><section className="terminal-panel rounded p-4"><div className="mb-3 flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-up">Highest bullish evidence</div><div className="mt-1 text-xs text-muted-foreground">Review confluence before forming a thesis.</div></div><ArrowUpRight className="h-4 w-4 text-up" /></div>{bullish.length ? <div className="grid gap-3 sm:grid-cols-2">{bullish.map((item) => <OpportunityCard item={item} key={item.symbol} />)}</div> : <EmptyState compact text="No bullish evidence in this snapshot." />}</section><section className="terminal-panel rounded p-4"><div className="mb-3 flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-down">Highest bearish evidence</div><div className="mt-1 text-xs text-muted-foreground">Downside evidence is not a short instruction.</div></div><ArrowDownRight className="h-4 w-4 text-down" /></div>{bearish.length ? <div className="grid gap-3 sm:grid-cols-2">{bearish.map((item) => <OpportunityCard item={item} key={item.symbol} />)}</div> : <EmptyState compact text="No bearish evidence in this snapshot." />}</section></div>
    <section className="terminal-panel overflow-hidden rounded"><div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em]"><ListFilter className="h-3.5 w-3.5 text-primary" /> Ranked scanner</div><div className="mt-1 text-[11px] text-muted-foreground">{filteredItems.length} visible rows · click any symbol for detailed analysis</div></div><div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Gauge className="h-3.5 w-3.5" /> Read-only · no order execution</div></div>{filteredItems.length ? <ScannerTable items={filteredItems} sort={sort} onSort={handleSort} /> : <EmptyState text="No eligible markets match these filters." />}</section>
    <div className="mt-5 flex gap-3 rounded border border-[hsl(38_86%_58%/.25)] bg-[hsl(38_86%_58%/.06)] p-4"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><div><div className="text-xs font-semibold text-accent">Interpretation boundary</div><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Reversal Intelligence presents public-market patterns and indicator confluence. It does not predict outcomes, guarantee returns, or account for your position, leverage, liquidity, or risk tolerance.</p></div></div>
    </>}
  </div>;
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={`flex flex-col items-center justify-center text-center ${compact ? 'min-h-[120px]' : 'min-h-[230px]'} px-5`}><Activity className="mb-3 h-5 w-5 text-muted-foreground/60" /><span className="text-xs text-muted-foreground">{text}</span></div>;
}

function MiniChart({ candles, support, resistance }: { candles: Candle[]; support?: number | null; resistance?: number | null }) {
  const [showEma, setShowEma] = useState(true);
  const [showVwap, setShowVwap] = useState(false);
  const [showBands, setShowBands] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const data = candles.slice(-80);
  const overlayValues = useMemo(() => {
    const closes = candles.map((candle) => candle.close);
    const ema20: (number | null)[] = Array(closes.length).fill(null);
    if (closes.length >= 20) {
      let previous = closes.slice(0, 20).reduce((sum, value) => sum + value, 0) / 20;
      ema20[19] = previous;
      for (let index = 20; index < closes.length; index += 1) {
        previous = (closes[index] - previous) * (2 / 21) + previous;
        ema20[index] = previous;
      }
    }
    const vwap: (number | null)[] = Array(closes.length).fill(null);
    const upper: (number | null)[] = Array(closes.length).fill(null);
    const lower: (number | null)[] = Array(closes.length).fill(null);
    for (let index = 0; index < candles.length; index += 1) {
      const window = candles.slice(Math.max(0, index - 19), index + 1);
      const typicalVolume = window.reduce((sum, candle) => sum + candle.volume, 0);
      if (typicalVolume > 0) {
        vwap[index] = window.reduce(
          (sum, candle) => sum + ((candle.high + candle.low + candle.close) / 3) * candle.volume,
          0,
        ) / typicalVolume;
      }
      if (window.length === 20) {
        const average = window.reduce((sum, candle) => sum + candle.close, 0) / 20;
        const deviation = Math.sqrt(window.reduce((sum, candle) => sum + (candle.close - average) ** 2, 0) / 20);
        upper[index] = average + 2 * deviation;
        lower[index] = average - 2 * deviation;
      }
    }
    const start = Math.max(0, candles.length - 80);
    return {
      ema: ema20.slice(start),
      vwap: vwap.slice(start),
      upper: upper.slice(start),
      lower: lower.slice(start),
    };
  }, [candles]);
  if (!data.length) return <EmptyState text="No candle history returned for this market." />;

  const series = [
    ...data.flatMap((candle) => [candle.high, candle.low]),
    ...(showEma ? overlayValues.ema.filter((value): value is number => value !== null) : []),
    ...(showVwap ? overlayValues.vwap.filter((value): value is number => value !== null) : []),
    ...(showBands ? overlayValues.upper.filter((value): value is number => value !== null) : []),
    ...(showBands ? overlayValues.lower.filter((value): value is number => value !== null) : []),
    ...(support ? [support] : []),
    ...(resistance ? [resistance] : []),
  ];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const left = 3;
  const right = 98;
  const top = 7;
  const bottom = 81;
  const x = (index: number) => left + ((index + 0.5) / data.length) * (right - left);
  const y = (price: number) => top + ((max - price) / range) * (bottom - top);
  const linePath = (values: (number | null)[]) => values
    .map((value, index) => value === null ? '' : `${index === 0 || values[index - 1] === null ? 'M' : 'L'} ${x(index).toFixed(2)} ${y(value).toFixed(2)}`)
    .filter(Boolean)
    .join(' ');
  const selected = data[hoverIndex ?? data.length - 1] ?? data[data.length - 1];
  const candleWidth = Math.max(0.42, ((right - left) / data.length) * 0.62);
  const toggleClass = (active: boolean) => `rounded border px-2 py-1 text-[9px] font-semibold transition ${active ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`;

  return <div className="relative w-full overflow-hidden rounded border border-border bg-[hsl(220_24%_7%/.65)] p-3">
    <div className="mb-2 flex min-h-7 flex-wrap items-center justify-between gap-2">
      <div className="mono tabular flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-muted-foreground" aria-live="polite">
        <span>{new Date(selected.openTime).toLocaleString()}</span><span>O {formatPrice(selected.open)}</span><span>H {formatPrice(selected.high)}</span><span>L {formatPrice(selected.low)}</span><span>C {formatPrice(selected.close)}</span><span>V {formatCompact(selected.volume)}</span>
      </div>
      <div className="flex gap-1">
        <button type="button" aria-pressed={showEma} onClick={() => setShowEma(!showEma)} className={toggleClass(showEma)}>EMA 20</button>
        <button type="button" aria-pressed={showVwap} onClick={() => setShowVwap(!showVwap)} className={toggleClass(showVwap)}>VWAP</button>
        <button type="button" aria-pressed={showBands} onClick={() => setShowBands(!showBands)} className={toggleClass(showBands)}>Bollinger</button>
      </div>
    </div>
    <div className="relative h-[250px] sm:h-[290px]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Interactive candlestick chart with optional EMA, VWAP, and Bollinger Band overlays" className="h-full w-full">
        {[0, 1, 2, 3].map((step) => {
          const yPosition = top + (step / 3) * (bottom - top);
          const price = max - (step / 3) * range;
          return <line key={step} x1={left} x2={right} y1={yPosition} y2={yPosition} stroke="hsl(220 14% 25% / .7)" strokeDasharray="1.5 1.5" vectorEffect="non-scaling-stroke" />;
        })}
        {support != null && support >= min && support <= max && <line x1={left} x2={right} y1={y(support)} y2={y(support)} stroke="hsl(155 62% 54% / .7)" strokeDasharray="3 2" vectorEffect="non-scaling-stroke"><title>Support {formatPrice(support)}</title></line>}
        {resistance != null && resistance >= min && resistance <= max && <line x1={left} x2={right} y1={y(resistance)} y2={y(resistance)} stroke="hsl(3 73% 59% / .7)" strokeDasharray="3 2" vectorEffect="non-scaling-stroke"><title>Resistance {formatPrice(resistance)}</title></line>}
        {data.map((candle, index) => {
          const rising = candle.close >= candle.open;
          const color = rising ? 'hsl(155 62% 54%)' : 'hsl(3 73% 59%)';
          const bodyTop = Math.min(y(candle.open), y(candle.close));
          const bodyHeight = Math.max(0.35, Math.abs(y(candle.open) - y(candle.close)));
          return <g key={candle.openTime} onMouseEnter={() => setHoverIndex(index)} onFocus={() => setHoverIndex(index)}>
            <line x1={x(index)} x2={x(index)} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth=".55" vectorEffect="non-scaling-stroke" />
            <rect x={x(index) - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} fill={rising ? color : 'hsl(3 73% 59% / .18)'} stroke={color} strokeWidth=".45" vectorEffect="non-scaling-stroke">
              <title>{new Date(candle.openTime).toLocaleString()} · O {formatPrice(candle.open)} · H {formatPrice(candle.high)} · L {formatPrice(candle.low)} · C {formatPrice(candle.close)} · Volume {formatCompact(candle.volume)}</title>
            </rect>
          </g>;
        })}
        {showBands && <><path d={linePath(overlayValues.upper)} fill="none" stroke="hsl(213 72% 67% / .7)" strokeWidth=".7" vectorEffect="non-scaling-stroke" /><path d={linePath(overlayValues.lower)} fill="none" stroke="hsl(213 72% 67% / .7)" strokeWidth=".7" vectorEffect="non-scaling-stroke" /></>}
        {showVwap && <path d={linePath(overlayValues.vwap)} fill="none" stroke="hsl(38 86% 58%)" strokeWidth=".9" vectorEffect="non-scaling-stroke" />}
        {showEma && <path d={linePath(overlayValues.ema)} fill="none" stroke="hsl(186 78% 48%)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
      </svg>
    </div>
    <div className="mt-2 flex justify-between text-[9px] text-muted-foreground"><span>{new Date(data[0].openTime).toLocaleString()}</span><span>{data.length} candles · hover to inspect OHLCV</span><span>{new Date(data[data.length - 1].openTime).toLocaleString()}</span></div>
  </div>;
}

function IndicatorGrid({ indicators }: { indicators: IndicatorSet }) {
  const values: [string, number | null, string][] = [['RSI', indicators.rsi, ''], ['MACD', indicators.macd, ''], ['MACD hist.', indicators.macdHistogram, ''], ['ATR', indicators.atr, ''], ['VWAP', indicators.vwap, ''], ['ADX', indicators.adx, ''], ['Rel. volume', indicators.relativeVolume, '×'], ['Stoch RSI', indicators.stochasticRsi, '']];
  return <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-border bg-border sm:grid-cols-4">{values.map(([label, value, suffix]) => <div key={label} className="bg-card p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mono tabular mt-2 text-sm text-foreground">{value == null ? '—' : `${value.toFixed(2)}${suffix}`}</div></div>)}</div>;
}

function LevelTable({ levels, tone }: { levels: { price: number; quantity: number }[]; tone: 'up' | 'down' }) {
  return <div className="space-y-1">{levels.slice(0, 6).map((level, index) => <div className="relative flex items-center justify-between overflow-hidden rounded bg-secondary/70 px-2.5 py-1.5 text-[10px]" key={`${level.price}-${index}`}><span className={`absolute inset-y-0 left-0 opacity-10 ${tone === 'up' ? 'bg-up' : 'bg-down'}`} style={{ width: `${Math.min(100, level.quantity / Math.max(...levels.map((item) => item.quantity), 1) * 100)}%` }} /><span className={`mono relative ${tone === 'up' ? 'text-up' : 'text-down'}`}>{formatPrice(level.price)}</span><span className="mono relative text-muted-foreground">{level.quantity.toFixed(4)}</span></div>)}</div>;
}

function MarketDetail() {
  const { symbol = '' } = useParams<{ symbol: string }>();
  const [market, setMarket] = useState<MarketType>('spot');
  const [primary, setPrimary] = useState<Timeframe>('15m');
  const [confirmation, setConfirmation] = useState<Timeframe>('1h');
  const [trend, setTrend] = useState<Timeframe>('4h');
  const params = useMemo(() => ({ symbol: symbol.toUpperCase(), market, primaryTimeframe: primary, confirmationTimeframe: confirmation, trendTimeframe: trend }), [symbol, market, primary, confirmation, trend]);
  const analysis = useGetMarketAnalysis(params, { query: { refetchInterval: 20000, staleTime: 10000, enabled: Boolean(symbol), queryKey: getGetMarketAnalysisQueryKey(params) } });
  const data: MarketAnalysis | undefined = analysis.data;
  const item = data?.analysis;
  const structure = data?.structure;
  const book = data?.orderBook;
  const imbalanceTone = book && book.imbalance >= 0 ? 'up' : 'down';
  return <div className="scan-grid -mx-4 -mt-5 min-h-[calc(100dvh-125px)] px-4 pb-10 pt-5 sm:-mx-6 sm:px-6 lg:-mt-7 lg:pt-7">
     <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href="/" data-testid="link-return-live-signals" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Return to live signals</Link><div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 rounded border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary"><BookOpen className="h-3 w-3" /> Analysis mode</span><span className="mono text-[10px] text-muted-foreground">{analysis.isFetching ? 'Updating' : `Updated ${formatTime(item?.updatedAt)}`}</span></div></div>
     <PageHeading eyebrow="Market detail / 03" title={item ? `${item.baseAsset}/${item.quoteAsset}` : symbol.toUpperCase()} description="Detailed candle, indicator, structure, divergence, and order-book context for one public market. No trading actions are available.">
      <div className="flex flex-wrap items-end gap-3"><SelectBox label="Market" value={market} options={markets} onChange={(value) => setMarket(value as MarketType)} testId="select-analysis-market" /><SelectBox label="Primary" value={primary} options={timeframes} onChange={(value) => setPrimary(value as Timeframe)} testId="select-analysis-primary" /><SelectBox label="Confirm" value={confirmation} options={timeframes} onChange={(value) => setConfirmation(value as Timeframe)} testId="select-analysis-confirmation" /><SelectBox label="Trend" value={trend} options={trendTimeframes} onChange={(value) => setTrend(value as Timeframe)} testId="select-analysis-trend" /></div>
    </PageHeading>
    {analysis.isLoading && <div className="space-y-4"><div className="skeleton h-24 rounded" /><div className="skeleton h-[300px] rounded" /><div className="grid gap-4 md:grid-cols-2"><div className="skeleton h-48 rounded" /><div className="skeleton h-48 rounded" /></div></div>}
    {analysis.isError && <div className="terminal-panel flex flex-col items-center justify-center rounded px-6 py-16 text-center"><CircleAlert className="mb-3 h-7 w-7 text-down" /><h2 className="text-sm font-semibold">Analysis unavailable</h2><p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">{analysis.error instanceof Error ? analysis.error.message : `No verified analysis was returned for ${symbol.toUpperCase()}.`} No market values are shown unless Binance returns a current verified snapshot.</p><button type="button" data-testid="button-retry-analysis" onClick={() => analysis.refetch()} className="mt-5 inline-flex items-center gap-2 rounded border border-border bg-secondary px-3 py-2 text-xs font-semibold hover:border-primary"><RefreshCw className="h-3.5 w-3.5" /> Retry analysis</button></div>}
    {!analysis.isLoading && !analysis.isError && data && item && structure && book && <><section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><div className="terminal-panel rounded p-4 xl:col-span-2"><div className="flex items-start justify-between"><div><span className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">Last price</span><div className="mono tabular mt-2 text-2xl text-foreground">{formatPrice(item.lastPrice)}</div></div><div className={`mono text-sm ${item.priceChangePercent >= 0 ? 'text-up' : 'text-down'}`}>{item.priceChangePercent >= 0 ? '+' : ''}{item.priceChangePercent.toFixed(2)}%</div></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2"><TrendPill label="Primary" trend={item.primaryTrend} /><TrendPill label="Confirm" trend={item.confirmationTrend} /><TrendPill label="Higher" trend={item.higherTimeframeTrend} /></div></div><OverviewCard label="Signal" value={item.signal} detail={`${item.confidence} confidence label`} tone={signalTone(item.signal) as 'up' | 'down' | 'neutral'} icon={<Activity className="h-4 w-4" />} /><OverviewCard label="Bullish score" value={item.bullishScore.toFixed(0)} detail="Evidence score / 100" tone="up" icon={<ArrowUpRight className="h-4 w-4" />} /><OverviewCard label="Bearish score" value={item.bearishScore.toFixed(0)} detail="Evidence score / 100" tone="down" icon={<ArrowDownRight className="h-4 w-4" />} /></section>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,.8fr)]"><section className="terminal-panel rounded p-4"><div className="mb-4 flex items-center justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em]"><BarChart3 className="h-3.5 w-3.5 text-primary" /> Price structure</div><div className="mt-1 text-[11px] text-muted-foreground">{data.candles.length} candles · {primary} interval</div></div><span className="mono text-[10px] text-muted-foreground">PUBLIC OHLCV</span></div><MiniChart candles={data.candles} support={structure.support} resistance={structure.resistance} /><div className="mt-4"><IndicatorGrid indicators={data.indicators} /></div></section>
    <section className="space-y-5"><div className="terminal-panel rounded p-4"><div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em]"><Layers3 className="h-3.5 w-3.5 text-primary" /> Structure</div><div className="mb-4 flex items-center justify-between"><span className="text-xs text-muted-foreground">Trend state</span><span className={`text-xs font-bold ${trendTone(structure.trend) === 'up' ? 'text-up' : trendTone(structure.trend) === 'down' ? 'text-down' : 'text-neutral'}`}>{structure.trend}</span></div><div className="grid grid-cols-2 gap-2 text-[10px]"><div className="rounded bg-secondary p-2.5"><span className="text-muted-foreground">Support</span><div className="mono mt-1">{structure.support == null ? '—' : formatPrice(structure.support)}</div></div><div className="rounded bg-secondary p-2.5"><span className="text-muted-foreground">Resistance</span><div className="mono mt-1">{structure.resistance == null ? '—' : formatPrice(structure.resistance)}</div></div><div className="rounded bg-secondary p-2.5"><span className="text-muted-foreground">Higher highs</span><div className="mono mt-1">{structure.higherHighs}</div></div><div className="rounded bg-secondary p-2.5"><span className="text-muted-foreground">Lower lows</span><div className="mono mt-1">{structure.lowerLows}</div></div></div><div className={`mt-3 rounded px-3 py-2 text-[10px] ${structure.breakOfStructure ? 'bg-[hsl(38_86%_58%/.1)] text-accent' : 'bg-secondary text-muted-foreground'}`}>{structure.breakOfStructure ? 'Break of structure detected; treat as a context change.' : 'No break of structure reported in this snapshot.'}</div></div><div className="terminal-panel rounded p-4"><div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em]"><Activity className="h-3.5 w-3.5 text-primary" /> Divergence</div><div className="flex gap-2">{data.divergence.bullish && <span className="rounded border border-[hsl(155_62%_54%/.3)] bg-up px-2 py-1 text-[10px] font-bold text-up">Bullish divergence</span>}{data.divergence.bearish && <span className="rounded border border-[hsl(3_73%_59%/.3)] bg-down px-2 py-1 text-[10px] font-bold text-down">Bearish divergence</span>}{!data.divergence.bullish && !data.divergence.bearish && <span className="text-xs text-muted-foreground">No directional divergence reported.</span>}</div><div className="mt-3 flex flex-wrap gap-1.5">{data.divergence.indicators.map((indicator) => <span key={indicator} className="rounded bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{indicator}</span>)}</div></div></section></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]"><section className="terminal-panel rounded p-4"><div className="mb-4 flex items-center justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em]"><BookOpen className="h-3.5 w-3.5 text-primary" /> Order book</div><div className="mt-1 text-[11px] text-muted-foreground">Aggregated public depth</div></div><div className={`mono text-xs ${imbalanceTone === 'up' ? 'text-up' : 'text-down'}`}>{book.imbalance >= 0 ? '+' : ''}{book.imbalance.toFixed(2)} imbalance</div></div><div className="mb-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded bg-up p-2.5 text-up">Bid volume <span className="mono float-right">{formatCompact(book.bidVolume)}</span></div><div className="rounded bg-down p-2.5 text-down">Ask volume <span className="mono float-right">{formatCompact(book.askVolume)}</span></div></div><div className="grid gap-4 sm:grid-cols-2"><div><div className="mb-2 text-[9px] uppercase tracking-wider text-up">Bids</div><LevelTable levels={book.bids} tone="up" /></div><div><div className="mb-2 text-[9px] uppercase tracking-wider text-down">Asks</div><LevelTable levels={book.asks} tone="down" /></div></div></section><section className="terminal-panel rounded p-4"><div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em]"><ShieldAlert className="h-3.5 w-3.5 text-accent" /> Evidence notes</div><div className="grid gap-4 sm:grid-cols-2"><div><div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-up">Bullish factors</div>{item.bullishFactors.length ? item.bullishFactors.map((factor) => <div key={factor} className="mb-2 flex gap-2 text-[11px] leading-4 text-muted-foreground"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[hsl(155_62%_54%)]" />{factor}</div>) : <div className="text-[11px] text-muted-foreground">None reported.</div>}</div><div><div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-down">Bearish factors</div>{item.bearishFactors.length ? item.bearishFactors.map((factor) => <div key={factor} className="mb-2 flex gap-2 text-[11px] leading-4 text-muted-foreground"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[hsl(3_73%_59%)]" />{factor}</div>) : <div className="text-[11px] text-muted-foreground">None reported.</div>}</div></div><div className="mt-3 border-t border-border pt-3 text-[10px] leading-5 text-muted-foreground">These factors are descriptive evidence from the current snapshot. They are not a forecast or instruction to buy, sell, short, or use leverage.</div></section></div>
    <div className="mt-5 flex flex-col gap-3 rounded border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><Wifi className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><div className="text-xs font-semibold">Execution controls are intentionally unavailable</div><div className="mt-1 text-[11px] text-muted-foreground">Paper trading is not implemented. Live trading is disabled and this workstation never submits orders.</div></div></div><span className="rounded border border-border px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Read-only</span></div>
    </>}
  </div>;
}

function Router() {
  return <ErrorBoundary resetKey={useLocation()[0]}><Switch><Route path="/" component={LiveSignals} /><Route path="/scanner" component={Dashboard} /><Route path="/markets/:symbol" component={MarketDetail} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Shell><Router /></Shell></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;