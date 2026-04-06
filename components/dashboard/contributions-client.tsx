"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CommitteeOption } from "@/lib/dashboard/scope";
import { formatCurrency, formatDate } from "@/lib/format";

export type ContributionRow = {
  id: string;
  donor_full_name: string;
  amount: string;
  date: string;
  payment_method: string;
  employer: string | null;
  occupation: string | null;
};

type Props = {
  initialRows: ContributionRow[];
  committees: CommitteeOption[];
};

export function ContributionsClient({ initialRows, committees }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [committeeId, setCommitteeId] = useState(committees[0]?.id ?? "");
  const [donorFullName, setDonorFullName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = useState("");
  const [employer, setEmployer] = useState("");
  const [occupation, setOccupation] = useState("");

  function resetForm() {
    setCommitteeId(committees[0]?.id ?? "");
    setDonorFullName("");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("");
    setEmployer("");
    setOccupation("");
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!committeeId) {
      setFormError("Select a committee.");
      return;
    }
    const amt = Number.parseFloat(amount);
    if (!Number.isFinite(amt)) {
      setFormError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("contributions").insert({
      committee_id: committeeId,
      donor_full_name: donorFullName.trim(),
      amount: amt,
      date,
      payment_method: paymentMethod.trim(),
      employer: employer.trim() || null,
      occupation: occupation.trim() || null,
    });
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setOpen(false);
    resetForm();
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Contributions
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            All contributions for your committees.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={committees.length === 0}
          className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add contribution
        </button>
      </div>

      {committees.length === 0 ? (
        <p className="text-sm text-neutral-500 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center">
          Add a candidate and committee before recording contributions.
        </p>
      ) : null}

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
                <th className="px-4 py-3 font-medium">Donor</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Employer</th>
                <th className="px-4 py-3 font-medium">Occupation</th>
              </tr>
            </thead>
            <tbody>
              {initialRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-neutral-500"
                  >
                    No contributions yet.
                  </td>
                </tr>
              ) : (
                initialRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-neutral-100 dark:border-neutral-800/80"
                  >
                    <td className="px-4 py-2.5 text-neutral-900 dark:text-neutral-100">
                      {row.donor_full_name}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                      {row.payment_method}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                      {row.employer ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                      {row.occupation ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="presentation"
          onClick={() => {
            setOpen(false);
            resetForm();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contrib-modal-title"
            className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="contrib-modal-title"
              className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
            >
              Add contribution
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {formError ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {formError}
                </p>
              ) : null}
              <div>
                <label className="text-sm font-medium block mb-1">Committee</label>
                <select
                  required
                  value={committeeId}
                  onChange={(e) => setCommitteeId(e.target.value)}
                  className={inputClass}
                >
                  {committees.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Donor full name
                </label>
                <input
                  required
                  value={donorFullName}
                  onChange={(e) => setDonorFullName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Amount</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Date</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Payment method
                </label>
                <input
                  required
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="e.g. check, card"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Employer</label>
                <input
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Occupation</label>
                <input
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
