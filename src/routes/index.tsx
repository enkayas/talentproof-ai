import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Link2,
  ClipboardCheck,
  Trophy,
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

const PURPLE_GLOW =
  "radial-gradient(45% 60% at 70% 40%, color-mix(in oklab, var(--accent-purple) 70%, transparent) 0%, transparent 70%)";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="flex h-7 w-10 items-center justify-center rounded-full border border-foreground/80">
        <div className="h-2 w-2 rounded-full bg-foreground" />
      </div>
      <span className="text-xl font-semibold tracking-tight">TalentFirst</span>
    </Link>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-10 md:flex">
          <a href="#how" className="text-sm text-foreground/70 transition hover:text-foreground">
            How it Works
          </a>
          <a
            href="#recruiters"
            className="text-sm text-foreground/70 transition hover:text-foreground"
          >
            For Recruiters
          </a>
          <a
            href="#freshers"
            className="text-sm text-foreground/70 transition hover:text-foreground"
          >
            For Freshers
          </a>
        </nav>
        <Link
          to="/auth"
          search={{ mode: "login" }}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          Recruiter Login
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-28 sm:pt-24 sm:pb-36">
      <div
        className="pointer-events-none absolute right-[10%] top-[18%] h-[420px] w-[420px] opacity-90 blur-2xl"
        style={{ background: PURPLE_GLOW }}
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-purple">
          The Anti-Resume Movement
        </p>
        <h1 className="font-serif mt-8 text-5xl leading-[1.02] text-foreground sm:text-7xl lg:text-[88px]">
          Stop Sifting Through 3,000 Resumes.{" "}
          <em className="not-italic text-accent-purple/90 italic">Hire on Proof,</em>{" "}
          Not Keywords.
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-foreground/65 sm:text-lg">
          Stop losing great non-technical talent to rigid ATS keyword filters. Create smart
          conversational Q&amp;A links for your roles. Our AI evaluates communication, critical
          logic, and practical skills—giving you a pre-ranked leaderboard of the top 10% applicants.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            Create a Job Link — it's free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-7 py-3.5 text-sm font-medium text-foreground transition hover:border-foreground/50"
          >
            Watch Demo
          </a>
        </div>
      </div>

      <div className="relative mx-auto mt-20 grid max-w-7xl gap-6 md:grid-cols-3">
        <FeatureCard
          eyebrow="Generate"
          title="Build a screening link in seconds"
          body="Recruiters create a role and add up to 3 short situational text questions. Shareable in seconds."
          mock={<LinkMock />}
        />
        <FeatureCard
          eyebrow="Evaluate"
          title="Candidates prove competency"
          body="Freshers answer through a distraction-free, mobile-first step-by-step form. No formatting hacks required."
          mock={<FormMock />}
        />
        <FeatureCard
          eyebrow="Shortlist"
          title="Review the top 10%"
          body="Our AI scores responses against your criteria. You get a ranked leaderboard and instantly choose who to contact."
          mock={<LeaderboardMock />}
        />
      </div>
    </section>
  );
}

function FeatureCard({
  eyebrow,
  title,
  body,
  mock,
}: {
  eyebrow: string;
  title: string;
  body: string;
  mock: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-foreground/10 bg-card p-6">
      <div
        className="pointer-events-none absolute -inset-10 opacity-60 transition-opacity duration-500 group-hover:opacity-90"
        style={{ background: PURPLE_GLOW }}
      />
      <div className="relative">
        <div className="flex h-56 items-center justify-center rounded-2xl bg-[#3a2d1f] p-4">
          {mock}
        </div>
        <h3 className="font-serif mt-8 text-3xl text-foreground">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-foreground/60">{body}</p>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-purple/80">
          {eyebrow}
        </p>
      </div>
    </div>
  );
}

function LinkMock() {
  return (
    <div className="w-full rounded-lg bg-[#4a3a28] p-4 text-left">
      <div className="text-[10px] uppercase tracking-wider text-[#e8c98a]">TalentFirst</div>
      <div className="mt-2 text-sm text-[#f3e6c8]">Marketing Associate · Apply</div>
      <div className="mt-3 rounded bg-[#e8c98a]/90 px-3 py-1.5 text-[11px] font-semibold text-[#3a2d1f] w-fit">
        Start screening →
      </div>
    </div>
  );
}

function FormMock() {
  return (
    <div className="w-full rounded-lg bg-[#4a3a28] p-4 text-left">
      <div className="text-[10px] uppercase tracking-wider text-[#e8c98a]">Question 2 of 3</div>
      <div className="mt-2 text-xs text-[#f3e6c8]">
        Describe a time you turned an angry customer around.
      </div>
      <div className="mt-3 h-12 rounded border border-[#e8c98a]/40 bg-[#3a2d1f] p-2 text-[10px] text-[#f3e6c8]/70">
        Last month a client threatened to churn...
      </div>
    </div>
  );
}

function LeaderboardMock() {
  const rows = [
    { n: "AS", name: "Aditi S.", s: 92 },
    { n: "RV", name: "Rahul V.", s: 88 },
    { n: "PN", name: "Priya N.", s: 84 },
  ];
  return (
    <div className="w-full rounded-lg bg-[#4a3a28] p-3 text-left">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#e8c98a]">
        <span>Top 10%</span>
        <Trophy className="h-3 w-3" />
      </div>
      <div className="mt-2 space-y-1.5">
        {rows.map((r, i) => (
          <div
            key={r.n}
            className="flex items-center gap-2 rounded bg-[#3a2d1f] px-2 py-1.5 text-[11px] text-[#f3e6c8]"
          >
            <span className="text-[#e8c98a]/70">0{i + 1}</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e8c98a]/20 text-[9px]">
              {r.n}
            </span>
            <span className="flex-1">{r.name}</span>
            <span className="font-semibold text-[#e8c98a]">{r.s}</span>
          </div>
        ))}
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
    <section id="recruiters" className="relative px-6 py-28">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 opacity-40 blur-3xl"
        style={{ background: PURPLE_GLOW }}
      />
      <div className="relative mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-purple">
            The Broken Loop
          </p>
          <h2 className="font-serif mt-6 text-4xl text-foreground sm:text-6xl">
            The entry-level hiring loop is{" "}
            <em className="not-italic italic text-accent-purple/90">broken.</em>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-foreground/60">
            Both sides are exhausted. Recruiters drown in noise. Freshers shout into a void.
          </p>
        </div>
        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-foreground/10 bg-card p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/50">
              The Old Way
            </p>
            <h3 className="font-serif mt-3 text-3xl text-foreground">Broken</h3>
            <ul className="mt-8 space-y-5">
              {broken.map((b) => (
                <li key={b} className="flex gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-foreground/40" />
                  <span className="text-sm leading-relaxed text-foreground/75">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-accent-purple/30 bg-card p-8">
            <div
              className="pointer-events-none absolute -inset-10 opacity-60"
              style={{ background: PURPLE_GLOW }}
            />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-purple">
                The TalentFirst Way
              </p>
              <h3 className="font-serif mt-3 text-3xl text-foreground">Built on proof</h3>
              <ul className="mt-8 space-y-5">
                {fixed.map((b) => (
                  <li key={b} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-purple" />
                    <span className="text-sm leading-relaxed text-foreground/85">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
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
    <section id="how" className="px-6 py-28">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-purple">
          How it works
        </p>
        <h2 className="font-serif mt-6 text-4xl text-foreground sm:text-6xl">
          Three steps from job post to a{" "}
          <em className="not-italic italic text-accent-purple/90">shortlist</em> worth calling.
        </h2>
      </div>
      <div className="mx-auto mt-16 grid max-w-6xl gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="rounded-3xl border border-foreground/10 bg-card p-8 transition hover:border-accent-purple/40"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-purple/40 text-accent-purple">
                <s.icon className="h-5 w-5" />
              </div>
              <span className="font-serif text-2xl text-foreground/40">0{i + 1}</span>
            </div>
            <h3 className="font-serif mt-8 text-2xl text-foreground">{s.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-foreground/60">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section id="freshers" className="px-6 pb-28">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-foreground/10 bg-card p-12 text-center sm:p-20">
        <div
          className="pointer-events-none absolute -top-20 left-1/2 h-[400px] w-[600px] -translate-x-1/2 opacity-70 blur-2xl"
          style={{ background: PURPLE_GLOW }}
        />
        <div className="relative">
          <h2 className="font-serif text-4xl text-foreground sm:text-6xl">
            Ready to fix your entry-level{" "}
            <em className="not-italic italic text-accent-purple/90">hiring funnel?</em>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-foreground/65">
            Create your first job screening link in less than 2 minutes. Free for early-stage teams.
          </p>
          <div className="mt-10 flex justify-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-4 text-sm font-medium text-background transition hover:opacity-90"
            >
              Get Started Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-foreground/10 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <Logo />
        <p className="text-xs text-foreground/50">
          © {new Date().getFullYear()} TalentFirst. Hire on proof.
        </p>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
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
