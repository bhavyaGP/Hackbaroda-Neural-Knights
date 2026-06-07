import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Loader2, Bot, User, Zap, AlertCircle } from "lucide-react";
import { api } from "../lib/api";
import { useWebSocket } from "../hooks/useWebSocket";

const TIER_COLORS = {
  standard: "bg-blue-500",
  premium: "bg-yellow-400",
  enterprise: "bg-purple-500",
};

function SentimentBadge({ score }) {
  if (score > 0.3) return <span className="text-xs text-green-400">😊 Positive</span>;
  if (score < -0.3) return <span className="text-xs text-red-400">😤 Frustrated</span>;
  return <span className="text-xs text-yellow-400">😐 Neutral</span>;
}

function AgentTrace({ agents }) {
  if (!agents?.length) return null;
  const labels = {
    memory: "Memory",
    sentiment: "Sentiment",
    resolution: "KB Search",
    negotiation: "Negotiation",
    escalation: "Escalation",
    owner_intervention: "Owner Guided",
  };
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {agents.map((a) => (
        <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-800">
          ⚡ {labels[a] || a}
        </span>
      ))}
    </div>
  );
}

function Message({ msg, agents, sentimentScore, churnRisk, negotiationOffer }) {
  const isAI = msg.role === "assistant";
  return (
    <div className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isAI ? "bg-indigo-600" : "bg-gray-700"}`}>
        {isAI ? <Bot size={16} /> : <User size={16} />}
      </div>
      <div className={`max-w-[75%] ${isAI ? "" : "items-end flex flex-col"}`}>
        <div className={`rounded-2xl px-4 py-3 ${isAI ? "bg-gray-800 rounded-tl-sm" : "bg-indigo-600 rounded-tr-sm"}`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
        {isAI && (
          <div className="mt-1 space-y-1">
            {agents && <AgentTrace agents={agents} />}
            {negotiationOffer && (
              <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-900/30 border border-amber-800/50 rounded-lg px-3 py-1.5">
                <Zap size={12} />
                <span>Offer: {negotiationOffer.description}</span>
              </div>
            )}
          </div>
        )}
        <span className="text-xs text-gray-500 mt-1 px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

export default function CustomerChat() {
  const [params] = useSearchParams();
  const customerId = params.get("customer") || "C001";

  const [conv, setConv] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [lastMeta, setLastMeta] = useState({});
  const [ownerActive, setOwnerActive] = useState(false);
  const bottomRef = useRef(null);

  const handleWsMessage = useCallback((data) => {
    if (data.event === "ai_message") {
      setMessages((prev) => [...prev, data.message]);
      setLastMeta({
        agents_used: data.agents_used,
        sentiment_score: data.sentiment_score,
        churn_risk: data.churn_risk,
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

    const userMsg = {
      id: Date.now().toString(),
      role: "customer",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      await api.sendMessage(customerId, conv.conversation_id, text);
    } catch (e) {
      setMessages((prev) => [...prev, {
        id: "err",
        role: "assistant",
        content: "I'm having trouble connecting. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
      setTyping(false);
    } finally {
      setLoading(false);
    }
  };

  const tierColor = TIER_COLORS[customer?.tier] || "bg-blue-500";

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 flex flex-col" style={{ height: "90vh" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Aria — CIA Support</p>
            <p className="text-xs text-green-400">Online · AI-powered</p>
          </div>
          {customer && (
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full text-white ${tierColor}`}>
                {customer.tier?.toUpperCase()}
              </span>
              {lastMeta.sentiment_score !== undefined && (
                <SentimentBadge score={lastMeta.sentiment_score} />
              )}
            </div>
          )}
        </div>

        {/* Owner Active Banner */}
        {ownerActive && (
          <div className="mx-4 mt-3 px-4 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg flex items-center gap-2 text-xs text-amber-300 flex-shrink-0">
            <AlertCircle size={14} />
            Support specialist is reviewing your case...
          </div>
        )}

        {/* Churn risk banner */}
        {lastMeta.churn_risk >= 0.7 && (
          <div className="mx-4 mt-3 px-4 py-2 bg-red-900/20 border border-red-800/30 rounded-lg text-xs text-red-300 flex-shrink-0">
            We truly value your continued trust. Let us make this right.
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
          {messages.map((msg, i) => (
            <Message
              key={msg.id || i}
              msg={msg}
              agents={i === messages.length - 1 && msg.role === "assistant" ? lastMeta.agents_used : null}
              sentimentScore={lastMeta.sentiment_score}
              churnRisk={lastMeta.churn_risk}
              negotiationOffer={i === messages.length - 1 && msg.role === "assistant" ? lastMeta.negotiation_offer : null}
            />
          ))}
          {typing && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-indigo-500 placeholder-gray-500 text-gray-100"
              rows={2}
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">
            Customer: <span className="text-gray-400">{customer?.name || "..."}</span>
            {customer && <> · {customer.email}</>}
          </p>
        </div>
      </div>
    </div>
  );
}
