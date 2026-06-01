import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQueries } from "@tanstack/react-query";
import { accountsQuery, recurringQuery, plannedQuery, transactionsQuery, budgetsQuery } from "@/lib/queries";
import { formatNGN } from "@/lib/format";
import { computeForecast } from "@/lib/forecast";
import { PageHeader } from "@/components/AppSidebar";
import { ArrowDownRight, ArrowUpRight, TrendingUp, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { endOfMonth, startOfMonth, format } from "date-fns";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Dashboard — Finlo" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(accountsQuery),
      context.queryClient.ensureQueryData(recurringQuery),
      context.queryClient.ensureQueryData(plannedQuery),
      context.queryClient.ensureQueryData(transactionsQuery),
      context.queryClient.ensureQueryData(budgetsQuery),
    ]),
  component: Dashboard,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Failed to load: {error.message}</div>,
});

function Dashboard() {
  const [{ data: accounts }, { data: recurring }, { data: planned }, { data: tx }, { data: budgets }] = useSuspenseQueries({
    queries: [accountsQuery, recurringQuery, plannedQuery, transactionsQuery, budgetsQuery],
  });

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thisMonthTx = tx.filter((t) => new Date(t.occurred_on) >= monthStart && new Date(t.occurred_on) <= monthEnd);
  const monthIncome = thisMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = thisMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const forecast = computeForecast({
    accountsBalance: totalBalance,
    transactions: tx.map((t) => ({ amount: Number(t.amount), type: t.type as "income" | "expense", occurred_on: t.occurred_on })),
    recurring: recurring.map((r) => ({ amount: Number(r.amount), day_of_month: r.day_of_month, kind: r.kind as any })),
    planned: planned.map((p) => ({ amount: Number(p.amount), due_date: p.due_date, completed: p.completed })),
  });

  // Category breakdown for this month
  const catMap = new Map<string, { name: string; value: number; color: string }>();
  for (const t of thisMonthTx.filter((t) => t.type === "expense")) {
    const c: any = t.categories;
    const name = c?.name ?? "Uncategorized";
    const color = c?.color ?? "#94a3b8";
    const existing = catMap.get(name);
    if (existing) existing.value += Number(t.amount);
    else catMap.set(name, { name, value: Number(t.amount), color });
  }
  const catData = Array.from(catMap.values()).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const categoryTotal = catData.reduce((sum, category) => sum + category.value, 0);

  // Last 6 months bar chart
  const monthly: { month: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ms = startOfMonth(d), me = endOfMonth(d);
    const inRange = tx.filter((t) => new Date(t.occurred_on) >= ms && new Date(t.occurred_on) <= me);
    monthly.push({
      month: format(d, "MMM"),
      income: inRange.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
      expense: inRange.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    });
  }

  return (
    <>
      <PageHeader title="Dashboard" subtitle={format(now, "EEEE, MMMM d")} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total balance" value={formatNGN(totalBalance)} sub={`${accounts.length} accounts`} accent />
        <StatCard label="Income this month" value={formatNGN(monthIncome)} icon={<ArrowUpRight className="text-success h-4 w-4" />} />
        <StatCard label="Spent this month" value={formatNGN(monthExpense)} icon={<ArrowDownRight className="text-destructive h-4 w-4" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Forecast for {format(now, "MMMM")}</h2>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ForecastRow label="Projected month-end" value={formatNGN(forecast.projectedMonthEnd)} highlight />
            <ForecastRow label="Safe daily spend" value={formatNGN(forecast.safeDailySpend)} />
            <ForecastRow label="Avg daily spend" value={formatNGN(forecast.avgDailyVariableSpend)} />
            <ForecastRow label="Expected income" value={formatNGN(forecast.expectedIncomeRemaining)} />
            <ForecastRow label="Bills remaining" value={formatNGN(forecast.recurringBillsRemaining)} />
            <ForecastRow label="Planned remaining" value={formatNGN(forecast.plannedRemaining)} />
          </div>
          {forecast.runOutDate && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                At your current pace, funds may run out around <strong>{format(forecast.runOutDate, "MMM d")}</strong>.
                Trim daily spend to <strong>{formatNGN(forecast.safeDailySpend)}</strong> to finish the month safely.
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <h2 className="font-semibold mb-4">Spending by category</h2>
          {catData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No expenses yet this month.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={catData}
                    dataKey="value"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                    label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
                    labelLine={false}
                  >
                    {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatNGN(v)} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1.5">
                {catData.slice(0, 5).map((c) => (
                  <li key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} /> {c.name}</span>
                    <span className="num text-muted-foreground">{formatNGN(c.value, { compact: true })} · {Math.round((c.value / categoryTotal) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <h2 className="font-semibold mb-4">Last 6 months</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly}>
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatNGN(v, { compact: true })} />
              <Tooltip formatter={(v: number) => formatNGN(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }} />
              <Bar dataKey="income" fill="var(--success)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <h2 className="font-semibold mb-4">Budget progress</h2>
          {budgets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No budgets set yet.</p>
          ) : (
            <ul className="space-y-3">
              {budgets.map((b: any) => {
                const spent = thisMonthTx.filter((t) => t.category_id === b.category_id && t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
                const pct = Math.min(100, (spent / Number(b.amount)) * 100);
                const over = spent > Number(b.amount);
                return (
                  <li key={b.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: b.categories?.color }} /> {b.categories?.name}</span>
                      <span className="num text-muted-foreground">{formatNGN(spent)} / {formatNGN(b.amount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full transition-all" style={{ width: pct + "%", background: over ? "var(--destructive)" : b.categories?.color ?? "var(--primary)" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-soft ${accent ? "bg-foreground text-background border-foreground" : "bg-surface border-border"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs uppercase tracking-wider ${accent ? "text-background/60" : "text-muted-foreground"}`}>{label}</span>
        {icon}
      </div>
      <div className="num mt-2 text-3xl font-bold">{value}</div>
      {sub && <div className={`text-xs mt-1 ${accent ? "text-background/60" : "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}

function ForecastRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-primary-soft" : "bg-secondary"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`num text-lg font-semibold mt-1 ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
