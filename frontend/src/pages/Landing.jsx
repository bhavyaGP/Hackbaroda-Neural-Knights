import { useNavigate } from "react-router-dom";
import { Brain, BarChart2, Shield, Zap, MessageSquare, Users, ChevronRight, ArrowRight } from "lucide-react";

const DEMO_CUSTOMERS = [
  { id: "C001", name: "Rahul Mehta", tier: "premium", avatar: "RM", note: "Billing dispute", risk: "high" },
  { id: "C002", name: "Sarah Chen", tier: "standard", avatar: "SC", note: "New trial onboarding", risk: "low" },
  { id: "C003", name: "James O'Brien", tier: "enterprise", avatar: "JO", note: "Long-term customer", risk: "low" },
  { id: "C004", name: "Priya Sharma", tier: "premium", avatar: "PS", note: "Performance issues", risk: "critical" },
];

const TIER = {
  standard: { label: "STANDARD", cls: "text-gray-400 border-gray-700 bg-gray-900/50" },
  premium: { label: "PREMIUM", cls: "text-gray-300 border-gray-600 bg-gray-900" },
  enterprise: { label: "ENTERPRISE", cls: "text-gray-200 border-gray-500 bg-gray-800/50" },
};

const RISK_DOT = {
  low: "bg-gray-500",
  medium: "bg-gray-400",
  high: "bg-gray-300",
  critical: "bg-white animate-pulse",
};

const FEATURES = [
  {
    icon: Brain,
    title: "Long-Term Memory",
    desc: "Per-customer memory banks retain every interaction. Aria knows the full history before the first word.",
    span: "md:col-span-2",
  },
  {
    icon: Zap,
    title: "Multi-Agent AI",
    desc: "Supervisor, Memory, Sentiment, Negotiation, and Escalation agents collaborate in real time.",
    span: "",
  },
  {
    icon: Shield,
    title: "Silent Owner Intervention",
    desc: "Type any instruction. The AI weaves it in seamlessly. The customer never knows.",
    span: "",
  },
  {
    icon: BarChart2,
    title: "Churn Prediction",
    desc: "Real-time 0-100% churn scoring. Negotiation agent auto-activates above threshold.",
    span: "",
  },
  {
    icon: MessageSquare,
    title: "Conversational Interface",
    desc: "Natural dialogue with context awareness and sentiment detection.",
    span: "",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Multiple agents working together with clear escalation paths.",
    span: "md:col-span-2",
  },
];

const AGENT_PILLS = ["Memory", "Sentiment", "Resolution", "Negotiation", "Escalation", "Supervisor"];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col overflow-x-hidden">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-900">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Brain size={16} className="text-black" />
            </div>
            <span className="font-medium text-white tracking-tight">Neural Knights</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Dashboard <ChevronRight size={14} />
          </button>
          <button
            onClick={() => navigate("/chat?customer=C001")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-gray-200 text-black text-sm font-medium transition-colors"
          >
            Try Demo
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 w-full">
        <div className="grid md:grid-cols-2 gap-16 items-start">

          {/* Left: copy */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-800 text-gray-500 text-xs font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
              Neural Knights AI Platform
            </div>

            <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight text-white">
              Support that<br />
              <span className="text-gray-500">remembers</span><br />
              everything.
            </h1>

            <p className="text-gray-500 text-lg leading-relaxed max-w-[44ch]">
              Multi-agent AI platform with long-term customer memory, 
              real-time churn prediction, and seamless owner intervention.
            </p>

            {/* Agent pills */}
            <div className="flex flex-wrap gap-2">
              {AGENT_PILLS.map((a) => (
                <span
                  key={a}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-800 text-gray-500 bg-gray-900/50"
                >
                  {a}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 px-5 py-3 rounded-lg border border-gray-700 hover:border-gray-500 text-white text-sm font-medium transition-all"
              >
                <BarChart2 size={16} className="text-gray-400" />
                Owner Dashboard
              </button>
              <button
                onClick={() => navigate("/chat?customer=C001")}
                className="flex items-center gap-2 px-5 py-3 rounded-lg bg-white hover:bg-gray-200 text-black text-sm font-medium transition-all"
              >
                Try as Customer <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Right: demo customer cards */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            {DEMO_CUSTOMERS.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/chat?customer=${c.id}`)}
                className="group relative bg-gray-950 hover:bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-2xl p-5 text-left transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xs font-medium text-white">
                    {c.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{c.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${TIER[c.tier].cls}`}>
                      {TIER[c.tier].label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{c.note}</p>
                <div className="flex items-center gap-2 mt-4">
                  <div className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[c.risk]}`} />
                  <span className="text-[10px] text-gray-600 capitalize">{c.risk} risk</span>
                </div>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={14} className="text-gray-500" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24 w-full">
        <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-8">Platform Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`bg-gray-950 border border-gray-900 rounded-2xl overflow-hidden ${f.span}`}
            >
              <div className="p-6">
                <div className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
                  <f.icon size={18} className="text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center">
              <Brain size={12} className="text-gray-500" />
            </div>
            <span className="text-sm text-gray-600">Neural Knights</span>
          </div>
          <p className="text-xs text-gray-700">AI-Powered Customer Intelligence</p>
        </div>
      </footer>
    </div>
  );
}
