import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  Link2,
  ClipboardCheck,
  Trophy,
  ShieldCheck,
  Play,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TalentFirst — Hire on Proof, Not Keywords" },
      {
        name: "description",
        content:
          "Replace resumes with AI-evaluated competency forms. Get a pre-ranked leaderboard of the top 10% non-technical and humanities freshers.",
      },
      { property: "og:title", content: "TalentFirst — Hire on Proof, Not Keywords" },
      {
        property: "og:description",
        content:
          "Conversational screening links that score candidates on logic, communication, and empathy.",
      },
    ],
  }),
  component: Landing,
});

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <span className="text-lg font-semibold tracking-tight text-foreground">TalentFirst</span>
    </Link>
  );
}

function Nav() {
  const links = [
    { href: "#how", label: "How it Works" },
    { href: "#recruiters", label: "For Recruiters" },
    { href: "#freshers", label: "For Freshers" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary hover:text-primary"
        >
          Recruiter Login
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 20% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent), radial-gradient(40% 40% at 90% 10%, color-mix(in oklab, var(--primary) 8%, transparent), transparent)",
        }}
      />
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            The Anti-Resume Movement
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Stop Sifting Through 3,000 Resumes.{" "}
            <span className="text-primary">Hire on Proof,</span> Not Keywords.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Stop losing great non-technical talent to rigid ATS keyword filters. Create smart
            conversational Q&amp;A links for your roles. Our AI evaluates communication, critical
            logic, and practical skills—giving you a pre-ranked leaderboard of the top 10%
            applicants.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:shadow-md"
            >
              Create a Job Link (Recruiter)
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-all hover:border-foreground/30"
            >
              <Play className="h-4 w-4" />
              Watch Demo
            </a>
          </div>
          <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" /> No credit card
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" /> 2-minute setup
            </div>
          </div>
        </div>
        <LeaderboardMock />
      </div>
    </section>
  );
}

function LeaderboardMock() {
  const rows = [
    { name: "Aditi Sharma", role: "Marketing Associate", score: 92, tone: "high" },
    { name: "Rahul Verma", role: "Operations Analyst", score: 88, tone: "high" },
    { name: "Priya Nair", role: "Content Strategist", score: 84, tone: "mid" },
    { name: "Karan Mehta", role: "People Ops Intern", score: 79, tone: "mid" },
    { name: "Sana Iqbal", role: "Customer Success", score: 71, tone: "low" },
  ];
  const toneClass = (t: string) =>
    t === "high"
      ? "bg-[color-mix(in_oklab,var(--primary)_15%,transparent)] text-primary"
      : t === "mid"
        ? "bg-amber-100 text-amber-700"
        : "bg-muted text-muted-foreground";

  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-primary/10 via-transparent to-primary/5 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Recruiter Leaderboard</span>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            Top 10%
          </span>
        </div>
        <div className="divide-y divide-border">
          {rows.map((r, i) => (
            <div
              key={r.name}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
            >
              <span className="w-6 text-sm font-semibold text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                {r.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{r.name}</div>
                <div className="truncate text-xs text-muted-foreground">{r.role}</div>
              </div>
              <span
                className={`rounded-md px-2.5 py-1 text-xs font-bold tabular-nums ${toneClass(r.tone)}`}
              >
                {r.score}/100
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
          <span>Ranked by AI on logic · writing · empathy</span>
          <span className="font-medium text-foreground">3,142 applicants screened</span>
        </div>
      </div>
    </div>
  );
}

function Compare() {
  const broken = [
    "LinkedIn CV Spam (3000+ blind applications)",
    "Keyword Gaming (ATS algorithms filtering out genuine talent)",
    "Unrealistic 'Fresher' job descriptions requiring 3 years of experience",
  ];
  const fixed = [
    "Conversational Screening (Candidates answer situational questions directly)",
    "Holistic AI Grading (Scored on logic, writing density, and empathy)",
    "Zero Noise (Recruiters only unlock CVs for the top 5–10 pre-screened matches)",
  ];
  return (
    <section id="recruiters" className="border-y border-border bg-muted/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            The entry-level hiring loop is broken.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Both sides are exhausted. Recruiters drown in noise. Freshers shout into a void.
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-destructive/20 bg-card p-8">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-destructive">
                The Old Way
              </span>
              <span className="text-sm font-medium text-muted-foreground">Broken</span>
            </div>
            <ul className="mt-6 space-y-4">
              {broken.map((b) => (
                <li key={b} className="flex gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                  <span className="text-sm leading-relaxed text-foreground">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-card p-8 shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_15%,transparent)]">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                The TalentFirst Way
              </span>
              <span className="text-sm font-medium text-muted-foreground">Built on proof</span>
            </div>
            <ul className="mt-6 space-y-4">
              {fixed.map((b) => (
                <li key={b} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <span className="text-sm leading-relaxed text-foreground">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Link2,
      title: "Generate Your Link",
      desc: "Recruiters create a role and add up to 3 short situational text questions. Shareable in seconds.",
    },
    {
      icon: ClipboardCheck,
      title: "Candidates Prove Competency",
      desc: "Freshers answer through a distraction-free, mobile-first step-by-step form. No formatting hacks required.",
    },
    {
      icon: Trophy,
      title: "Review the Top 10%",
      desc: "Our AI scores responses against your criteria. You get a ranked leaderboard and instantly choose who to contact.",
    },
  ];
  return (
    <section id="how" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" /> How it works
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Three steps from job post to a shortlist worth calling.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="group relative rounded-2xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section id="freshers" className="px-6 pb-24">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-foreground p-12 text-center shadow-2xl sm:p-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(50% 60% at 50% 0%, color-mix(in oklab, var(--primary) 40%, transparent), transparent)",
          }}
        />
        <h2 className="text-3xl font-semibold tracking-tight text-background sm:text-4xl">
          Ready to fix your entry-level hiring funnel?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-background/70">
          Create your first job screening link in less than 2 minutes. Free for early-stage teams.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 hover:shadow-xl"
          >
            Get Started Now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <Logo />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} TalentFirst. Hire on proof.
        </p>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        <Compare />
        <HowItWorks />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
