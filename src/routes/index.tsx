import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, LineChart, PiggyBank, Wallet, Sparkles } from "lucide-react";
import { PocketsteadLogo } from "@/components/PocketsteadLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pocketstead | A personal finance operating system" },
      { name: "description", content: "Track accounts, plan spending, allocate savings, and understand where your money is going." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <PocketsteadLogo />
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground px-3 py-2">Sign in</Link>
            <Link to="/signup" className="rounded-lg bg-foreground px-4 py-2 text-background font-medium hover:opacity-90">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-28 sm:pt-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Built for everyday money decisions
        </div>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:mt-6 sm:text-5xl md:text-7xl">
          Your money,<br />
          <span className="text-primary">predicted</span> not just tracked.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground sm:mt-6 sm:text-lg">
          Pocketstead helps you track accounts, organize spending, set money aside, and plan the next few
          weeks with more context.
        </p>
        <div className="mt-7 flex flex-wrap gap-3 sm:mt-10">
          <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-primary-foreground font-medium hover:bg-primary/90 shadow-soft">
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-3 font-medium hover:bg-surface-muted">
            I have an account
          </Link>
        </div>

        <div className="mt-12 grid gap-3 sm:mt-20 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Wallet, title: "Wallets & transactions", desc: "Track every account in one place with categorized history." },
            { icon: LineChart, title: "Monthly forecast", desc: "Estimate your month-end balance from income, spending, bills, and plans." },
            { icon: Calendar, title: "Editable calendar", desc: "Add, edit, and complete planned spending directly from the calendar." },
            { icon: PiggyBank, title: "Savings allocations", desc: "Split money inside savings accounts into practical goals and unallocated funds." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-primary/10 bg-primary-soft/55 p-4 shadow-soft sm:rounded-2xl sm:p-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        Pocketstead · personal finance OS
      </footer>
    </div>
  );
}
