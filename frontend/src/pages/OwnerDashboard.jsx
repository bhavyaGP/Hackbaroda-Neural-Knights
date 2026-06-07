import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity, AlertTriangle, MessageSquare, Users, TrendingDown,
  TrendingUp, Send, Bot, User, Zap, ChevronRight, RefreshCw,
  Shield, Clock, Ticket, Brain,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { api } from "../lib/api";
import { useWebSocket } from "../hooks/useWebSocket";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TIER_BADGE = {
  standard: "bg-blue-900 text-blue-300 border-blue-800",
  premium: "bg-yellow-900 text-yellow-300 border-yellow-800",
  enterprise: "bg-purple-900 text-purple-300 border-purple-800",
};

const RISK_STYLES = {
  low: "text-green-400 bg-green-900/30 border-green-800",
  medium: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
  high: "text-orange-400 bg-orange-900/30 border-orange-800",
  critical: "text-red-400 bg-red-900/30 border-red-800",
};

function riskLevel(churnRisk) {
  if (churnRisk >= 0.75) return "critical";
  if (churnRisk >= 0.5) return "high";
  if (churnRisk >= 0.25) return "medium";
  return "low";
}

function SentimentBar({ score }) {
  const pct = ((score + 1) / 2) * 100;
  const color = score > 0.3 ? "#22c55e" : score < -0.3 ? "#ef4444" : "#eab308";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums" style={{ color }}>{score > 0 ? "+" : ""}{score.toFixed(2)}</span>
    </div>
  );
}

function ChurnGauge({ risk }) {
  const level = riskLevel(risk);
  const pct = risk * 100;
  const styles = RISK_STYLES[level];
  return (
    <div className={`rounded-lg border px-3 py-2 flex items-center justify-between ${styles}`}>
      <span className="text-xs font-medium uppercase tracking-wide">{level} risk</span>
      <span className="text-lg font-bold tabular-nums">{pct.toFixed(0)}%</span>
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, sub, accent = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-900/30 border-indigo-800 text-indigo-400",
    green: "bg-green-900/30 border-green-800 text-green-400",
    red: "bg-red-900/30 border-red-800 text-red-400",
    yellow: "bg-yellow-900/30 border-yellow-800 text-yellow-400",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[accent]}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={18} />
        <span className="text-xs opacity-70">{sub}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs mt-0.5 opacity-70">{label}</p>
    </div>
  );
}

// ── Conversation List Item ────────────────────────────────────────────────────

function ConvItem({ conv, selected, onClick }) {
  const risk = riskLevel(conv.churn_risk || 0);
  const sentimentEmoji = (conv.sentiment_score || 0) > 0.3 ? "😊" : (conv.sentiment_score || 0) < -0.3 ? "😤" : "😐";
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
        selected
          ? "bg-indigo-900/40 border-indigo-700"
          : "bg-gray-800/50 border-gray-700/50 hover:bg-gray-800 hover:border-gray-600"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-sm truncate">{conv.customer_name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${TIER_BADGE[conv.customer_tier] || TIER_BADGE.standard}`}>
              {conv.customer_tier?.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-400 truncate">{conv.last_message || "New conversation"}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs">{sentimentEmoji}</span>
            <span className={`text-xs ${RISK_STYLES[risk].split(" ")[0]}`}>{risk} risk</span>
            <span className="text-xs text-gray-500">· {conv.channel}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {risk === "critical" && (
            <AlertTriangle size={14} className="text-red-400 animate-pulse" />
          )}
          {risk === "high" && (
            <AlertTriangle size={14} className="text-orange-400" />
          )}
          <span className="text-xs text-gray-500">{conv.message_count}msg</span>
          <div className={`w-2 h-2 rounded-full ${conv.status === "active" ? "bg-green-400" : "bg-gray-600"}`} />
        </div>
      </div>
    </button>
  );
}

// ── Transcript ────────────────────────────────────────────────────────────────

function Transcript({ messages }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (!messages?.length) return (
    <div className="flex-1 flex items-center justify-center text-gray-600">
      <MessageSquare size={40} />
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin p-4">
      {messages.map((msg, i) => {
        const isAI = msg.role === "assistant";
        return (
          <div key={msg.id || i} className={`flex gap-2 ${isAI ? "" : "flex-row-reverse"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${isAI ? "bg-indigo-700" : "bg-gray-600"}`}>
              {isAI ? <Bot size={13} /> : <User size={13} />}
            </div>
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${isAI ? "bg-gray-800 text-gray-100" : "bg-indigo-700 text-white"}`}>
              {msg.content}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [messages, setMessages] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [instruction, setInstruction] = useState("");
  const [sending, setSending] = useState(false);
  const [sentInstructions, setSentInstructions] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);

  const loadConversations = useCallback(async () => {
    const data = await api.getConversations();
    setConversations(data);
  }, []);

  const loadMetrics = useCallback(async () => {
    const m = await api.getMetrics();
    setMetrics(m);
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
    const interval = setInterval(() => { loadConversations(); loadMetrics(); }, 10000);
    return () => clearInterval(interval);
  }, [loadConversations, loadMetrics]);

  const handleWsMessage = useCallback((data) => {
    const event = data.event;

    setLiveEvents((prev) => [
      { ...data, id: Date.now() },
      ...prev.slice(0, 19),
    ]);

    if (event === "message_update") {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversation_id
            ? {
                ...c,
                sentiment_score: data.sentiment_score,
                churn_risk: data.churn_risk,
                intent: data.intent,
                last_message: data.last_message,
                risk_level: riskLevel(data.churn_risk),
              }
            : c
        )
      );
      if (data.conversation_id === selectedConvId) {
        setIntelligence((prev) =>
          prev ? {
            ...prev,
            churn_risk: data.churn_risk,
            risk_level: riskLevel(data.churn_risk),
          } : prev
        );
        // Reload messages for selected conversation
        api.getHistory(data.conversation_id).then((h) => setMessages(h.messages || []));
      }
    }

    if (event === "conversation_started") {
      loadConversations();
    }
  }, [selectedConvId, loadConversations]);

  useWebSocket("/api/dashboard/ws", handleWsMessage);

  const sendInstruction = async () => {
    if (!instruction.trim() || !selectedConvId) return;
    setSending(true);
    try {
      await api.intervene(selectedConvId, instruction.trim());
      setSentInstructions((prev) => [
        { text: instruction.trim(), time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 9),
      ]);
      setInstruction("");
    } finally {
      setSending(false);
    }
  };

  const sentimentData = (intelligence?.sentiment_logs || []).map((s, i) => ({
    i,
    sentiment: s.sentiment_score,
    churn: s.churn_risk,
  }));

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Brain size={16} />
          </div>
          <div>
            <p className="font-bold text-sm text-white">CIA Dashboard</p>
            <p className="text-xs text-gray-400">Customer Intelligence Agent · Owner View</p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">Live</span>
        </div>
      </header>

      {/* Metrics row */}
      {metrics && (
        <div className="px-6 py-3 grid grid-cols-6 gap-3 flex-shrink-0">
          <MetricCard icon={Activity} label="Active Conversations" value={metrics.active_conversations} sub="now" accent="indigo" />
          <MetricCard icon={AlertTriangle} label="High-Risk Customers" value={metrics.high_risk_customers} sub="churn risk" accent="red" />
          <MetricCard icon={Ticket} label="Open Tickets" value={metrics.open_tickets} sub="unresolved" accent="yellow" />
          <MetricCard icon={TrendingUp} label="Avg Sentiment" value={metrics.avg_sentiment > 0 ? `+${metrics.avg_sentiment}` : metrics.avg_sentiment} sub="all active" accent={metrics.avg_sentiment >= 0 ? "green" : "red"} />
          <MetricCard icon={MessageSquare} label="Resolved Today" value={metrics.resolved_today} sub="closed" accent="green" />
          <MetricCard icon={Users} label="Total Conversations" value={metrics.total_conversations} sub="all time" accent="indigo" />
        </div>
      )}

      {/* 3-column layout */}
      <div className="flex-1 flex overflow-hidden px-6 pb-6 gap-4">

        {/* ── Column 1: Conversation list ── */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Active Conversations</h2>
            <button onClick={loadConversations} className="text-gray-500 hover:text-gray-300 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
            {conversations.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-8">No conversations yet</p>
            )}
            {conversations.map((c) => (
              <ConvItem
                key={c.id}
                conv={c}
                selected={c.id === selectedConvId}
                onClick={() => selectConversation(c.id)}
              />
            ))}
          </div>

          {/* Live event feed */}
          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Activity size={12} /> Live Events
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
              {liveEvents.slice(0, 8).map((e) => (
                <div key={e.id} className="text-xs text-gray-500 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                  <span className="truncate">{e.event}: {e.customer_name || e.conversation_id?.slice(0, 8) || ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Column 2: Live transcript ── */}
        <div className="flex-1 flex flex-col border border-gray-800 rounded-xl bg-gray-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <MessageSquare size={15} /> Live Transcript
              {selectedConvId && <span className="text-xs text-gray-500">· {selectedConvId.slice(0, 8)}...</span>}
            </h2>
            {intelligence && <SentimentBar score={intelligence.conversation?.sentiment_score || 0} />}
          </div>

          <Transcript messages={messages} />

          {/* Intervention panel */}
          <div className="border-t border-gray-800 p-4 flex-shrink-0 space-y-3">
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <Shield size={13} />
              <span className="font-medium">Owner Intervention</span>
              <span className="text-gray-500">— AI will integrate your instruction seamlessly</span>
            </div>

            {sentInstructions.length > 0 && (
              <div className="space-y-1 max-h-20 overflow-y-auto scrollbar-thin">
                {sentInstructions.map((s, i) => (
                  <div key={i} className="text-xs flex items-start gap-1.5 text-gray-400">
                    <ChevronRight size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-amber-300 flex-1">{s.text}</span>
                    <span className="text-gray-600">{s.time}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500 placeholder-gray-600 text-gray-100"
                  placeholder='e.g. "Offer 20% discount" · "Escalate to technical team" · "Approve full refund"'
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendInstruction()}
                  disabled={!selectedConvId}
                />
              </div>
              <button
                onClick={sendInstruction}
                disabled={!instruction.trim() || !selectedConvId || sending}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <Send size={12} />
                {sending ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Column 3: Customer intelligence ── */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto scrollbar-thin">
          {!intelligence ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-3 py-20">
              <Brain size={40} />
              <p className="text-sm">Select a conversation to view customer intelligence</p>
            </div>
          ) : (
            <>
              {/* Customer profile */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer Profile</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                    {intelligence.customer?.name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{intelligence.customer?.name}</p>
                    <p className="text-xs text-gray-400">{intelligence.customer?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-500">Tier</p>
                    <p className="font-medium capitalize text-white">{intelligence.customer?.tier}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-500">LTV</p>
                    <p className="font-medium text-white">${intelligence.customer?.lifetime_value?.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2 col-span-2">
                    <p className="text-gray-500 mb-1">Products</p>
                    <div className="flex flex-wrap gap-1">
                      {intelligence.customer?.products?.map((p) => (
                        <span key={p} className="bg-indigo-900/50 text-indigo-300 text-xs px-1.5 py-0.5 rounded">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Churn risk */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Churn Risk</h3>
                <ChurnGauge risk={intelligence.churn_risk || 0} />
                {sentimentData.length > 1 && (
                  <div className="h-20 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sentimentData}>
                        <ReferenceLine y={0} stroke="#374151" strokeDasharray="2 2" />
                        <Line type="monotone" dataKey="sentiment" stroke="#6366f1" strokeWidth={2} dot={false} />
                        <Tooltip
                          contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }}
                          formatter={(v) => [v.toFixed(2), "Sentiment"]}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Recommended actions */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <Zap size={12} className="text-amber-400" /> AI Recommendations
                </h3>
                <div className="space-y-1.5">
                  {intelligence.recommended_actions?.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => setInstruction(a)}
                      className="w-full text-left text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-600 rounded-lg transition-all text-gray-300 hover:text-white flex items-center gap-2"
                    >
                      <ChevronRight size={12} className="text-indigo-400 flex-shrink-0" />
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Open tickets */}
              {intelligence.tickets?.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <Ticket size={12} /> Open Tickets ({intelligence.tickets.length})
                  </h3>
                  {intelligence.tickets.slice(0, 3).map((t) => (
                    <div key={t.id} className="text-xs bg-gray-800 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium truncate text-white">{t.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          t.priority === "critical" ? "bg-red-900 text-red-300" :
                          t.priority === "high" ? "bg-orange-900 text-orange-300" :
                          "bg-gray-700 text-gray-400"
                        }`}>{t.priority}</span>
                      </div>
                      <p className="text-gray-500 truncate">{t.description?.slice(0, 60)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Current intent */}
              {intelligence.conversation?.intent && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Detected Intent</h3>
                  <span className="text-sm font-medium text-indigo-300 capitalize">
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
