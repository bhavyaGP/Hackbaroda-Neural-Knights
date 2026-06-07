import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity, AlertTriangle, MessageSquare, Users,
  Send, Bot, User, ChevronRight, RefreshCw,
  Ticket, Brain, Loader2, TrendingUp, Phone, Zap, Shield,
} from "lucide-react";
import {
  LineChart, Line, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { api } from "../lib/api";
import { useWebSocket } from "../hooks/useWebSocket";

// ── Helpers ───────────────────────────────────────────────────────────────────

function riskLevel(r) {
  if (r >= 0.75) return "critical";
  if (r >= 0.5)  return "high";
  if (r >= 0.25) return "medium";
  return "low";
}

const RISK_COLOR = {
  low:      "text-gray-500",
  medium:   "text-gray-400",
  high:     "text-gray-300",
  critical: "text-white",
};

const RISK_BG = {
  low:      "bg-gray-900/50 border-gray-800",
  medium:   "bg-gray-900/50 border-gray-700",
  high:     "bg-gray-800/50 border-gray-600",
  critical: "bg-gray-800 border-gray-500",
};

const TIER_BADGE = {
  standard:   "text-gray-400 border-gray-700 bg-gray-900/50",
  premium:    "text-gray-300 border-gray-600 bg-gray-900",
  enterprise: "text-gray-200 border-gray-500 bg-gray-800/50",
};

function SentimentBar({ score }) {
  const pct   = ((score + 1) / 2) * 100;
  const color = score > 0.3 ? "#a3a3a3" : score < -0.3 ? "#737373" : "#525252";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] tabular-nums font-medium text-gray-400">
        {score > 0 ? "+" : ""}{score.toFixed(2)}
      </span>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, variant = "default" }) {
  const vars = {
    default: "border-gray-800 bg-gray-950",
    light:   "border-gray-700 bg-gray-900/50",
    dark:    "border-gray-600 bg-gray-800/30",
  };
  return (
    <div className={`rounded-xl border p-4 ${vars[variant]}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon size={16} className="text-gray-500" />
        <span className="text-[10px] text-gray-600">{sub}</span>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ── Conversation list item ─────────────────────────────────────────────────────

function ConvItem({ conv, selected, onClick, isNew }) {
  const risk = riskLevel(conv.churn_risk || 0);
  return (
    <button
      onClick={onClick}
      style={{ animation: isNew ? "slideIn 0.3s ease-out" : undefined }}
      className={`w-full text-left px-3 py-3 rounded-xl border transition-all duration-150 ${
        selected
          ? "bg-gray-900 border-gray-600"
          : "bg-gray-950 border-gray-800 hover:border-gray-700"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-white truncate">{conv.customer_name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 font-medium ${TIER_BADGE[conv.customer_tier] || TIER_BADGE.standard}`}>
              {conv.customer_tier?.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-600 truncate">{conv.last_message || "New conversation"}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[10px] font-medium ${RISK_COLOR[risk]}`}>{risk} risk</span>
            <span className="text-[10px] text-gray-700">{conv.channel}</span>
            <span className="text-[10px] text-gray-700">{conv.message_count}msg</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
          {risk === "critical" && <AlertTriangle size={13} className="text-white animate-pulse" />}
          {risk === "high"     && <AlertTriangle size={13} className="text-gray-400" />}
          <div className={`w-1.5 h-1.5 rounded-full ${conv.status === "active" ? "bg-gray-400" : "bg-gray-700"}`} />
        </div>
      </div>
    </button>
  );
}

// ── Transcript with animated messages ─────────────────────────────────────────

function ChatMessage({ msg, isNew }) {
  const isAI = msg.role === "assistant";
  return (
    <div
      className={`flex gap-2 ${isAI ? "" : "flex-row-reverse"}`}
      style={{ animation: isNew ? "msgIn 0.35s cubic-bezier(0.16,1,0.3,1) both" : undefined }}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isAI ? "bg-white" : "bg-gray-700"}`}>
        {isAI
          ? <Bot size={12} className="text-black" />
          : <User size={12} className="text-gray-200" />
        }
      </div>
      <div className={`max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed ${isAI ? "bg-gray-900 text-gray-100 border border-gray-800" : "bg-white text-black"}`}>
        {msg.content}
      </div>
    </div>
  );
}

function Transcript({ messages, newMsgIds }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!messages?.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-700 gap-3">
        <MessageSquare size={36} />
        <p className="text-sm text-gray-600">Select a conversation</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
      {messages.map((msg) => (
        <ChatMessage
          key={msg.id}
          msg={msg}
          isNew={newMsgIds.has(msg.id)}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const [conversations,    setConversations]    = useState([]);
  const [selectedConvId,   setSelectedConvId]   = useState(null);
  const [intelligence,     setIntelligence]     = useState(null);
  const [messages,         setMessages]         = useState([]);
  const [newMsgIds,        setNewMsgIds]        = useState(new Set());
  const [newConvIds,       setNewConvIds]       = useState(new Set());
  const [metrics,          setMetrics]          = useState(null);
  const [instruction,      setInstruction]      = useState("");
  const [sending,          setSending]          = useState(false);
  const [sentInstructions, setSentInstructions] = useState([]);
  const [liveEvents,       setLiveEvents]       = useState([]);
  const [calling,          setCalling]          = useState(false);
  const [callStatus,       setCallStatus]       = useState(null);
  const [loading,          setLoading]          = useState(true);

  // Ref so WebSocket callback always sees latest selectedConvId without stale closure
  const selectedConvIdRef = useRef(null);
  useEffect(() => { selectedConvIdRef.current = selectedConvId; }, [selectedConvId]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data || []);
    } catch {
      setConversations([]);
    }
    setLoading(false);
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      const data = await api.getMetrics();
      setMetrics(data);
    } catch {
      setMetrics({ active_conversations: 0, avg_sentiment: 0, high_risk_customers: 0, open_tickets: 0, resolved_today: 0, total_conversations: 0 });
    }
  }, []);

  const selectConversation = useCallback(async (convId) => {
    setSelectedConvId(convId);
    selectedConvIdRef.current = convId;
    setMessages([]);
    setNewMsgIds(new Set());
    try {
      const [intel, hist] = await Promise.all([
        api.getIntelligence(convId),
        api.getHistory(convId),
      ]);
      setIntelligence(intel);
      setMessages(hist.messages || []);
    } catch {
      setIntelligence(null);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadMetrics();
    const id = setInterval(() => { loadConversations(); loadMetrics(); }, 15000);
    return () => clearInterval(id);
  }, [loadConversations, loadMetrics]);

  // WebSocket handler — uses ref for selectedConvId to avoid stale closure
  const handleWsMessage = useCallback((data) => {
    setLiveEvents((prev) => [{ ...data, id: Date.now() }, ...prev.slice(0, 19)]);

    if (data.event === "message_update") {
      const { conversation_id, new_messages, sentiment_score, churn_risk, intent, last_message, customer_name, customer_tier } = data;

      // Update conversation list entry immediately
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conversation_id);
        if (!exists) return prev; // new conv handled by conversation_started
        return prev.map((c) =>
          c.id === conversation_id
            ? { ...c, sentiment_score, churn_risk, intent, last_message, message_count: (c.message_count || 0) + (new_messages?.length || 0) }
            : c
        );
      });

      // Append messages directly if this conversation is selected — NO API refetch
      if (conversation_id === selectedConvIdRef.current && new_messages?.length) {
        const incomingIds = new Set(new_messages.map((m) => m.id));
        setMessages((prev) => {
          // Deduplicate: skip messages already in the list
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = new_messages.filter((m) => !existingIds.has(m.id));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
        // Mark as new for animation, then clear after 1.5s
        setNewMsgIds((prev) => new Set([...prev, ...incomingIds]));
        setTimeout(() => setNewMsgIds((prev) => {
          const next = new Set(prev);
          incomingIds.forEach((id) => next.delete(id));
          return next;
        }), 1500);

        // Update intelligence panel churn risk live
        setIntelligence((prev) => prev ? { ...prev, churn_risk } : prev);
      }
    }

    if (data.event === "conversation_started") {
      const conv = {
        id: data.conversation_id,
        customer_name: data.customer_name || "New Customer",
        customer_tier: data.customer_tier || "standard",
        channel: data.channel || "chat",
        status: "active",
        sentiment_score: 0,
        churn_risk: 0,
        message_count: 0,
        last_message: "",
      };
      setConversations((prev) => {
        if (prev.some((c) => c.id === conv.id)) return prev;
        return [conv, ...prev];
      });
      setNewConvIds((prev) => new Set([...prev, conv.id]));
      setTimeout(() => setNewConvIds((prev) => {
        const next = new Set(prev);
        next.delete(conv.id);
        return next;
      }), 2000);
    }

    if (data.event === "conversation_closed") {
      setConversations((prev) =>
        prev.map((c) => c.id === data.conversation_id ? { ...c, status: "closed" } : c)
      );
    }
  }, []); // no deps — uses refs to avoid stale closure

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
    i, sentiment: s.sentiment_score,
  }));

  const riskInfo = intelligence ? riskLevel(intelligence.churn_risk || 0) : null;

  return (
    <>
      {/* Inline keyframes for message + conversation animations */}
      <style>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="min-h-[100dvh] bg-black flex flex-col">

        {/* Top bar */}
        <header className="border-b border-gray-900 px-5 py-3 flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
              <Brain size={14} className="text-black" />
            </div>
            <div>
              <p className="font-bold text-sm text-white leading-none">Neural Knights</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Customer Intelligence Agent</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
        </header>

        {/* Metrics row */}
        {metrics && (
          <div className="px-5 py-3 grid grid-cols-3 md:grid-cols-6 gap-3 border-b border-gray-900 flex-shrink-0">
            <MetricCard icon={Activity}      label="Active"         value={metrics.active_conversations}  sub="now"        variant="light" />
            <MetricCard icon={AlertTriangle} label="High Risk"      value={metrics.high_risk_customers || 0} sub="churn"   variant="dark" />
            <MetricCard icon={Ticket}        label="Open Tickets"   value={metrics.open_tickets || 0}     sub="unresolved" variant="light" />
            <MetricCard icon={TrendingUp}    label="Avg Sentiment"  value={metrics.avg_sentiment > 0 ? `+${metrics.avg_sentiment}` : metrics.avg_sentiment} sub="active" variant={metrics.avg_sentiment >= 0 ? "light" : "dark"} />
            <MetricCard icon={MessageSquare} label="Resolved Today" value={metrics.resolved_today || 0}   sub="closed"     variant="light" />
            <MetricCard icon={Users}         label="Total"          value={metrics.total_conversations || 0} sub="all time" variant="default" />
          </div>
        )}

        {/* 3-column layout */}
        <div className="flex-1 flex overflow-hidden px-5 pb-5 pt-4 gap-4 min-h-0">

          {/* Column 1: Conversations */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-3 min-h-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Conversations</span>
              <button onClick={loadConversations} className="text-gray-600 hover:text-gray-300 transition-colors">
                <RefreshCw size={13} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 scrollbar-thin">
              {loading
                ? <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-600" /></div>
                : conversations.length === 0
                ? <p className="text-xs text-gray-700 text-center py-8">No conversations yet</p>
                : conversations.map((c) => (
                    <ConvItem
                      key={c.id}
                      conv={c}
                      selected={c.id === selectedConvId}
                      isNew={newConvIds.has(c.id)}
                      onClick={() => selectConversation(c.id)}
                    />
                  ))
              }
            </div>
            {/* Live events */}
            <div className="border-t border-gray-900 pt-3 flex-shrink-0">
              <p className="text-[10px] text-gray-600 mb-1.5 flex items-center gap-1 font-medium uppercase tracking-wide">
                <Activity size={10} /> Events
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto scrollbar-thin">
                {liveEvents.slice(0, 8).map((e) => (
                  <div key={e.id} className="text-[10px] text-gray-600 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-gray-600 flex-shrink-0" />
                    <span className="truncate">{e.event}: {e.customer_name || e.conversation_id?.slice(0, 8) || ""}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Live transcript */}
          <div className="flex-1 flex flex-col border border-gray-900 rounded-xl bg-gray-950 overflow-hidden min-h-0">
            <div className="px-4 py-3 border-b border-gray-900 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-semibold text-gray-400 flex items-center gap-2">
                <MessageSquare size={13} />
                Live Transcript
                {selectedConvId && (
                  <span className="text-gray-600 font-normal">{selectedConvId.slice(0, 8)}...</span>
                )}
              </span>
              {intelligence && (
                <div className="w-32">
                  <SentimentBar score={intelligence.conversation?.sentiment_score || 0} />
                </div>
              )}
            </div>

            <Transcript messages={messages} newMsgIds={newMsgIds} />

            {/* Intervention panel */}
            <div className="border-t border-gray-900 p-3.5 flex-shrink-0 space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Shield size={12} />
                <span className="font-semibold">Owner Intervention</span>
                <span className="text-gray-600">AI integrates seamlessly</span>
              </div>
              {sentInstructions.length > 0 && (
                <div className="space-y-1 max-h-16 overflow-y-auto scrollbar-thin">
                  {sentInstructions.map((s, i) => (
                    <div key={i} className="text-[10px] flex items-start gap-1.5 text-gray-500">
                      <ChevronRight size={10} className="text-gray-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-400 flex-1 truncate">{s.text}</span>
                      <span className="text-gray-700 flex-shrink-0">{s.time}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gray-600 placeholder-gray-600 text-gray-100 transition-colors"
                  placeholder='e.g. "Offer 20% discount" or "Escalate to tech team"'
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendInstruction()}
                  disabled={!selectedConvId}
                />
                <button
                  onClick={sendInstruction}
                  disabled={!instruction.trim() || !selectedConvId || sending}
                  className="px-3 py-2 bg-white hover:bg-gray-200 disabled:opacity-30 rounded-lg text-xs font-semibold text-black transition-colors flex items-center gap-1 flex-shrink-0"
                >
                  <Send size={11} />
                  {sending ? "..." : "Send"}
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: Customer intelligence */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto min-h-0 scrollbar-thin">
            {!intelligence ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-700 gap-3 py-20">
                <Brain size={36} />
                <p className="text-sm text-center text-gray-600">Select a conversation</p>
              </div>
            ) : (
              <>
                {/* Customer profile */}
                <div className="bg-gray-950 border border-gray-900 rounded-xl p-4 space-y-3 flex-shrink-0">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Customer Profile</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {intelligence.customer?.name?.[0] || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white">{intelligence.customer?.name}</p>
                      <p className="text-xs text-gray-500">{intelligence.customer?.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Tier", value: intelligence.customer?.tier },
                      { label: "LTV",  value: `$${intelligence.customer?.lifetime_value?.toLocaleString() || 0}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-900 rounded-lg p-2.5">
                        <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
                        <p className="text-sm font-semibold text-white capitalize">{value}</p>
                      </div>
                    ))}
                    <div className="bg-gray-900 rounded-lg p-2.5 col-span-2">
                      <p className="text-[10px] text-gray-500 mb-1">Products</p>
                      <div className="flex flex-wrap gap-1">
                        {intelligence.customer?.products?.map((p) => (
                          <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">{p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setCalling(true); setCallStatus(null);
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white hover:bg-gray-200 disabled:opacity-40 text-sm font-semibold text-black transition-colors"
                  >
                    {calling ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
                    {calling ? "Dialing..." : `Call ${intelligence.customer?.name?.split(" ")[0]}`}
                  </button>
                  {callStatus && (
                    <p className={`text-xs text-center ${callStatus.ok ? "text-gray-400" : "text-gray-500"}`}>
                      {callStatus.msg}
                    </p>
                  )}
                </div>

                {/* Churn risk */}
                <div className="bg-gray-950 border border-gray-900 rounded-xl p-4 space-y-2.5 flex-shrink-0">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Churn Risk</p>
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
                          <Line type="monotone" dataKey="sentiment" stroke="#737373" strokeWidth={2} dot={false} />
                          <Tooltip
                            contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", borderRadius: 8, fontSize: 11 }}
                            formatter={(v) => [v.toFixed(2), "Sentiment"]}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* AI recommendations */}
                {intelligence.recommended_actions?.length > 0 && (
                  <div className="bg-gray-950 border border-gray-900 rounded-xl p-4 space-y-2 flex-shrink-0">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap size={11} className="text-gray-500" /> AI Recommendations
                    </p>
                    <div className="space-y-1.5">
                      {intelligence.recommended_actions.map((a, i) => (
                        <button
                          key={i}
                          onClick={() => setInstruction(a)}
                          className="w-full text-left text-xs px-3 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-600 rounded-lg transition-all text-gray-400 hover:text-gray-100 flex items-center gap-2"
                        >
                          <ChevronRight size={11} className="text-gray-500 flex-shrink-0" />
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open tickets */}
                {intelligence.tickets?.length > 0 && (
                  <div className="bg-gray-950 border border-gray-900 rounded-xl p-4 space-y-2 flex-shrink-0">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Ticket size={11} /> Tickets ({intelligence.tickets.length})
                    </p>
                    {intelligence.tickets.slice(0, 3).map((t) => (
                      <div key={t.id} className="text-xs bg-gray-900 rounded-lg p-2.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-white truncate mr-2">{t.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                            t.priority === "critical" ? "bg-gray-800 text-gray-300" :
                            t.priority === "high"     ? "bg-gray-800 text-gray-400" :
                                                        "bg-gray-800 text-gray-500"
                          }`}>{t.priority}</span>
                        </div>
                        <p className="text-gray-600 truncate">{t.description?.slice(0, 60)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Detected intent */}
                {intelligence.conversation?.intent && (
                  <div className="bg-gray-950 border border-gray-900 rounded-xl p-4 flex-shrink-0">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Detected Intent</p>
                    <span className="text-sm font-semibold text-gray-300 capitalize">
                      {intelligence.conversation.intent.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
