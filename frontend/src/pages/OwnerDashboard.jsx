import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity, AlertTriangle, MessageSquare, Users,
  Send, Bot, User, ChevronRight, RefreshCw,
  Ticket, Brain, Loader2, TrendingUp,
} from "lucide-react";
import { api } from "../lib/api";
import { useWebSocket } from "../hooks/useWebSocket";

function riskLevel(r) {
  if (r >= 0.75) return "critical";
  if (r >= 0.5) return "high";
  if (r >= 0.25) return "medium";
  return "low";
}

const RISK_COLOR = {
  low: "text-gray-500",
  medium: "text-gray-400",
  high: "text-gray-300",
  critical: "text-white",
};

const RISK_BG = {
  low: "bg-gray-900/50 border-gray-800",
  medium: "bg-gray-900/50 border-gray-700",
  high: "bg-gray-800/50 border-gray-600",
  critical: "bg-gray-800 border-gray-500",
};

const TIER_BADGE = {
  standard: "text-gray-400 border-gray-700 bg-gray-900/50",
  premium: "text-gray-300 border-gray-600 bg-gray-900",
  enterprise: "text-gray-200 border-gray-500 bg-gray-800/50",
};

function SentimentBar({ score }) {
  const pct = ((score + 1) / 2) * 100;
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
    light: "border-gray-700 bg-gray-900/50",
    dark: "border-gray-600 bg-gray-800/30",
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

function ConvItem({ conv, selected, onClick }) {
  const risk = riskLevel(conv.churn_risk || 0);
  return (
    <button
      onClick={onClick}
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
          {risk === "high" && <AlertTriangle size={13} className="text-gray-400" />}
          <div className={`w-1.5 h-1.5 rounded-full ${conv.status === "active" ? "bg-gray-400" : "bg-gray-700"}`} />
        </div>
      </div>
    </button>
  );
}

function Transcript({ messages }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (!messages?.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-700 gap-3">
        <MessageSquare size={36} />
        <p className="text-sm text-gray-600">Select a conversation</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg, i) => {
        const isAI = msg.role === "assistant";
        return (
          <div key={msg.id || i} className={`flex gap-2 ${isAI ? "" : "flex-row-reverse"} animate-fade-in`}>
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
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export default function OwnerDashboard() {
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [messages, setMessages] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [instruction, setInstruction] = useState("");
  const [sending, setSending] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setMetrics({
        active_conversations: 0,
        avg_sentiment: 0,
        churn_risk_avg: 0,
        messages_today: 0,
      });
    }
  }, []);

  const selectConversation = useCallback(async (convId) => {
    setSelectedConvId(convId);
    try {
      const [intel, hist] = await Promise.all([
        api.getIntelligence(convId),
        api.getHistory(convId),
      ]);
      setIntelligence(intel);
      setMessages(hist.messages || []);
    } catch {
      setIntelligence(null);
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadMetrics();
    const id = setInterval(() => { loadConversations(); loadMetrics(); }, 10000);
    return () => clearInterval(id);
  }, [loadConversations, loadMetrics]);

  const handleWsMessage = useCallback((data) => {
    setLiveEvents((prev) => [{ ...data, id: Date.now() }, ...prev.slice(0, 19)]);
    if (data.event === "metrics_update") {
      setMetrics(data.metrics);
    }
  }, []);

  useWebSocket("/api/dashboard/ws", handleWsMessage, []);

  const sendInstruction = async () => {
    if (!instruction.trim() || !selectedConvId || sending) return;
    setSending(true);
    try {
      await api.sendInstruction(selectedConvId, instruction);
      setInstruction("");
    } catch {
    }
    setSending(false);
  };

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col">
      {/* Header */}
      <header className="h-14 px-4 flex items-center gap-4 border-b border-gray-900 bg-gray-950 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-white flex items-center justify-center">
            <Brain size={14} className="text-black" />
          </div>
          <span className="font-medium text-white text-sm">Neural Knights</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => { loadConversations(); loadMetrics(); }}
          className="p-2 rounded-lg hover:bg-gray-900 transition-colors text-gray-500"
        >
          <RefreshCw size={16} />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Conversations */}
        <aside className="w-72 border-r border-gray-900 flex flex-col bg-gray-950 flex-shrink-0">
          <div className="p-3 border-b border-gray-900">
            <h2 className="text-sm font-medium text-white">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-gray-600" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">No conversations</p>
            ) : (
              conversations.map((conv) => (
                <ConvItem
                  key={conv.conversation_id}
                  conv={conv}
                  selected={selectedConvId === conv.conversation_id}
                  onClick={() => selectConversation(conv.conversation_id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Center panel - Transcript */}
        <main className="flex-1 flex flex-col bg-black">
          <div className="flex-1 overflow-hidden">
            <Transcript messages={messages} />
          </div>

          {/* Instruction input */}
          {selectedConvId && (
            <div className="p-3 border-t border-gray-900 bg-gray-950">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
                  placeholder="Send instruction to AI..."
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendInstruction(); }}
                />
                <button
                  onClick={sendInstruction}
                  disabled={sending || !instruction.trim()}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-black text-sm font-medium transition-all flex items-center gap-2"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Right panel - Metrics & Intelligence */}
        <aside className="w-80 border-l border-gray-900 flex flex-col bg-gray-950 flex-shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-gray-900">
            <h2 className="text-sm font-medium text-white">Metrics</h2>
          </div>

          {/* Metric cards */}
          <div className="p-3 space-y-3">
            <MetricCard
              icon={MessageSquare}
              label="Active Conversations"
              value={metrics?.active_conversations || 0}
              sub="now"
              variant="default"
            />
            <MetricCard
              icon={TrendingUp}
              label="Avg Sentiment"
              value={(metrics?.avg_sentiment || 0).toFixed(2)}
              sub="today"
              variant="light"
            />
            <MetricCard
              icon={AlertTriangle}
              label="Churn Risk"
              value={`${((metrics?.churn_risk_avg || 0) * 100).toFixed(0)}%`}
              sub="avg"
              variant="dark"
            />
            <MetricCard
              icon={Users}
              label="Messages"
              value={metrics?.messages_today || 0}
              sub="today"
              variant="default"
            />
          </div>

          {/* Intelligence */}
          {intelligence && (
            <>
              <div className="p-4 border-t border-gray-900">
                <h2 className="text-sm font-medium text-white">Intelligence</h2>
              </div>
              <div className="px-4 pb-4 space-y-4">
                <div>
                  <p className="text-[11px] text-gray-600 mb-1">Sentiment</p>
                  <SentimentBar score={intelligence.sentiment_score || 0} />
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 mb-1">Churn Risk</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-400 rounded-full"
                        style={{ width: `${((intelligence.churn_risk || 0) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 tabular-nums">
                      {((intelligence.churn_risk || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                {intelligence.top_intents?.length > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-600 mb-2">Top Intents</p>
                    <div className="flex flex-wrap gap-1">
                      {intelligence.top_intents.map((intent, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 rounded bg-gray-900 border border-gray-800 text-gray-400">
                          {intent}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Live events */}
          <div className="p-4 border-t border-gray-900 mt-auto flex-shrink-0">
            <h2 className="text-sm font-medium text-white mb-3">Live Events</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {liveEvents.length === 0 ? (
                <p className="text-[11px] text-gray-600">No events yet</p>
              ) : (
                liveEvents.map((event) => (
                  <div key={event.id} className="text-[11px] text-gray-500 py-1 border-b border-gray-900">
                    <span className="text-gray-600">{new Date().toLocaleTimeString()}</span> {event.event || 'event'}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
