"use client";

import { useState } from "react";
import { Badge } from "@/components/atoms/Badge";

interface UnsubscribedRow {
  _id: string;
  email: string;
  businessName: string;
  source: string;
  unsubscribedAt: string;
}

function exportCsv(records: UnsubscribedRow[]) {
  const headers = ["email", "businessName", "source", "unsubscribedAt"];
  const rows = records.map((record) =>
    headers
      .map((header) =>
        JSON.stringify(
          (record as unknown as Record<string, unknown>)[header] ?? "",
        ),
      )
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "unsubscribed.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function UnsubscribedTable({
  initialRecords,
}: {
  initialRecords: UnsubscribedRow[];
}) {
  const [records, setRecords] = useState(initialRecords);
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");

  async function addManual() {
    const response = await fetch("/api/unsubscribed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, businessName }),
    });
    const record = await response.json();
    setRecords((current) => [record, ...current]);
    setEmail("");
    setBusinessName("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <label className="text-sm">
          Email
          <input
            className="mt-1 block rounded-md border border-zinc-300 px-3 py-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="text-sm">
          Business name
          <input
            className="mt-1 block rounded-md border border-zinc-300 px-3 py-2"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={addManual}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add to suppression list
        </button>
        <button
          type="button"
          onClick={() => exportCsv(records)}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              {["Email", "Business", "Source", "Date"].map((heading) => (
                <th key={heading} className="px-4 py-3 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record._id} className="border-t border-zinc-100">
                <td className="px-4 py-3">{record.email}</td>
                <td className="px-4 py-3">{record.businessName || "—"}</td>
                <td className="px-4 py-3">
                  <Badge label={record.source} />
                </td>
                <td className="px-4 py-3">
                  {new Date(record.unsubscribedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
