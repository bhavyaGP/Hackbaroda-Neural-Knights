import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity, AlertTriangle, MessageSquare, Users,
  Send, Bot, User, Zap, ChevronRight, RefreshCw,
  Shield, Ticket, Brain, Phone, Loader2, TrendingUp,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { api } from "../lib/api";
import { useWebSocket } from "../hooks/useWebSocket";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TIER_BADGE = {
  standard:   "text-sky-400 border-sky-800 bg-sky-950/60",
  premium:    "text-amber-400 border-amber-800 bg-amber-950/60",
  enterprise: "text-violet-400 border-violet-800 bg-violet-950/60",
};

function riskLevel(r) {
  if (r >= 0.75) return "critical";
  if (r >= 0.5)  return "high";
  if (r >= 0.25) return "medium";
  return "low";
}

const RISK_COLOR = {
  low:      "text-emerald-400",
  medium:   "text-amber-400",
  high:     "text-orange-400",
  critical: "text-red-400",
};

const RISK_BG = {
  low:      "bg-emerald-950/30 border-emerald-800/50",
  medium:   "bg-amber-950/30 border-amber-800/50",
  high:     "bg-orange-950/30 border-orange-800/50",
  critical: "bg-red-950/30 border-red-800/50",
};

function SentimentBar({ score }) {
  const pct   = ((score + 1) / 2) * 100;
  const color = score > 0.3 ? "#10b981" : score < -0.3 ? "#ef4444" : "#f59e0b";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] tabular-nums font-medium" style={{ color }}>
        {score > 0 ? "+" : ""}{score.toFixed(2)}
      </span>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, variant = "default" }) {
  const vars = {
    default:  "border-zinc-800 bg-zinc-900",
    emerald:  "border-emerald-800/50 bg-emerald-950/30",
    red:      "border-red-800/50 bg-red-950/20",
    amber:    "border-amber-800/50 bg-amber-950/20",
  };
  const iconColor = {
    default: "text-zinc-400",
    emerald: "text-emerald-400",
    red:     "text-red-400",
    amber:   "text-amber-400",
  };
  return (
    <div className={`rounded-xl border p-4 ${vars[variant]}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon size={16} className={iconColor[variant]} />
        <span className="text-[10px] text-zinc-600">{sub}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-50 tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

// ── Conversation list item ─────────────────────────────────────────────────────

function ConvItem({ conv, selected, onClick }) {
  const risk = riskLevel(conv.churn_risk || 0);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 rounded-xl border transition-all duration-150 ${
        selected
          ? "bg-emerald-950/30 border-emerald-700/50"
          : "bg-zinc-900 border-zinc-800 hover:border-zinc-600"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-zinc-100 truncate">{conv.customer_name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 font-medium ${TIER_BADGE[conv.customer_tier] || TIER_BADGE.standard}`}>
              {conv.customer_tier?.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-zinc-500 truncate">{conv.last_message || "New conversation"}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[10px] font-medium ${RISK_COLOR[risk]}`}>{risk} risk</span>
            <span className="text-[10px] text-zinc-600">{conv.channel}</span>
            <span className="text-[10px] text-zinc-600">{conv.message_count}msg</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
          {risk === "critical" && <AlertTriangle size={13} className="text-red-400 animate-pulse" />}
          {risk === "high"     && <AlertTriangle size={13} className="text-orange-400" />}
          <div className={`w-1.5 h-1.5 rounded-full ${conv.status === "active" ? "bg-emerald-400" : "bg-zinc-600"}`} />
        </div>
      </div>
    </button>
  );
}

// ── Transcript ────────────────────────────────────────────────────────────────

function Transcript({ messages }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (!messages?.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 gap-3">
        <MessageSquare size={36} />
        <p className="text-sm text-zinc-600">Select a conversation</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
      {messages.map((msg, i) => {
        const isAI = msg.role === "assistant";
        return (
          <div key={msg.id || i} className={`flex gap-2 ${isAI ? "" : "flex-row-reverse"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isAI ? "bg-emerald-500" : "bg-zinc-600"}`}>
              {isAI
                ? <Bot size={12} className="text-zinc-950" />
                : <User size={12} className="text-zinc-200" />
              }
            </div>
            <div className={`max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed ${isAI ? "bg-zinc-800 text-zinc-100" : "bg-emerald-700 text-white"}`}>
              {msg.content}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const [conversations,  setConversations]  = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [intelligence,   setIntelligence]   = useState(null);
  const [messages,       setMessages]       = useState([]);
  const [metrics,        setMetrics]        = useState(null);
  const [instruction,    setInstruction]    = useState("");
  const [sending,        setSending]        = useState(false);
  const [sentInstructions, setSentInstructions] = useState([]);
  const [liveEvents,     setLiveEvents]     = useState([]);
  const [calling,        setCalling]        = useState(false);
  const [callStatus,     setCallStatus]     = useState(null);

  const loadConversations = useCallback(async () => {
    setConversations(await api.getConversations());
  }, []);

  const loadMetrics = useCallback(async () => {
    setMetrics(await api.getMetrics());
  }, []);

  const selectConversation = useCallback(async (convId) => {
    setSelectedConvId(convId);
    const [intel, hist] = await Promise.all([
      api.getIntelligence(convId),
      api.getHistory(convId),
    ]);
    setIntelligence(intel);
    setMessages(hist.messages || []);
  }, []);

  useEffect(() => {
    loadConversations();
    loadMetrics();
    const id = setInterval(() => { loadConversations(); loadMetrics(); }, 10000);
    return () => clearInterval(id);
  }, [loadConversations, loadMetrics]);

  const handleWsMessage = useCallback((data) => {
    setLiveEvents((prev) => [{ ...data, id: Date.now() }, ...prev.slice(0, 19)]);

    if (data.event === "message_update") {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversation_id
            ? { ...c, sentiment_score: data.sentiment_score, churn_risk: data.churn_risk, intent: data.intent, last_message: data.last_message }
            : c
        )
      );
      if (data.conversation_id === selectedConvId) {
        setIntelligence((prev) => prev ? { ...prev, churn_risk: data.churn_risk } : prev);
        api.getHistory(data.conversation_id).then((h) => setMessages(h.messages || []));
      }
    }
    if (data.event === "conversation_started") loadConversations();
  }, [selectedConvId, loadConversations]);

  useWebSocket("/api/dashboard/ws", handleWsMessage);

  const sendInstruction = async () => {
    if (!instruction.trim() || !selectedConvId) return;
    setSending(true);
    try {
      await api.intervene(selectedConvId, instruction.trim());
      setSentInstructions((prev) => [
        { text: instruction.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
        ...prev.slice(0, 9),
      ]);
      setInstruction("");
    } finally {
      setSending(false);
    }
  };

  const sentimentData = (intelligence?.sentiment_logs || []).map((s, i) => ({
    i, sentiment: s.sentiment_score, churn: s.churn_risk,
  }));

  const riskInfo = intelligence ? riskLevel(intelligence.churn_risk || 0) : null;

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex flex-col">

      {/* ── Top bar ── */}
      <header className="border-b border-zinc-800 px-5 py-3 flex items-center gap-4 flex-shrink-0 glass">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Brain size={14} className="text-zinc-950" />
          </div>
          <div>
            <p className="font-bold text-sm text-zinc-50 leading-none">CIA Dashboard</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Customer Intelligence Agent</p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </header>

      {/* ── Metrics row ── */}
      {metrics && (
        <div className="px-5 py-3 grid grid-cols-3 md:grid-cols-6 gap-3 border-b border-zinc-800/60 flex-shrink-0">
          <MetricCard icon={Activity}       label="Active"           value={metrics.active_conversations} sub="now"        variant="emerald" />
          <MetricCard icon={AlertTriangle}  label="High Risk"        value={metrics.high_risk_customers}  sub="churn"      variant="red" />
          <MetricCard icon={Ticket}         label="Open Tickets"     value={metrics.open_tickets}          sub="unresolved" variant="amber" />
          <MetricCard icon={TrendingUp}     label="Avg Sentiment"    value={metrics.avg_sentiment > 0 ? `+${metrics.avg_sentiment}` : metrics.avg_sentiment} sub="active" variant={metrics.avg_sentiment >= 0 ? "emerald" : "red"} />
          <MetricCard icon={MessageSquare}  label="Resolved Today"   value={metrics.resolved_today}        sub="closed"     variant="emerald" />
          <MetricCard icon={Users}          label="Total"            value={metrics.total_conversations}   sub="all time"   variant="default" />
        </div>
      )}

      {/* ── 3-column layout ── */}
      <div className="flex-1 flex overflow-hidden px-5 pb-5 pt-4 gap-4 min-h-0">

        {/* Column 1: Conversations */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Conversations</span>
            <button onClick={loadConversations} className="text-zinc-600 hover:text-zinc-300 transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin min-h-0">
            {conversations.length === 0
              ? <p className="text-xs text-zinc-700 text-center py-8">No conversations yet</p>
              : conversations.map((c) => (
                  <ConvItem key={c.id} conv={c} selected={c.id === selectedConvId} onClick={() => selectConversation(c.id)} />
                ))
            }
          </div>

          {/* Live events */}
          <div className="border-t border-zinc-800 pt-3 flex-shrink-0">
            <p className="text-[10px] text-zinc-600 mb-1.5 flex items-center gap-1 font-medium uppercase tracking-wide">
              <Activity size={10} /> Events
            </p>
            <div className="space-y-1 max-h-28 overflow-y-auto scrollbar-thin">
              {liveEvents.slice(0, 8).map((e) => (
                <div key={e.id} className="text-[10px] text-zinc-600 flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-emerald-600 flex-shrink-0" />
                  <span className="truncate">{e.event}: {e.customer_name || e.conversation_id?.slice(0, 8) || ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Live transcript */}
        <div className="flex-1 flex flex-col border border-zinc-800 rounded-xl bg-zinc-900 overflow-hidden min-h-0">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
              <MessageSquare size={13} />
              Live Transcript
              {selectedConvId && (
                <span className="text-zinc-600 font-normal">{selectedConvId.slice(0, 8)}...</span>
              )}
            </span>
            {intelligence && (
              <div className="w-32">
                <SentimentBar score={intelligence.conversation?.sentiment_score || 0} />
              </div>
            )}
          </div>

          <Transcript messages={messages} />

          {/* Intervention panel */}
          <div className="border-t border-zinc-800 p-3.5 flex-shrink-0 space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <Shield size={12} />
              <span className="font-semibold">Owner Intervention</span>
              <span className="text-zinc-600">AI integrates seamlessly</span>
            </div>

            {sentInstructions.length > 0 && (
              <div className="space-y-1 max-h-16 overflow-y-auto scrollbar-thin">
                {sentInstructions.map((s, i) => (
                  <div key={i} className="text-[10px] flex items-start gap-1.5 text-zinc-500">
                    <ChevronRight size={10} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-amber-300/80 flex-1 truncate">{s.text}</span>
                    <span className="text-zinc-700 flex-shrink-0">{s.time}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-600 placeholder-zinc-600 text-zinc-100 transition-colors"
                placeholder='e.g. "Offer 20% discount" or "Escalate to tech team"'
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendInstruction()}
                disabled={!selectedConvId}
              />
              <button
                onClick={sendInstruction}
                disabled={!instruction.trim() || !selectedConvId || sending}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 rounded-lg text-xs font-semibold text-zinc-950 transition-colors flex items-center gap-1 flex-shrink-0"
              >
                <Send size={11} />
                {sending ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>

        {/* Column 3: Customer intelligence */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto scrollbar-thin min-h-0">
          {!intelligence ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 gap-3 py-20">
              <Brain size={36} />
              <p className="text-sm text-center text-zinc-600">Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Customer profile */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3 flex-shrink-0">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Customer Profile</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {intelligence.customer?.name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-zinc-50">{intelligence.customer?.name}</p>
                    <p className="text-xs text-zinc-500">{intelligence.customer?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Tier", value: intelligence.customer?.tier },
                    { label: "LTV", value: `$${intelligence.customer?.lifetime_value?.toLocaleString() || 0}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-zinc-800 rounded-lg p-2.5">
                      <p className="text-[10px] text-zinc-500 mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-zinc-100 capitalize">{value}</p>
                    </div>
                  ))}
                  <div className="bg-zinc-800 rounded-lg p-2.5 col-span-2">
                    <p className="text-[10px] text-zinc-500 mb-1">Products</p>
                    <div className="flex flex-wrap gap-1">
                      {intelligence.customer?.products?.map((p) => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/50">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setCalling(true);
                    setCallStatus(null);
                    try {
                      const r = await api.callCustomer(intelligence.customer?.id);
                      setCallStatus(r.call_sid
                        ? { ok: true,  msg: `Dialing ${intelligence.customer?.name} at ${r.to}` }
                        : { ok: false, msg: r.detail || "Call failed" }
                      );
                    } catch {
                      setCallStatus({ ok: false, msg: "Network error" });
                    } finally {
                      setCalling(false);
                    }
                  }}
                  disabled={calling}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-sm font-semibold text-white transition-colors active:scale-[0.98]"
                >
                  {calling ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
                  {calling ? "Dialing..." : `Call ${intelligence.customer?.name?.split(" ")[0]}`}
                </button>
                {callStatus && (
                  <p className={`text-xs text-center ${callStatus.ok ? "text-emerald-400" : "text-red-400"}`}>
                    {callStatus.msg}
                  </p>
                )}
              </div>

              {/* Churn risk */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2.5 flex-shrink-0">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Churn Risk</p>
                {riskInfo && (
                  <div className={`rounded-lg border px-3 py-2.5 flex items-center justify-between ${RISK_BG[riskInfo]}`}>
                    <span className={`text-xs font-semibold uppercase tracking-wide ${RISK_COLOR[riskInfo]}`}>{riskInfo}</span>
                    <span className={`text-xl font-bold tabular-nums ${RISK_COLOR[riskInfo]}`}>
                      {((intelligence.churn_risk || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                {sentimentData.length > 1 && (
                  <div className="h-20 mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sentimentData}>
                        <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="2 2" />
                        <Line type="monotone" dataKey="sentiment" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Tooltip
                          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                          formatter={(v) => [v.toFixed(2), "Sentiment"]}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* AI recommendations */}
              {intelligence.recommended_actions?.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 flex-shrink-0">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap size={11} className="text-amber-400" /> AI Recommendations
                  </p>
                  <div className="space-y-1.5">
                    {intelligence.recommended_actions.map((a, i) => (
                      <button
                        key={i}
                        onClick={() => setInstruction(a)}
                        className="w-full text-left text-xs px-3 py-2 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 hover:border-emerald-700/50 rounded-lg transition-all text-zinc-400 hover:text-zinc-100 flex items-center gap-2"
                      >
                        <ChevronRight size={11} className="text-emerald-500 flex-shrink-0" />
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Open tickets */}
              {intelligence.tickets?.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 flex-shrink-0">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Ticket size={11} /> Tickets ({intelligence.tickets.length})
                  </p>
                  {intelligence.tickets.slice(0, 3).map((t) => (
                    <div key={t.id} className="text-xs bg-zinc-800 rounded-lg p-2.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-zinc-100 truncate mr-2">{t.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                          t.priority === "critical" ? "bg-red-950 text-red-400" :
                          t.priority === "high"     ? "bg-orange-950 text-orange-400" :
                                                      "bg-zinc-700 text-zinc-400"
                        }`}>{t.priority}</span>
                      </div>
                      <p className="text-zinc-500 truncate">{t.description?.slice(0, 60)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Detected intent */}
              {intelligence.conversation?.intent && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-shrink-0">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Detected Intent</p>
                  <span className="text-sm font-semibold text-emerald-400 capitalize">
                    {intelligence.conversation.intent.replace(/_/g, " ")}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
