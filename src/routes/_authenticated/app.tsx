import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQueries } from "@tanstack/react-query";
import { accountsQuery, recurringQuery, plannedQuery, transactionsQuery, savingsGoalsQuery } from "@/lib/queries";
import { formatNGN } from "@/lib/format";
import { computeForecast } from "@/lib/forecast";
import { PageHeader } from "@/components/AppSidebar";
import { ArrowDownRight, ArrowUpRight, TrendingUp, AlertTriangle, ArrowLeftRight, PiggyBank } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { endOfMonth, startOfMonth, format } from "date-fns";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Dashboard | Pocketstead" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(accountsQuery),
      context.queryClient.ensureQueryData(recurringQuery),
      context.queryClient.ensureQueryData(plannedQuery),
      context.queryClient.ensureQueryData(transactionsQuery),
      context.queryClient.ensureQueryData(savingsGoalsQuery),
    ]),
  component: Dashboard,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Failed to load: {error.message}</div>,
});

function Dashboard() {
  const [{ data: accounts }, { data: recurring }, { data: planned }, { data: tx }, { data: savingsGoals }] = useSuspenseQueries({
    queries: [accountsQuery, recurringQuery, plannedQuery, transactionsQuery, savingsGoalsQuery],
  });

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const bankAccounts = accounts.filter((account) => account.type === "bank");
  const totalBankBalance = bankAccounts.reduce((sum, account) => sum + Number(account.balance), 0);
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thisMonthTx = tx.filter((t) => new Date(t.occurred_on) >= monthStart && new Date(t.occurred_on) <= monthEnd);
  const monthIncome = thisMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = thisMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const monthNet = monthIncome - monthExpense;
  const allocatedSavings = savingsGoals.reduce((sum, goal) => sum + Number(goal.saved_amount), 0);
  const savingsBalance = accounts.filter((account) => account.type === "savings").reduce((sum, account) => sum + Number(account.balance), 0);
  const unallocatedSavings = savingsBalance - allocatedSavings;
  const recentActivity = tx.slice(0, 5);

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
  // Current-year monthly trend
  const monthly: { month: string; income: number; expense: number }[] = [];
  for (let month = 0; month < 12; month++) {
    const d = new Date(now.getFullYear(), month, 1);
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

      <div className="flex flex-col">
      <div className="order-1 mb-4 grid gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-[1.65fr_0.85fr]">
        <div className="relative min-h-[210px] overflow-hidden rounded-xl bg-primary shadow-soft sm:min-h-[280px] sm:rounded-2xl lg:min-h-[260px]">
          <img src="/bank-hall.jpg" alt="A modern bank hall" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/75 via-primary/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
            <span className="ui-tech text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">Your money, made clearer</span>
            <h2 className="mt-1.5 max-w-md text-xl font-bold uppercase leading-tight tracking-[0.035em] sm:text-2xl">Plan calmly. Spend with context.</h2>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:rounded-2xl sm:p-5">
          <h2 className="mb-3 text-sm font-semibold sm:mb-4 sm:text-base">{format(now, "MMMM")} overview</h2>
          <div className="space-y-3">
            <OverviewRow label="Income" value={formatNGN(monthIncome)} tone="success" />
            <OverviewRow label="Expenses" value={formatNGN(monthExpense)} tone="destructive" />
            <OverviewRow label="Net cash flow" value={formatNGN(monthNet)} tone={monthNet >= 0 ? "success" : "destructive"} />
            <OverviewRow label="Current balance" value={formatNGN(totalBalance)} />
          </div>
          <Link to="/transactions" className="ui-tech mt-5 inline-flex text-xs font-semibold uppercase text-primary hover:text-primary/80">
            View transactions
          </Link>
        </div>
      </div>
      <div className="order-2 grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total balance" value={formatNGN(totalBalance)} sub={`${accounts.length} accounts`} accent />
        <StatCard label="Total bank balance" value={formatNGN(totalBankBalance)} sub={`${bankAccounts.length} bank ${bankAccounts.length === 1 ? "account" : "accounts"}`} />
        <StatCard label="Income this month" value={formatNGN(monthIncome)} icon={<ArrowUpRight className="text-success h-4 w-4" />} />
        <StatCard label="Spent this month" value={formatNGN(monthExpense)} icon={<ArrowDownRight className="text-destructive h-4 w-4" />} />
      </div>

      <div className="order-3 mt-4 grid gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:rounded-2xl sm:p-5">
          <h2 className="mb-3 text-sm font-semibold sm:mb-4 sm:text-base">Recent activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((item: any) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.type === "income" ? "bg-success/15 text-success" : item.type.startsWith("transfer_") ? "bg-primary-soft text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {item.type === "income" ? <ArrowUpRight className="h-4 w-4" /> : item.type.startsWith("transfer_") ? <ArrowLeftRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.description || item.categories?.name || "Transaction"}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(item.occurred_on), "MMM d")} {item.accounts?.name ? `· ${item.accounts.name}` : ""}</div>
                  </div>
                  <div className={`num text-sm font-semibold ${item.type === "income" ? "text-success" : item.type.startsWith("transfer_") ? "text-primary" : ""}`}>
                    {item.type === "income" || item.type === "transfer_in" ? "+" : "-"}{formatNGN(item.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:rounded-2xl sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold sm:text-base">Allocated savings</h2>
            <PiggyBank className="h-4 w-4 text-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <ForecastRow label="Allocated to goals" value={formatNGN(allocatedSavings)} highlight />
            <ForecastRow label="Still unallocated" value={formatNGN(unallocatedSavings)} />
          </div>
          {savingsGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No savings goals yet.</p>
          ) : (
            <ul className="space-y-3">
              {savingsGoals.slice(0, 5).map((goal) => {
                const target = Number(goal.target_amount || 0);
                const pct = target > 0 ? Math.min(100, (Number(goal.saved_amount) / target) * 100) : 0;
                return (
                  <li key={goal.id}>
                    <div className="flex items-center justify-between gap-3 text-sm mb-1">
                      <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: goal.color }} /><span className="truncate">{goal.name}</span></span>
                      <span className="num shrink-0 text-muted-foreground">{formatNGN(goal.saved_amount, { compact: true })}</span>
                    </div>
                    {target > 0 && <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full transition-all" style={{ width: pct + "%", background: goal.color }} />
                    </div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:rounded-2xl sm:p-5">
          <h2 className="mb-3 text-sm font-semibold sm:mb-4 sm:text-base">Spending by category</h2>
          {catData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No expenses yet this month.</p>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={catData}
                      dataKey="value"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                      label={renderDonutLabel}
                      labelLine={false}
                    >
                      {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatNGN(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {catData.slice(0, 5).map((c) => (
                  <li key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} /> {c.name}</span>
                    <span className="num text-muted-foreground">{formatNGN(c.value, { compact: true })}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="order-5 mt-4 rounded-xl border border-border bg-surface p-4 shadow-soft sm:mt-6 sm:rounded-2xl sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold sm:text-base">Forecast for {format(now, "MMMM")}</h2>
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          <ForecastRow label="Projected month-end" value={formatNGN(forecast.projectedMonthEnd)} highlight tone={forecast.projectedMonthEnd >= 0 ? "success" : "destructive"} />
          <ForecastRow label="Safe daily spend" value={formatNGN(forecast.safeDailySpend)} />
          <ForecastRow label="Avg daily spend" value={formatNGN(forecast.avgDailyVariableSpend)} tone="destructive" />
          <ForecastRow label="Expected income" value={formatNGN(forecast.expectedIncomeRemaining)} tone="success" />
          <ForecastRow label="Bills remaining" value={formatNGN(forecast.recurringBillsRemaining)} tone="destructive" />
          <ForecastRow label="Saved" value={formatNGN(allocatedSavings)} tone="success" />
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

      <div className="order-4 mt-4 sm:mt-6">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft sm:rounded-2xl sm:p-5">
          <h2 className="mb-3 text-sm font-semibold sm:mb-4 sm:text-base">{now.getFullYear()} monthly trend</h2>
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
      </div>
      </div>
    </>
  );
}

function StatCard({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`min-w-0 rounded-xl border p-3 shadow-soft sm:rounded-2xl sm:p-5 ${accent ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface"}`}>
      <div className="flex items-center justify-between">
        <span className={`ui-tech text-[10px] uppercase leading-tight tracking-wider sm:text-xs ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{label}</span>
        {icon}
      </div>
      <div className="num mt-1.5 truncate text-lg font-bold sm:mt-2 sm:text-3xl">{value}</div>
      {sub && <div className={`text-xs mt-1 ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}

function OverviewRow({ label, value, tone }: { label: string; value: string; tone?: "success" | "destructive" }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`num font-semibold ${tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}

function ForecastRow({ label, value, highlight, tone }: { label: string; value: string; highlight?: boolean; tone?: "success" | "destructive" }) {
  return (
    <div className={`rounded-lg p-2.5 sm:p-3 ${tone === "success" ? "bg-success/10" : tone === "destructive" ? "bg-destructive/10" : highlight ? "bg-primary-soft" : "bg-secondary"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`num mt-1 truncate text-sm font-semibold sm:text-lg ${tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function renderDonutLabel({ cx, cy, midAngle, outerRadius, percent }: any) {
  const radians = -Number(midAngle) * (Math.PI / 180);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const radius = Number(outerRadius);
  const startX = Number(cx) + (radius + 3) * cos;
  const startY = Number(cy) + (radius + 3) * sin;
  const elbowX = Number(cx) + (radius + 11) * cos;
  const elbowY = Number(cy) + (radius + 11) * sin;
  const lineEndX = elbowX + (cos >= 0 ? 8 : -8);
  const textX = lineEndX + (cos >= 0 ? 3 : -3);

  return (
    <g>
      <polyline
        points={`${startX},${startY} ${elbowX},${elbowY} ${lineEndX},${elbowY}`}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1}
      />
      <text
        x={textX}
        y={elbowY}
        fill="var(--muted-foreground)"
        textAnchor={cos >= 0 ? "start" : "end"}
        dominantBaseline="central"
        className="text-[11px] font-medium"
      >
        {`${((percent ?? 0) * 100).toFixed(1)}%`}
      </text>
    </g>
  );
}
