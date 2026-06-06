import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQueries, useQueryClient } from "@tanstack/react-query";
import { transactionsQuery, accountsQuery, categoriesQuery, savingsGoalsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { formatNGN, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/AppSidebar";
import { Modal, Field, ModalActions, EmptyState, BtnStyles } from "./accounts";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Pencil, Download, ChevronDown, FileText, FileSpreadsheet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({ meta: [{ title: "Transactions | Pocketstead" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(transactionsQuery),
      context.queryClient.ensureQueryData(accountsQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(savingsGoalsQuery),
    ]),
  component: TxPage,
});

function TxPage() {
  const [{ data: tx }, { data: accounts }, { data: categories }, { data: savingsGoals }] = useSuspenseQueries({
    queries: [transactionsQuery, accountsQuery, categoriesQuery, savingsGoalsQuery],
  });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const filtered = useMemo(() => filter === "all" ? tx : tx.filter((t) => t.type === filter), [tx, filter]);

  const remove = async (id: string) => {
    const t = tx.find((x) => x.id === id);
    if (!t) return;
    if (!confirm("Delete this transaction?")) return;
    const { error } = t.type.startsWith("transfer_")
      ? await supabase.rpc("delete_transfer", { p_transaction_id: id })
      : await supabase.rpc("delete_transaction", { p_transaction_id: id });
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries(); }
  };

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle={`${tx.length} entries`}
        action={<div className="grid grid-cols-3 gap-2 sm:flex">
          <ExportMenu transactions={filtered} filter={filter} />
          <button onClick={() => setTransferOpen(true)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-secondary sm:gap-2 sm:px-4 sm:text-sm"><ArrowLeftRight className="h-4 w-4" /> Transfer</button>
          <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add</button>
        </div>}
      />

      <div className="flex gap-2 mb-4">
        {(["all", "income", "expense"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${filter === f ? "bg-foreground text-background" : "bg-surface border border-border text-muted-foreground hover:bg-secondary"}`}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="No transactions yet." onAction={() => setOpen(true)} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface sm:rounded-2xl">
          <ul className="divide-y divide-border">
            {filtered.map((t: any) => (
              <li key={t.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2.5 gap-y-1 px-3 py-2.5 hover:bg-secondary/40 sm:flex sm:gap-4 sm:px-4 sm:py-3">
                <div className={`row-span-2 grid h-8 w-8 place-items-center rounded-lg sm:h-9 sm:w-9 ${t.type === "income" ? "bg-success/15 text-success" : t.type.startsWith("transfer_") ? "bg-primary-soft text-primary" : "bg-destructive/10 text-destructive"}`}>
                  {t.type === "income" ? <ArrowUpRight className="h-4 w-4" /> : t.type.startsWith("transfer_") ? <ArrowLeftRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium sm:text-base">{t.description || t.categories?.name || "—"}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                    <span>{formatDate(t.occurred_on)}</span>
                    {t.accounts?.name && <span>· {t.accounts.name}</span>}
                    {t.categories?.name && <span>· {t.categories.name}</span>}
                  </div>
                </div>
                <div className={`num text-sm font-semibold sm:text-base ${t.type === "income" ? "text-success" : t.type.startsWith("transfer_") ? "text-primary" : ""}`}>{t.type === "income" || t.type === "transfer_in" ? "+" : "-"}{formatNGN(t.amount)}</div>
                <div className="col-start-3 flex justify-end gap-3 sm:gap-2">
                  <button onClick={() => t.type.startsWith("transfer_") ? setEditingTransfer(t) : setEditing(t)} className="text-muted-foreground hover:text-primary" aria-label={t.type.startsWith("transfer_") ? "Edit transfer" : "Edit transaction"}><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete transaction"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && <TxDialog onClose={() => setOpen(false)} accounts={accounts} categories={categories} savingsGoals={savingsGoals} />}
      {editing && <TxDialog transaction={editing} onClose={() => setEditing(null)} accounts={accounts} categories={categories} savingsGoals={savingsGoals} />}
      {transferOpen && <TransferDialog onClose={() => setTransferOpen(false)} accounts={accounts} transactions={tx} />}
      {editingTransfer && <TransferDialog transfer={editingTransfer} onClose={() => setEditingTransfer(null)} accounts={accounts} transactions={tx} />}
      <BtnStyles />
    </>
  );
}

function ExportMenu({ transactions, filter }: { transactions: any[]; filter: "all" | "income" | "expense" }) {
  const exportCSV = () => {
    if (transactions.length === 0) return toast.error("There are no transactions to export");
    const rows = transactions.map(toExportRow);
    const csv = [
      ["Date", "Type", "Description", "Account", "Category", "Amount (NGN)"],
      ...rows.map((row) => [row.date, row.type, row.description, row.account, row.category, row.amount]),
    ].map((row) => row.map(csvCell).join(",")).join("\r\n");
    downloadBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), exportFilename(filter, "csv"));
    toast.success("CSV exported");
  };

  const exportPDF = () => {
    if (transactions.length === 0) return toast.error("There are no transactions to export");
    downloadBlob(createTransactionsPDF(transactions, filter), exportFilename(filter, "pdf"));
    toast.success("PDF exported");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-secondary sm:gap-2 sm:px-4 sm:text-sm">
          <Download className="h-4 w-4" /> Export <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onSelect={exportCSV} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" /> Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportPDF} className="gap-2">
          <FileText className="h-4 w-4" /> Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function toExportRow(transaction: any) {
  return {
    date: transaction.occurred_on ?? "",
    type: String(transaction.type ?? "").replace("_", " "),
    description: transaction.description || transaction.categories?.name || "-",
    account: transaction.accounts?.name || "-",
    category: transaction.categories?.name || "-",
    amount: `${transaction.type === "income" || transaction.type === "transfer_in" ? "" : "-"}${Number(transaction.amount ?? 0).toFixed(2)}`,
  };
}

function csvCell(value: string) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function exportFilename(filter: string, extension: "csv" | "pdf") {
  const suffix = filter === "all" ? "" : `-${filter}`;
  return `pocketstead-transactions${suffix}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function createTransactionsPDF(transactions: any[], filter: string) {
  const rows = transactions.map(toExportRow);
  const pageRows = 42;
  const pages = Array.from({ length: Math.ceil(rows.length / pageRows) }, (_, index) => rows.slice(index * pageRows, (index + 1) * pageRows));
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  pages.forEach((page, index) => {
    const pageNumber = index + 1;
    const lines = [
      "Pocketstead Transactions",
      `Filter: ${filter} | Exported: ${new Date().toLocaleDateString()} | Page ${pageNumber} of ${pages.length}`,
      "",
      "Date       Type          Description                  Account              Category             Amount (NGN)",
      "----------------------------------------------------------------------------------------------------------",
      ...page.map((row) => [
        pdfColumn(row.date, 10),
        pdfColumn(row.type, 13),
        pdfColumn(row.description, 28),
        pdfColumn(row.account, 20),
        pdfColumn(row.category, 20),
        row.amount,
      ].join(" ")),
    ];
    const stream = `BT\n/F1 9 Tf\n12 TL\n36 806 Td\n${lines.map((line) => `(${pdfText(line)}) Tj T*`).join("\n")}\nET`;
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function pdfColumn(value: string, length: number) {
  const clean = asciiText(value);
  return clean.length > length ? `${clean.slice(0, length - 1)}~` : clean.padEnd(length);
}

function pdfText(value: string) {
  return asciiText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function asciiText(value: string) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "");
}

function TransferDialog({ onClose, accounts, transactions, transfer }: { onClose: () => void; accounts: any[]; transactions: any[]; transfer?: any }) {
  const qc = useQueryClient();
  const pair = transfer?.transfer_id
    ? transactions.find((candidate) => candidate.transfer_id === transfer.transfer_id && candidate.id !== transfer.id)
    : undefined;
  const outgoing = transfer?.type === "transfer_out" ? transfer : pair?.type === "transfer_out" ? pair : undefined;
  const incoming = transfer?.type === "transfer_in" ? transfer : pair?.type === "transfer_in" ? pair : undefined;
  const [from, setFrom] = useState(outgoing?.account_id ?? accounts[0]?.id ?? "");
  const [to, setTo] = useState(incoming?.account_id ?? accounts[1]?.id ?? "");
  const [amount, setAmount] = useState(transfer ? String(transfer.amount) : "");
  const [description, setDescription] = useState(transfer?.description ?? "");
  const [occurred_on, setDate] = useState(transfer?.occurred_on ?? new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accounts.length < 2) return toast.error("Add at least two accounts first");
    if (from === to) return toast.error("Choose two different accounts");
    setSaving(true);
    const args = {
        p_from_account_id: from,
        p_to_account_id: to,
        p_amount: Number(amount),
        p_description: description || null,
        p_occurred_on: occurred_on,
      };
    const { error } = transfer
      ? await supabase.rpc("update_transfer", { p_transaction_id: transfer.id, ...args })
      : await supabase.rpc("transfer_funds", args);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(transfer ? "Transfer updated" : "Transfer completed"); qc.invalidateQueries(); onClose(); }
  };

  return (
    <Modal onClose={onClose} title={transfer ? "Edit transfer" : "Transfer funds"}>
      {accounts.length < 2 ? (
        <p className="text-sm text-muted-foreground">Add at least two accounts before making a transfer.</p>
      ) : (
        <form onSubmit={save} className="space-y-3">
          <Field label="From account">
            <select required value={from} onChange={(e) => setFrom(e.target.value)} className="finlo-input">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatNGN(a.balance)})</option>)}
            </select>
          </Field>
          <Field label="To account">
            <select required value={to} onChange={(e) => setTo(e.target.value)} className="finlo-input">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Amount (₦)"><input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="finlo-input" /></Field>
          <Field label="Description"><input value={description} onChange={(e) => setDescription(e.target.value)} className="finlo-input" placeholder="optional" /></Field>
          <Field label="Date"><input required type="date" value={occurred_on} onChange={(e) => setDate(e.target.value)} className="finlo-input" /></Field>
          <ModalActions onClose={onClose} saving={saving} label={transfer ? "Save" : "Transfer"} />
        </form>
      )}
    </Modal>
  );
}

function TxDialog({ onClose, accounts, categories, savingsGoals, transaction }: { onClose: () => void; accounts: any[]; categories: any[]; savingsGoals: any[]; transaction?: any }) {
  const qc = useQueryClient();
  const [type, setType] = useState<"income" | "expense">(transaction?.type ?? "expense");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [account_id, setAccount] = useState(transaction?.account_id ?? accounts[0]?.id ?? "");
  const [category_id, setCategory] = useState(transaction?.category_id ?? "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [occurred_on, setDate] = useState(transaction?.occurred_on ?? new Date().toISOString().slice(0, 10));
  const [savingsSource, setSavingsSource] = useState(transaction?.savings_goal_id ?? "");
  const [saving, setSaving] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [createdCategories, setCreatedCategories] = useState<any[]>([]);

  const filteredCats = [...categories, ...createdCategories].filter((c) => c.kind === type);
  const selectedAccount = accounts.find((account) => account.id === account_id);
  const accountSavingsGoals = savingsGoals.filter((goal) => goal.account_id === account_id && Number(goal.saved_amount) > 0);
  const allocatedInAccount = accountSavingsGoals.reduce((sum, goal) => sum + Number(goal.saved_amount), 0);
  const unallocatedInAccount = Math.max(0, Number(selectedAccount?.balance ?? 0) - allocatedInAccount);
  const showSavingsSource = type === "expense" && selectedAccount?.type === "savings" && accountSavingsGoals.length > 0;
  const selectedSavingsGoalId = showSavingsSource && savingsSource !== "__unallocated__" ? savingsSource : null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account_id) return toast.error("Add an account first");
    if (showSavingsSource && !savingsSource) {
      return toast.error("Choose where this savings spend should come from");
    }
    setSaving(true);
    const amt = Number(amount);
    let error;
    if (transaction) {
      ({ error } = await supabase.rpc("update_transaction", {
        p_transaction_id: transaction.id, p_account_id: account_id, p_category_id: category_id || null,
        p_amount: amt, p_type: type, p_description: description, p_occurred_on: occurred_on,
        p_savings_goal_id: selectedSavingsGoalId,
      }));
    } else {
      ({ error } = await supabase.rpc("create_transaction", {
        p_account_id: account_id,
        p_category_id: category_id || null,
        p_amount: amt,
        p_type: type,
        p_description: description,
        p_occurred_on: occurred_on,
        p_savings_goal_id: selectedSavingsGoalId,
      }));
    }
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(transaction ? "Updated" : "Added"); qc.invalidateQueries(); onClose(); }
  };

  return (
    <Modal onClose={onClose} title={transaction ? "Edit transaction" : "New transaction"}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button key={t} type="button" onClick={() => { setType(t); setCategory(""); setSavingsSource(""); }} className={`rounded-lg border px-3 py-2 text-sm capitalize font-medium ${type === t ? "bg-primary text-primary-foreground border-primary" : "border-border bg-surface"}`}>{t}</button>
          ))}
        </div>
        <Field label="Amount (₦)"><input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="finlo-input" /></Field>
        <Field label="Account">
          <select required value={account_id} onChange={(e) => { setAccount(e.target.value); setSavingsSource(""); }} className="finlo-input">
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        {showSavingsSource && (
          <Field label="Savings source">
            <select required value={savingsSource} onChange={(e) => setSavingsSource(e.target.value)} className="finlo-input">
              <option value="">Choose where to debit this spend</option>
              {unallocatedInAccount > 0 && <option value="__unallocated__">Unallocated savings ({formatNGN(unallocatedInAccount)})</option>}
              {accountSavingsGoals.map((goal) => (
                <option key={goal.id} value={goal.id}>{goal.name} ({formatNGN(goal.saved_amount)})</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">This account has allocated money. Choose whether to debit unallocated savings or one of the pots.</p>
          </Field>
        )}
        <Field label="Category">
          <select value={category_id} onChange={(e) => {
            if (e.target.value === "__add_category__") setCategoryOpen(true);
            else setCategory(e.target.value);
          }} className="finlo-input">
            <option value="">None</option>
            {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="__add_category__">+ Add category...</option>
          </select>
        </Field>
        <Field label="Description"><input value={description} onChange={(e) => setDescription(e.target.value)} className="finlo-input" placeholder="optional" /></Field>
        <Field label="Date"><input type="date" value={occurred_on} onChange={(e) => setDate(e.target.value)} className="finlo-input" /></Field>
        <ModalActions onClose={onClose} saving={saving} />
      </form>
      {categoryOpen && <QuickCategoryDialog
        kind={type}
        onClose={() => setCategoryOpen(false)}
        onCreated={(category) => {
          setCreatedCategories((current) => [...current, category]);
          setCategory(category.id);
          setCategoryOpen(false);
        }}
      />}
    </Modal>
  );
}

function QuickCategoryDialog({ kind, onClose, onCreated }: {
  kind: "income" | "expense";
  onClose: () => void;
  onCreated: (category: any) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { data, error } = await supabase
      .from("categories")
      .insert({ user_id: user.id, name, kind, color })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Category added");
    qc.invalidateQueries({ queryKey: ["categories"] });
    onCreated(data);
  };

  return (
    <Modal onClose={onClose} title={`New ${kind} category`}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Name"><input required autoFocus value={name} onChange={(e) => setName(e.target.value)} className="finlo-input" /></Field>
        <Field label="Color">
          <input aria-label="Category color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-10 cursor-pointer rounded border border-border bg-surface p-1" />
        </Field>
        <ModalActions onClose={onClose} saving={saving} label="Add category" />
      </form>
    </Modal>
  );
}
