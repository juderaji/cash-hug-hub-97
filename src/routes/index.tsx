import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, LineChart, ShoppingCart, Wallet, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finlo — A personal finance operating system" },
      { name: "description", content: "More than budgeting. Plan purchases, forecast your runway, and never miss a bill." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">F</span>
            Finlo
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground px-3 py-2">Sign in</Link>
            <Link to="/signup" className="rounded-lg bg-foreground px-4 py-2 text-background font-medium hover:opacity-90">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Built for modern money management
        </div>
        <h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight md:text-7xl">
          Your money,<br />
          <span className="text-primary">predicted</span> not just tracked.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Finlo is a complete personal finance OS. Plan purchases, forecast your runway, and know
          exactly when your balance will run thin — before it does.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-primary-foreground font-medium hover:bg-primary/90 shadow-soft">
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-3 font-medium hover:bg-surface-muted">
            I have an account
          </Link>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Wallet, title: "Wallets & transactions", desc: "Track every account in one place with categorized history." },
            { icon: LineChart, title: "Forecast engine", desc: "Project your month-end balance and your run-out date." },
            { icon: Calendar, title: "Financial calendar", desc: "See bills, salary and planned purchases day by day." },
            { icon: ShoppingCart, title: "Shopping intel", desc: "Every wishlist item shows whether you can afford it." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
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
        Finlo · personal finance OS
      </footer>
    </div>
  );
}
