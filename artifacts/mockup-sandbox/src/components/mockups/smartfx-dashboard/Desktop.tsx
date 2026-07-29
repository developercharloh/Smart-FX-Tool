import { useState, useEffect } from "react";
import { AreaChart, Area, LineChart, Line, ResponsiveContainer } from "recharts";
import {
  Bell, TrendingUp, Share2, BarChart2, Activity,
  Home, Zap, Wrench, User, Clock,
  ArrowUpRight, ArrowDownRight, ChevronRight,
} from "lucide-react";

const BG      = "#080B18";
const CARD    = "#0F1229";
const CARD2   = "#131627";
const BORDER  = "rgba(255,255,255,0.07)";
const PURPLE  = "#6C5CE7";
const PURPLT  = "#A29BFE";
const GREEN   = "#00CFA1";
const RED     = "#FF3D57";
const GOLD    = "#FF9F43";
const BLUE    = "#4FC3F7";
const MUTED   = "#636E82";
const TEXT    = "#FFFFFF";
const TEXT2   = "#A0AEC0";

/* ─── Flag helper ──────────────────────────────────────────────── */
function FlagCircle({ pair, size = 44 }: { pair: string; size?: number }) {
  const map: Record<string, string> = {
    "EUR/USD":"eu","GBP/USD":"gb","USD/JPY":"us",
    "EUR/GBP":"eu","AUD/USD":"au","XAU/USD":"xau",
    "NZD/USD":"nz","USD/CAD":"ca","USD/CHF":"ch",
  };
  const code = map[pair];
  if (!code || code === "xau") return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg,#f7971e,#ffd200)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5, flexShrink: 0,
    }}>🥇</div>
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      overflow: "hidden", flexShrink: 0,
      boxShadow: `0 0 0 2px ${BORDER}`,
    }}>
      <img src={`https://flagcdn.com/64x48/${code}.png`} alt={pair}
        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
}

/* ─── Mock data ────────────────────────────────────────────────── */
const STATS = [
  { label:"Total Signals",   val:"1,248",      sub:"+12% vs last month", icon:BarChart2,  color:PURPLE },
  { label:"Win Rate",         val:"87.6%",      sub:"Above average",      icon:Activity,   color:GREEN  },
  { label:"Total Profit",     val:"+$3,482.21", sub:"This month",         icon:TrendingUp, color:BLUE   },
  { label:"Profit Accuracy",  val:"92.3%",      sub:"Top 5% traders",     icon:Activity,   color:GOLD   },
];
const SPARKS: number[][] = [
  [30,45,28,60,52,78,65,90,72,95,80,100],
  [50,60,55,70,65,80,75,85,78,90,85,88],
  [100,180,120,250,200,310,280,380,320,420,390,480],
  [60,72,68,80,75,88,82,90,87,93,90,92],
];

const LIVE = {
  pair:"EUR/USD", desc:"Euro / US Dollar", cat:"MAJOR",
  dir:"BUY", conf:92, tf:"M15",
  entry:1.08234, tp1:1.08560, tp2:1.08890, sl:1.07900,
  trend:"BULLISH", vol:"MEDIUM", time:"11:30 AM",
};

const RECENT = [
  { pair:"GBP/USD", date:"28 May • 10:45 AM", dir:"SELL", entry:"1.27450", tp:"1.27000", sl:"1.27950", result:"WIN",  pnl:"+$42.50" },
  { pair:"XAU/USD", date:"28 May • 09:32 AM", dir:"BUY",  entry:"2336.45", tp:"2345.00", sl:"2328.00", result:"WIN",  pnl:"+$85.00" },
  { pair:"USD/JPY", date:"28 May • 08:15 AM", dir:"BUY",  entry:"156.234", tp:"156.900", sl:"155.700", result:"LOSS", pnl:"-$21.00" },
  { pair:"EUR/GBP", date:"27 May • 16:20 PM", dir:"SELL", entry:"0.85420", tp:"0.85100", sl:"0.85700", result:"WIN",  pnl:"+$32.00" },
  { pair:"AUD/USD", date:"27 May • 14:05 PM", dir:"BUY",  entry:"0.64320", tp:"0.64800", sl:"0.63900", result:"WIN",  pnl:"+$48.00" },
];

/* ─── Candle data ──────────────────────────────────────────────── */
const CANDLES = [
  {o:1.0785,h:1.0800,l:1.0780,c:1.0795},{o:1.0795,h:1.0810,l:1.0790,c:1.0802},
  {o:1.0802,h:1.0812,l:1.0796,c:1.0807},{o:1.0807,h:1.0820,l:1.0800,c:1.0815},
  {o:1.0815,h:1.0825,l:1.0808,c:1.0810},{o:1.0810,h:1.0818,l:1.0803,c:1.0816},
  {o:1.0816,h:1.0828,l:1.0810,c:1.0822},{o:1.0822,h:1.0835,l:1.0815,c:1.0830},
  {o:1.0830,h:1.0842,l:1.0824,c:1.0826},{o:1.0826,h:1.0834,l:1.0818,c:1.0831},
  {o:1.0831,h:1.0845,l:1.0825,c:1.0840},{o:1.0840,h:1.0852,l:1.0833,c:1.0847},
  {o:1.0847,h:1.0858,l:1.0840,c:1.0852},{o:1.0852,h:1.0864,l:1.0844,c:1.0860},
  {o:1.0860,h:1.0870,l:1.0852,c:1.0856},{o:1.0856,h:1.0865,l:1.0848,c:1.0862},
  {o:1.0862,h:1.0875,l:1.0855,c:1.0868},{o:1.0868,h:1.0878,l:1.0860,c:1.08234},
  {o:1.08234,h:1.0875,l:1.0818,c:1.0840},{o:1.0840,h:1.0855,l:1.0830,c:1.0848},
  {o:1.0848,h:1.0860,l:1.0838,c:1.0842},{o:1.0842,h:1.0858,l:1.0835,c:1.0853},
  {o:1.0853,h:1.0865,l:1.0845,c:1.0858},{o:1.0858,h:1.0872,l:1.0850,c:1.0865},
];

function CandleChart() {
  const W = 570, H = 155;
  const ps = CANDLES.flatMap(c=>[c.l,c.h]);
  const lo = Math.min(...ps)-0.0004, hi = Math.max(...ps)+0.0004;
  const sy = (p:number) => H - ((p-lo)/(hi-lo))*H;
  const cw = W/CANDLES.length;
  const curY = sy(1.08234);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
      <polyline
        points={CANDLES.map((c,i)=>`${i*cw+cw/2},${sy((c.o+c.c)/2)}`).join(" ")}
        fill="none" stroke={PURPLE} strokeWidth="2" opacity="0.85"
      />
      {CANDLES.map((c,i)=>{
        const bull=c.c>=c.o, col=bull?GREEN:RED;
        const top=sy(Math.max(c.o,c.c)), bot=sy(Math.min(c.o,c.c));
        return (
          <g key={i}>
            <line x1={i*cw+cw/2} y1={sy(c.h)} x2={i*cw+cw/2} y2={sy(c.l)}
              stroke={col} strokeWidth="0.8"/>
            <rect x={i*cw+cw*0.15} y={top} width={cw*0.7} height={Math.max(bot-top,1.2)}
              fill={col} opacity="0.9" rx="0.6"/>
          </g>
        );
      })}
      <line x1="0" y1={curY} x2={W} y2={curY}
        stroke={GOLD} strokeWidth="0.8" strokeDasharray="4,4" opacity="0.75"/>
      <rect x={W-58} y={curY-9} width={58} height={18} rx="4" fill={GOLD}/>
      <text x={W-29} y={curY+5} textAnchor="middle"
        fontSize="8" fill="#000" fontWeight="700">1.08234</text>
    </svg>
  );
}

function CountdownRing() {
  const [s,setS]=useState(28);
  useEffect(()=>{
    const t=setInterval(()=>setS(p=>p<=0?899:p-1),1000);
    return ()=>clearInterval(t);
  },[]);
  const r=30, circ=2*Math.PI*r;
  const mm=String(Math.floor(s/60)).padStart(2,"0");
  const ss=String(s%60).padStart(2,"0");
  return (
    <div style={{position:"relative",width:80,height:80,flexShrink:0}}>
      <svg width={80} height={80} style={{position:"absolute",inset:0}}>
        <circle cx={40} cy={40} r={r} fill="none" stroke="#1A1E38" strokeWidth="4"/>
        <circle cx={40} cy={40} r={r} fill="none" stroke={PURPLE} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ*(1-s/900)}
          strokeLinecap="round" transform="rotate(-90 40 40)"/>
      </svg>
      <div style={{
        position:"absolute",inset:0,display:"flex",
        flexDirection:"column",alignItems:"center",justifyContent:"center",
      }}>
        <span style={{fontSize:8,color:MUTED,fontWeight:600,letterSpacing:"0.04em"}}>NEXT UPDATE</span>
        <span style={{fontSize:15,color:TEXT,fontWeight:900,marginTop:2}}>{mm}:{ss}</span>
      </div>
    </div>
  );
}

function Gauge() {
  const W=70,H=38,r=26,cx=W/2,cy=38;
  const arc=(s:number,e:number,col:string)=>{
    const sr=(s*Math.PI)/180,er=(e*Math.PI)/180;
    const x1=cx+r*Math.cos(sr-Math.PI),y1=cy+r*Math.sin(sr-Math.PI);
    const x2=cx+r*Math.cos(er-Math.PI),y2=cy+r*Math.sin(er-Math.PI);
    return <path d={`M${x1},${y1} A${r},${r},0,0,1,${x2},${y2}`}
      fill="none" stroke={col} strokeWidth="6" strokeLinecap="round"/>;
  };
  const nA=-15;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible",marginTop:6}}>
      {arc(0,60,RED)}{arc(60,120,GOLD)}{arc(120,180,GREEN)}
      <line x1={cx} y1={cy} x2={cx+(r-3)*Math.cos(nA*Math.PI/180)} y2={cy+(r-3)*Math.sin(nA*Math.PI/180)}
        stroke={TEXT} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="4" fill={TEXT}/>
    </svg>
  );
}

const NAV=[
  {icon:Home,     label:"Dashboard"},
  {icon:Zap,      label:"Signals"},
  {icon:BarChart2,label:"Analysis"},
  {icon:Wrench,   label:"Tools"},
  {icon:User,     label:"Account"},
];

export function Desktop() {
  const [nav,setNav]=useState(0);
  const [tf,setTF]=useState("M15");
  const TFS=["M5","M15","H1","H4","D1"];

  const cell=(lbl:string,val:string,col:string)=>(
    <div style={{background:"#0D1024",borderRadius:10,padding:"8px 10px"}}>
      <div style={{fontSize:8,color:MUTED,marginBottom:4,fontWeight:600}}>{lbl}</div>
      <div style={{fontSize:11,fontWeight:700,color:col}}>{val}</div>
    </div>
  );

  return (
    <div style={{
      display:"flex", width:1280, minHeight:"100vh",
      background:BG, fontFamily:"'Inter',-apple-system,sans-serif", color:TEXT,
    }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────── */}
      <div style={{
        width:220, flexShrink:0, display:"flex", flexDirection:"column",
        padding:"24px 14px", background:"#0A0C1E",
        borderRight:`1px solid ${BORDER}`,
      }}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:32}}>
          <div style={{
            width:42,height:42,borderRadius:12,
            background:"linear-gradient(135deg,#6C5CE7,#4FC3F7)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:22,fontWeight:900,color:"#fff",
            boxShadow:"0 4px 16px rgba(108,92,231,0.45)",
          }}>S</div>
          <div>
            <div style={{fontSize:14,fontWeight:900,lineHeight:1.2}}>
              <span style={{color:PURPLE}}>SMART </span><span>FX</span>
            </div>
            <div style={{fontSize:13,fontWeight:900}}>TOOL</div>
            <div style={{fontSize:8,color:MUTED,marginTop:1}}>Smart Signals. Smarter Trades.</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{display:"flex",flexDirection:"column",gap:3,flex:1}}>
          {NAV.map((n,i)=>(
            <button key={n.label} onClick={()=>setNav(i)} style={{
              display:"flex",alignItems:"center",gap:10,
              padding:"10px 12px",borderRadius:12,border:"none",cursor:"pointer",
              background:nav===i?`${PURPLE}18`:"transparent",
              color:nav===i?PURPLE:MUTED,
              borderLeft:nav===i?`2px solid ${PURPLE}`:"2px solid transparent",
              textAlign:"left",
            }}>
              <n.icon size={16}/>
              <span style={{fontSize:12,fontWeight:600}}>{n.label}</span>
            </button>
          ))}
        </nav>

        {/* Wallets */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,fontWeight:700,color:MUTED,marginBottom:8,letterSpacing:"0.08em"}}>WALLETS</div>
          {[
            {lbl:"Demo Account",val:"$10,000.00",col:BLUE,  icon:"📊"},
            {lbl:"Real Account", val:"$0.00",     col:GREEN, icon:"💰"},
          ].map(w=>(
            <div key={w.lbl} style={{
              background:CARD,borderRadius:12,padding:"10px 12px",marginBottom:8,
              border:`1px solid ${w.col}22`,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <span style={{fontSize:14}}>{w.icon}</span>
                <span style={{fontSize:10,color:MUTED}}>{w.lbl}</span>
              </div>
              <div style={{fontSize:15,fontWeight:800,color:w.col}}>{w.val}</div>
            </div>
          ))}
        </div>

        {/* User card */}
        <div style={{
          background:CARD,borderRadius:12,padding:"10px 12px",
          border:`1px solid ${BORDER}`,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{
              width:34,height:34,borderRadius:"50%",
              background:"linear-gradient(135deg,#6C5CE7,#4FC3F7)",
              display:"flex",alignItems:"center",justifyContent:"center",
              overflow:"hidden",flexShrink:0,
            }}>
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Charloh&backgroundColor=6C5CE7"
                width={34} height={34} alt="avatar"
                style={{borderRadius:"50%",objectFit:"cover"}}
                onError={(e:any)=>{e.target.style.display="none";}}
              />
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:TEXT}}>Trader Charloh</div>
              <span style={{
                fontSize:8,fontWeight:800,padding:"2px 7px",borderRadius:5,
                background:`linear-gradient(90deg,${PURPLE},${PURPLT})`,color:"#fff",
              }}>PREMIUM</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN ─────────────────────────────────────────────────── */}
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>

        {/* Top bar */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"20px 24px",borderBottom:`1px solid ${BORDER}`,
          position:"sticky",top:0,background:BG,zIndex:10,
        }}>
          <div>
            <h1 style={{fontSize:20,fontWeight:900,margin:0}}>Dashboard</h1>
            <p style={{fontSize:11,color:MUTED,margin:"3px 0 0"}}>Welcome back, Trader Charloh 👋</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{
              display:"flex",alignItems:"center",gap:6,
              padding:"7px 14px",borderRadius:10,
              background:CARD,border:`1px solid ${BORDER}`,
              fontSize:11,color:TEXT2,
            }}>
              <div style={{width:7,height:7,borderRadius:"50%",background:GREEN,
                boxShadow:`0 0 5px ${GREEN}`}}/>
              Market Open
            </div>
            <div style={{position:"relative"}}>
              <Bell size={19} color={TEXT2}/>
              <div style={{
                position:"absolute",top:-4,right:-4,width:15,height:15,
                borderRadius:"50%",background:PURPLE,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:8,fontWeight:700,color:"#fff",
              }}>3</div>
            </div>
          </div>
        </div>

        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:20}}>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
            {STATS.map((s,idx)=>{
              const gid=`dg_${s.label.replace(/\s+/g,"")}`;
              return (
                <div key={s.label} style={{
                  background:CARD,borderRadius:20,padding:"16px",
                  border:`1px solid ${BORDER}`,position:"relative",overflow:"hidden",
                  boxShadow:`0 0 0 1px ${s.color}11`,
                }}>
                  <div style={{
                    position:"absolute",top:0,right:0,width:90,height:90,
                    borderRadius:"50%",background:s.color,opacity:0.07,
                    transform:"translate(25px,-25px)",
                  }}/>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{
                      width:40,height:40,borderRadius:12,
                      background:`${s.color}1A`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      boxShadow:`0 0 14px ${s.color}33`,
                    }}>
                      <s.icon size={17} color={s.color}/>
                    </div>
                    <span style={{
                      fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:20,
                      background:`${s.color}15`,color:s.color,
                    }}>Monthly</span>
                  </div>
                  <div style={{fontSize:11,color:MUTED,marginBottom:2}}>{s.label}</div>
                  <div style={{fontSize:24,fontWeight:900,color:TEXT,lineHeight:1.1}}>{s.val}</div>
                  <div style={{fontSize:10,color:MUTED,marginTop:3}}>{s.sub}</div>
                  <div style={{marginTop:12,height:52}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={SPARKS[idx].map((v,i)=>({i,v}))}>
                        <defs>
                          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={s.color} stopOpacity={0.35}/>
                            <stop offset="95%" stopColor={s.color} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke={s.color} strokeWidth={2}
                          fill={`url(#${gid})`} dot={false}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Middle: Live Signal + Chart */}
          <div style={{display:"grid",gridTemplateColumns:"420px 1fr",gap:16}}>

            {/* Live Signal */}
            <div style={{
              background:CARD,borderRadius:20,overflow:"hidden",
              border:`1px solid ${BORDER}`,
              boxShadow:`0 0 30px rgba(108,92,231,0.07)`,
            }}>
              <div style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"14px 18px 12px",borderBottom:`1px solid ${BORDER}`,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:RED,
                    boxShadow:`0 0 6px ${RED}`}}/>
                  <span style={{fontSize:13,fontWeight:800,letterSpacing:"0.06em"}}>🔥 LIVE SIGNAL</span>
                </div>
                <CountdownRing/>
              </div>

              <div style={{padding:"16px 18px"}}>
                <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                  <FlagCircle pair={LIVE.pair} size={56}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:24,fontWeight:900,color:TEXT}}>{LIVE.pair}</div>
                    <div style={{fontSize:11,color:MUTED}}>{LIVE.desc}</div>
                    <span style={{
                      display:"inline-block",marginTop:5,fontSize:9,fontWeight:700,
                      padding:"2px 9px",borderRadius:5,
                      background:`${PURPLE}1A`,color:PURPLT,border:`1px solid ${PURPLE}44`,
                    }}>{LIVE.cat}</span>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:MUTED,marginBottom:3}}>DIRECTION</div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:26,fontWeight:900,color:GREEN}}>{LIVE.dir}</span>
                      <ArrowUpRight size={22} color={GREEN}/>
                    </div>
                    <div style={{fontSize:11,color:MUTED,marginTop:4,marginBottom:3}}>CONFIDENCE</div>
                    <div style={{fontSize:22,fontWeight:900,color:PURPLE}}>{LIVE.conf}%</div>
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:10}}>
                  {cell("ENTRY",    LIVE.entry.toFixed(5), TEXT2)}
                  {cell("TP 1",     LIVE.tp1.toFixed(5),   GREEN)}
                  {cell("TP 2",     LIVE.tp2.toFixed(5),   GREEN)}
                  {cell("STOP LOSS",LIVE.sl.toFixed(5),    RED)}
                  {cell("TF",       LIVE.tf,               PURPLT)}
                </div>

                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
                  {[
                    {icon:TrendingUp,lbl:"TREND",     val:"BULLISH", col:GREEN},
                    {icon:Activity,  lbl:"VOLATILITY",val:"MEDIUM",  col:GOLD},
                    {icon:Clock,     lbl:"TIME",      val:"11:30 AM",col:BLUE},
                  ].map(r=>(
                    <div key={r.lbl} style={{
                      background:CARD2,borderRadius:12,padding:"10px 12px",
                      display:"flex",alignItems:"center",gap:8,
                    }}>
                      <r.icon size={15} color={r.col}/>
                      <div>
                        <div style={{fontSize:8,color:MUTED}}>{r.lbl}</div>
                        <div style={{fontSize:12,fontWeight:700,color:r.col}}>{r.val}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{display:"flex",gap:10}}>
                  <button style={{
                    flex:1,padding:"12px 0",borderRadius:12,border:"none",
                    background:"linear-gradient(90deg,#6C5CE7,#A29BFE)",
                    color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                  }}>
                    <BarChart2 size={14}/> View Full Analysis ↗
                  </button>
                  <button style={{
                    padding:"12px 18px",borderRadius:12,
                    background:CARD2,border:`1px solid ${BORDER}`,
                    color:TEXT2,fontSize:13,fontWeight:700,cursor:"pointer",
                    display:"flex",alignItems:"center",gap:7,
                  }}>
                    <Share2 size={14}/> Share Signal
                  </button>
                </div>
              </div>
            </div>

            {/* Market Overview */}
            <div style={{background:CARD,borderRadius:20,overflow:"hidden",border:`1px solid ${BORDER}`}}>
              <div style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"14px 18px 10px",borderBottom:`1px solid ${BORDER}`,
              }}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,letterSpacing:"0.06em"}}>MARKET OVERVIEW</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8,marginTop:3}}>
                    <span style={{fontSize:12,fontWeight:700}}>EUR/USD • {tf}</span>
                    <span style={{fontSize:11,color:GREEN}}>1.08234 +0.00124 (+0.11%)</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  {TFS.map(t=>(
                    <button key={t} onClick={()=>setTF(t)} style={{
                      fontSize:10,fontWeight:700,padding:"5px 10px",borderRadius:8,border:"none",
                      background:tf===t?PURPLE:CARD2,color:tf===t?"#fff":MUTED,cursor:"pointer",
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              <div style={{padding:"12px 16px 4px"}}><CandleChart/></div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"2px 18px 8px"}}>
                {["18:00","21:00","00:00","03:00","06:00","09:00","12:00"].map(t=>(
                  <span key={t} style={{fontSize:9,color:MUTED}}>{t}</span>
                ))}
              </div>

              <div style={{
                display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,
                padding:"12px 18px 16px",borderTop:`1px solid ${BORDER}`,
              }}>
                {[
                  {lbl:"RSI (14)",    val:"61.45",   d:[45,52,48,58,55,61,59,65,62,61],col:PURPLE},
                  {lbl:"MACD (12,26)",val:"0.00045", d:[-2,-1,0,1,2,3,4,5,4,5],       col:BLUE},
                ].map(ind=>(
                  <div key={ind.lbl}>
                    <div style={{fontSize:9,color:MUTED,marginBottom:2}}>{ind.lbl}</div>
                    <div style={{fontSize:14,fontWeight:700,color:TEXT}}>{ind.val}</div>
                    <div style={{height:30,marginTop:4}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={ind.d.map((v,i)=>({i,v}))}>
                          <Line type="monotone" dataKey="v" stroke={ind.col} strokeWidth={1.5} dot={false}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
                <div>
                  <div style={{fontSize:9,color:MUTED,marginBottom:2}}>TREND</div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:14,fontWeight:700,color:GREEN}}>BULLISH</span>
                    <ArrowUpRight size={15} color={GREEN}/>
                  </div>
                  <div style={{height:30,marginTop:4}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[1,2,3,4,5,6,7,8,7,8,9,10].map((v,i)=>({i,v}))}>
                        <defs>
                          <linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={GREEN} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={GREEN} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke={GREEN} strokeWidth={1.5} fill="url(#tg2)" dot={false}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:9,color:MUTED,marginBottom:2}}>SENTIMENT</div>
                  <div style={{fontSize:14,fontWeight:700,color:GREEN}}>POSITIVE</div>
                  <Gauge/>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Signals */}
          <div style={{background:CARD,borderRadius:20,overflow:"hidden",border:`1px solid ${BORDER}`}}>
            <div style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"16px 20px",borderBottom:`1px solid ${BORDER}`,
            }}>
              <span style={{fontSize:13,fontWeight:800,letterSpacing:"0.06em"}}>RECENT SIGNALS</span>
              <button style={{
                display:"flex",alignItems:"center",gap:4,
                background:"transparent",border:"none",cursor:"pointer",
                fontSize:11,fontWeight:700,color:PURPLE,
              }}>View All <ChevronRight size={13}/></button>
            </div>
            {RECENT.map((sig,i)=>(
              <div key={i} style={{
                display:"flex",alignItems:"center",gap:14,
                padding:"12px 20px",
                borderBottom:i<RECENT.length-1?`1px solid ${BORDER}`:"none",
              }}>
                <FlagCircle pair={sig.pair} size={40}/>
                <div style={{width:100}}>
                  <div style={{fontSize:13,fontWeight:800,color:TEXT}}>{sig.pair}</div>
                  <div style={{fontSize:10,color:MUTED,marginTop:2}}>{sig.date}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4,width:60}}>
                  {sig.dir==="BUY"
                    ?<ArrowUpRight size={15} color={GREEN}/>
                    :<ArrowDownRight size={15} color={RED}/>}
                  <span style={{fontSize:12,fontWeight:700,
                    color:sig.dir==="BUY"?GREEN:RED}}>{sig.dir}</span>
                </div>
                {[
                  {l:"Entry Price",v:sig.entry},
                  {l:"Take Profit",v:sig.tp},
                  {l:"Stop Loss",  v:sig.sl},
                ].map(p=>(
                  <div key={p.l} style={{flex:1}}>
                    <div style={{fontSize:9,color:MUTED}}>{p.l}</div>
                    <div style={{fontSize:12,fontWeight:600,color:TEXT,marginTop:2}}>{p.v}</div>
                  </div>
                ))}
                <div style={{
                  fontSize:12,fontWeight:700,
                  color:sig.pnl.startsWith("+")?GREEN:RED,
                  width:64,textAlign:"right",
                }}>{sig.pnl}</div>
                <span style={{
                  fontSize:11,fontWeight:800,padding:"4px 14px",borderRadius:8,
                  background:sig.result==="WIN"?`${GREEN}18`:`${RED}18`,
                  color:sig.result==="WIN"?GREEN:RED,
                  border:`1px solid ${sig.result==="WIN"?GREEN:RED}44`,
                  minWidth:48,textAlign:"center",
                }}>{sig.result}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
