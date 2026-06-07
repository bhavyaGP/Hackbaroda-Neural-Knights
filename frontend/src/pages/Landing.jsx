import { useNavigate } from "react-router-dom";
import { Brain, MessageSquare, Shield, Zap, BarChart2, Users } from "lucide-react";

const DEMO_CUSTOMERS = [
  { id: "C001", name: "Rahul Mehta", tier: "premium", note: "Frustrated — billing issues" },
  { id: "C002", name: "Sarah Chen", tier: "standard", note: "New trial user" },
  { id: "C003", name: "James O'Brien", tier: "enterprise", note: "Happy long-term customer" },
  { id: "C004", name: "Priya Sharma", tier: "premium", note: "Performance complaints + churn risk" },
];

const TIER_COLORS = {
  standard: "bg-blue-900 text-blue-300 border-blue-800",
  premium: "bg-yellow-900 text-yellow-300 border-yellow-800",
  enterprise: "bg-purple-900 text-purple-300 border-purple-800",
};

const FEATURES = [
  { icon: Brain, title: "Long-Term Memory", desc: "Hindsight-powered per-customer memory banks. Every interaction remembered forever." },
  { icon: Zap, title: "Multi-Agent AI", desc: "Supervisor, Memory, Sentiment, Resolution, Negotiation, Escalation agents working in concert." },
  { icon: Shield, title: "Owner Intervention", desc: "Type an instruction. AI seamlessly integrates it. Customer never knows." },
  { icon: BarChart2, title: "Churn Prediction", desc: "Real-time 0-100% churn risk scoring. Negotiation agent auto-activates at high risk." },
  { icon: MessageSquare, title: "Live Transcript", desc: "Owner sees full conversation in real-time with sentiment tracking and AI agent trace." },
  { icon: Users, title: "Customer Intelligence", desc: "Full history, open tickets, sentiment trend, and AI recommendations per customer." },
];

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center">
            <Brain size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-white">CIA</h1>
            <p className="text-xs text-indigo-400">Customer Intelligence Agent</p>
          </div>
        </div>
        <h2 className="text-4xl font-bold text-white max-w-2xl leading-tight mb-4">
          AI Support That{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            Remembers Everything
          </span>
        </h2>
        <p className="text-gray-400 max-w-xl text-lg mb-8">
          Multi-agent AI platform with long-term customer memory, real-time churn prediction,
          negotiation intelligence, and seamless owner intervention.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2"
          >
            <BarChart2 size={18} /> Owner Dashboard
          </button>
          <p className="text-gray-500 self-center text-sm">or try as customer →</p>
        </div>
      </div>

      {/* Demo customers */}
      <div className="px-6 py-10 bg-gray-900/50 border-y border-gray-800">
        <p className="text-center text-sm text-gray-400 mb-6">
          Demo customers — each has a unique history and churn profile
        </p>
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {DEMO_CUSTOMERS.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/chat?customer=${c.id}`)}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-600 rounded-xl px-5 py-4 text-left transition-all min-w-48"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                  {c.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${TIER_COLORS[c.tier]}`}>
                    {c.tier.toUpperCase()}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400">{c.note}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div className="px-6 py-16 max-w-5xl mx-auto w-full">
        <h3 className="text-xl font-bold text-center text-white mb-10">Platform Capabilities</h3>
        <div className="grid grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <f.icon size={22} className="text-indigo-400 mb-3" />
              <h4 className="font-semibold text-sm text-white mb-1">{f.title}</h4>
              <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center py-8 text-xs text-gray-600">
        CIA — Customer Intelligence Agent · Hackathon 2025 · Powered by OpenAI + Hindsight Memory
      </footer>
    </div>
  );
}
