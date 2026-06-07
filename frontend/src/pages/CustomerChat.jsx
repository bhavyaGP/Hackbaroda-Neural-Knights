import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Send, Loader2, Bot, User, Zap, AlertCircle, ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import { useWebSocket } from "../hooks/useWebSocket";

const TIER_BADGE = {
  standard:   "text-sky-400 border-sky-800 bg-sky-950/60",
  premium:    "text-amber-400 border-amber-800 bg-amber-950/60",
  enterprise: "text-violet-400 border-violet-800 bg-violet-950/60",
};

function SentimentChip({ score }) {
  if (score > 0.3)  return <span className="text-[11px] font-medium text-emerald-400">Positive</span>;
  if (score < -0.3) return <span className="text-[11px] font-medium text-red-400">Frustrated</span>;
  return <span className="text-[11px] font-medium text-amber-400">Neutral</span>;
}

function AgentTrace({ agents }) {
  if (!agents?.length) return null;
  const labels = {
    memory:             "Memory",
    sentiment:          "Sentiment",
    resolution:         "KB Search",
    negotiation:        "Negotiation",
    escalation:         "Escalation",
    owner_intervention: "Owner Guided",
  };
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {agents.map((a) => (
        <span
          key={a}
          className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-800/50 font-medium"
        >
          {labels[a] || a}
        </span>
      ))}
    </div>
  );
}

function Message({ msg, agents, negotiationOffer }) {
  const isAI = msg.role === "assistant";
  return (
    <div className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-zinc-950 ${
          isAI ? "bg-emerald-500" : "bg-zinc-600"
        }`}
      >
        {isAI ? <Bot size={15} /> : <User size={15} className="text-zinc-200" />}
      </div>
      <div className={`max-w-[76%] ${isAI ? "" : "items-end flex flex-col"}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isAI
              ? "bg-zinc-800 rounded-tl-sm text-zinc-100"
              : "bg-emerald-600 rounded-tr-sm text-white"
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
        {isAI && (
          <div className="space-y-1">
            {agents && <AgentTrace agents={agents} />}
            {negotiationOffer && (
              <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-1.5 mt-1">
                <Zap size={11} />
                {negotiationOffer.description}
              </div>
            )}
          </div>
        )}
        <span className="text-[10px] text-zinc-600 mt-1 px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
        <Bot size={15} className="text-zinc-950" />
      </div>
      <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 150, 300].map((d) => (
          <span
            key={d}
            className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function CustomerChat() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const customerId = params.get("customer") || "C001";

  const [conv, setConv]         = useState(null);
  const [customer, setCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [typing, setTyping]     = useState(false);
  const [lastMeta, setLastMeta] = useState({});
  const [ownerActive, setOwnerActive] = useState(false);
  const bottomRef = useRef(null);

  const handleWsMessage = useCallback((data) => {
    if (data.event === "ai_message") {
      setMessages((prev) => [...prev, data.message]);
      setLastMeta({
        agents_used:       data.agents_used,
        sentiment_score:   data.sentiment_score,
        churn_risk:        data.churn_risk,
        negotiation_offer: data.negotiation_offer,
      });
      setTyping(false);
    }
    if (data.event === "owner_active") {
      setOwnerActive(true);
      setTimeout(() => setOwnerActive(false), 4000);
    }
  }, []);

  useWebSocket(conv ? `/api/chat/ws/${conv.conversation_id}` : null, handleWsMessage, [conv?.conversation_id]);

  useEffect(() => {
    (async () => {
      const { conversation_id, greeting, customer: c } = await api.startConversation(customerId);
      setCustomer(c);
      setConv({ conversation_id });
      setMessages([{
        id: "greeting",
        role: "assistant",
        content: greeting,
        timestamp: new Date().toISOString(),
      }]);
    })();
  }, [customerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async () => {
    const text = input.trim();
    if (!text || !conv || loading) return;
    setInput("");
    setLoading(true);
    setTyping(true);
    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      role: "customer",
      content: text,
      timestamp: new Date().toISOString(),
    }]);
    try {
      await api.sendMessage(customerId, conv.conversation_id, text);
    } catch {
      setMessages((prev) => [...prev, {
        id: "err",
        role: "assistant",
        content: "Connection issue. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
      setTyping(false);
    } finally {
      setLoading(false);
    }
  };

  const tier = customer?.tier || "standard";

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl flex flex-col"
        style={{ height: "88dvh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800 flex-shrink-0">
          <button
            onClick={() => navigate("/")}
            className="text-zinc-500 hover:text-zinc-300 transition-colors mr-0.5"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center">
              <Bot size={17} className="text-zinc-950" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-zinc-900" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-zinc-50">Aria - Support</p>
            <p className="text-[11px] text-emerald-400">Online · AI-powered</p>
          </div>
          {customer && (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${TIER_BADGE[tier]}`}>
                {tier.toUpperCase()}
              </span>
              {lastMeta.sentiment_score !== undefined && (
                <SentimentChip score={lastMeta.sentiment_score} />
              )}
            </div>
          )}
        </div>

        {/* Owner active banner */}
        {ownerActive && (
          <div className="mx-3 mt-3 px-3 py-2 bg-amber-950/30 border border-amber-800/40 rounded-lg flex items-center gap-2 text-xs text-amber-300 flex-shrink-0">
            <AlertCircle size={13} />
            A support specialist is reviewing your case...
          </div>
        )}

        {/* Churn retention message */}
        {lastMeta.churn_risk >= 0.7 && (
          <div className="mx-3 mt-3 px-3 py-2 bg-red-950/20 border border-red-900/30 rounded-lg text-xs text-red-300 flex-shrink-0">
            We value your trust. Let us make this right.
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.map((msg, i) => (
            <Message
              key={msg.id || i}
              msg={msg}
              agents={i === messages.length - 1 && msg.role === "assistant" ? lastMeta.agents_used : null}
              negotiationOffer={i === messages.length - 1 && msg.role === "assistant" ? lastMeta.negotiation_offer : null}
            />
          ))}
          {typing && <TypingDots />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-zinc-800 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:border-emerald-600 placeholder-zinc-500 text-zinc-100 transition-colors"
              rows={2}
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0 active:scale-95 text-zinc-950"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          {customer && (
            <p className="text-[10px] text-zinc-600 mt-2 text-center">
              {customer.name} - {customer.email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
