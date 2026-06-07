import { useNavigate } from "react-router-dom";
import { Brain, BarChart2, Shield, Zap, MessageSquare, Users, ChevronRight, Phone, Activity, ArrowRight } from "lucide-react";

const DEMO_CUSTOMERS = [
  { id: "C001", name: "Rahul Mehta", tier: "premium", avatar: "RM", note: "Billing dispute, frustrated", risk: "high" },
  { id: "C002", name: "Sarah Chen", tier: "standard", avatar: "SC", note: "New trial onboarding", risk: "low" },
  { id: "C003", name: "James O'Brien", tier: "enterprise", avatar: "JO", note: "Happy long-term customer", risk: "low" },
  { id: "C004", name: "Priya Sharma", tier: "premium", avatar: "PS", note: "Performance complaints", risk: "critical" },
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
    desc: "Hindsight-powered per-customer memory banks retain every interaction, forever. Aria knows the full history before the first word.",
    span: "md:col-span-2",
    img: "https://picsum.photos/seed/cia-memory/600/200",
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
    desc: "Real-time 0-100% churn scoring. Negotiation agent auto-activates above 70%.",
    span: "",
  },
  {
    icon: Phone,
    title: "Voice Support",
    desc: "Outbound calls via Twilio. Aria speaks, listens, and escalates using the same AI pipeline.",
    span: "",
  },
  {
    icon: Activity,
    title: "Live Intelligence",
    desc: "Real-time sentiment chart, intent classification, open tickets, and AI recommendations per customer.",
    span: "md:col-span-2",
    img: "https://picsum.photos/seed/cia-dashboard/600/180",
  },
];

const AGENT_PILLS = ["Memory", "Sentiment", "Resolution", "Negotiation", "Escalation", "Supervisor"];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col overflow-x-hidden">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-900">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Brain size={16} className="text-black" />
            </div>
            <span className="font-bold text-white tracking-tight">Neural Knights</span>
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-gray-200 text-black text-sm font-semibold transition-colors"
          >
            Try Demo
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* Left: copy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-800 bg-gray-950 text-gray-400 text-xs font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              Neural Knights AI Platform
            </div>

            <h1 className="text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-white">
              Support that{" "}
              <span className="text-gray-500">remembers</span>
              <br />everything.
            </h1>

            <p className="text-gray-500 text-lg leading-relaxed max-w-[48ch]">
              Multi-agent AI platform with long-term customer memory, real-time churn prediction,
              and seamless owner intervention.
            </p>

            {/* Agent pills */}
            <div className="flex flex-wrap gap-2">
              {AGENT_PILLS.map((a) => (
                <span
                  key={a}
                  className="text-xs px-2.5 py-1 rounded-full border border-gray-800 text-gray-400 bg-gray-900"
                >
                  {a}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold border border-gray-700 transition-colors"
              >
                <BarChart2 size={16} className="text-gray-400" />
                Owner Dashboard
              </button>
              <button
                onClick={() => navigate("/chat?customer=C001")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-gray-200 text-black text-sm font-semibold transition-colors"
              >
                Try as Customer <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Right: demo customer cards */}
          <div className="grid grid-cols-2 gap-3">
            {DEMO_CUSTOMERS.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/chat?customer=${c.id}`)}
                className="group relative bg-gray-950 hover:bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 text-left transition-all duration-200"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {c.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${TIER[c.tier].cls}`}>
                      {TIER[c.tier].label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{c.note}</p>
                <div className="flex items-center gap-1.5 mt-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[c.risk]}`} />
                  <span className="text-[10px] text-gray-500 capitalize">{c.risk} risk</span>
                </div>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={14} className="text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento */}
      <section className="max-w-7xl mx-auto px-6 pb-20 w-full">
        <h2 className="text-xl font-bold text-white mb-6">Platform Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`bg-gray-950 border border-gray-900 rounded-xl overflow-hidden ${f.span}`}
            >
              {f.img && (
                <img
                  src={f.img}
                  alt=""
                  className="w-full h-32 object-cover opacity-40"
                  loading="lazy"
                />
              )}
              <div className="p-5">
                <div className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center mb-3">
                  <f.icon size={17} className="text-gray-400" />
                </div>
                <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center">
              <Brain size={10} className="text-gray-500" />
            </div>
            <span>Neural Knights</span>
          </div>
          <span>AI-Powered Customer Intelligence</span>
        </div>
      </footer>
    </div>
  );
}
