import { useNavigate } from "react-router-dom";
import {
  Brain, BarChart2, Shield, Zap, MessageSquare, Users,
  ChevronRight, Phone, Activity, ArrowRight,
} from "lucide-react";

const DEMO_CUSTOMERS = [
  { id: "C001", name: "Rahul Mehta",    tier: "premium",    avatar: "RM", note: "Billing dispute, frustrated",   risk: "high" },
  { id: "C002", name: "Sarah Chen",     tier: "standard",   avatar: "SC", note: "New trial onboarding",          risk: "low" },
  { id: "C003", name: "James O'Brien",  tier: "enterprise", avatar: "JO", note: "Happy long-term customer",      risk: "low" },
  { id: "C004", name: "Priya Sharma",   tier: "premium",    avatar: "PS", note: "Performance complaints",        risk: "critical" },
];

const TIER = {
  standard:   { label: "STANDARD",   cls: "text-sky-400 border-sky-800 bg-sky-950/60" },
  premium:    { label: "PREMIUM",    cls: "text-amber-400 border-amber-800 bg-amber-950/60" },
  enterprise: { label: "ENTERPRISE", cls: "text-violet-400 border-violet-800 bg-violet-950/60" },
};

const RISK_DOT = {
  low:      "bg-emerald-500",
  medium:   "bg-amber-400",
  high:     "bg-orange-500",
  critical: "bg-red-500 animate-pulse",
};

// Bento features - varied sizes via col/row span
const FEATURES = [
  {
    icon: Brain,
    title: "Long-Term Memory",
    desc: "Hindsight-powered per-customer memory banks retain every interaction, forever. Aria knows the full history before the first word.",
    span: "md:col-span-2",
    accent: "emerald",
    img: "https://picsum.photos/seed/cia-memory/600/200",
  },
  {
    icon: Zap,
    title: "Multi-Agent AI",
    desc: "Supervisor, Memory, Sentiment, Negotiation, and Escalation agents collaborate in real time.",
    span: "",
    accent: "emerald",
  },
  {
    icon: Shield,
    title: "Silent Owner Intervention",
    desc: "Type any instruction. The AI weaves it in seamlessly. The customer never knows.",
    span: "",
    accent: "amber",
  },
  {
    icon: BarChart2,
    title: "Churn Prediction",
    desc: "Real-time 0-100% churn scoring. Negotiation agent auto-activates above 70%.",
    span: "",
    accent: "emerald",
  },
  {
    icon: Phone,
    title: "Voice Support",
    desc: "Outbound calls via Twilio. Aria speaks, listens, and escalates using the same AI pipeline.",
    span: "",
    accent: "emerald",
  },
  {
    icon: Activity,
    title: "Live Intelligence",
    desc: "Real-time sentiment chart, intent classification, open tickets, and AI recommendations per customer.",
    span: "md:col-span-2",
    accent: "emerald",
    img: "https://picsum.photos/seed/cia-dashboard/600/180",
  },
];

const AGENT_PILLS = ["Memory", "Sentiment", "Resolution", "Negotiation", "Escalation", "Supervisor"];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex flex-col overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/60 glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Brain size={16} className="text-zinc-950" />
            </div>
            <span className="font-bold text-zinc-50 tracking-tight">CIA</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
          >
            Dashboard <ChevronRight size={14} />
          </button>
          <button
            onClick={() => navigate("/chat?customer=C001")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            Try Demo
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* Left: copy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/40 text-emerald-400 text-xs font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Hackathon 2025 - Live Demo
            </div>

            <h1 className="text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-zinc-50">
              Support that{" "}
              <span className="animate-shimmer">remembers</span>
              <br />everything.
            </h1>

            <p className="text-zinc-400 text-lg leading-relaxed max-w-[48ch]">
              Multi-agent AI platform with long-term customer memory, real-time churn prediction,
              and seamless owner intervention.
            </p>

            {/* Agent pills */}
            <div className="flex flex-wrap gap-2">
              {AGENT_PILLS.map((a) => (
                <span
                  key={a}
                  className="text-xs px-2.5 py-1 rounded-full border border-zinc-700 text-zinc-400 bg-zinc-900"
                >
                  {a}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-50 text-sm font-semibold border border-zinc-700 transition-colors active:scale-[0.98]"
              >
                <BarChart2 size={16} className="text-emerald-400" />
                Owner Dashboard
              </button>
              <button
                onClick={() => navigate("/chat?customer=C001")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-semibold transition-colors active:scale-[0.98]"
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
                className="group relative bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-700/60 rounded-xl p-4 text-left transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {c.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{c.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${TIER[c.tier].cls}`}>
                      {TIER[c.tier].label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{c.note}</p>
                <div className="flex items-center gap-1.5 mt-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[c.risk]}`} />
                  <span className="text-[10px] text-zinc-500 capitalize">{c.risk} risk</span>
                </div>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={14} className="text-emerald-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Bento ── */}
      <section className="max-w-7xl mx-auto px-6 pb-20 w-full">
        <h2 className="text-xl font-bold text-zinc-50 mb-6">Platform Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden ${f.span}`}
            >
              {f.img && (
                <img
                  src={f.img}
                  alt=""
                  className="w-full h-32 object-cover opacity-60"
                  loading="lazy"
                />
              )}
              <div className="p-5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${f.accent === "amber" ? "bg-amber-500/15" : "bg-emerald-500/15"}`}>
                  <f.icon size={17} className={f.accent === "amber" ? "text-amber-400" : "text-emerald-400"} />
                </div>
                <h3 className="font-semibold text-zinc-100 mb-1.5">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center">
              <Brain size={10} className="text-zinc-950" />
            </div>
            <span>CIA - Customer Intelligence Agent</span>
          </div>
          <span>Powered by OpenAI + Hindsight Memory</span>
        </div>
      </footer>
    </div>
  );
}
