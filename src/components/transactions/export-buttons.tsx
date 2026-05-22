"use client";

import { Download, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import type { TimelineEvent } from "@/lib/types/domain";
import { transactionTypeLabels } from "@/lib/types/domain";

export function ExportButtons({ transactions }: { transactions: TimelineEvent[] }) {
  function exportCsv() {
    const header = [
      "date",
      "title",
      "type",
      "currency",
      "original_amount",
      "usd_snapshot",
      "notes",
      "tags"
    ];
    const rows = transactions.map((transaction) => [
      transaction.date,
      transaction.title,
      transactionTypeLabels[transaction.type],
      transaction.currency,
      transaction.original_amount,
      transaction.converted_amount_usd ?? "",
      transaction.description ?? "",
      transaction.tags.map((tag) => tag.name).join("|")
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    downloadFile("ironglass-credit-transactions.csv", csv, "text/csv;charset=utf-8");
    toast.success("CSV exported.");
  }

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 42;
    let y = 54;

    doc.setTextColor("#111111");
    doc.setFontSize(18);
    doc.text("IronGlass Credit Report", margin, y);
    y += 28;
    doc.setFontSize(10);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, margin, y);
    y += 28;

    transactions.slice(0, 34).forEach((transaction) => {
      if (y > 760) {
        doc.addPage();
        y = 54;
      }

      doc.setFontSize(11);
      doc.text(`${formatDate(transaction.date)}  ${transaction.title}`, margin, y);
      y += 15;
      doc.setFontSize(9);
      doc.text(
        `${transactionTypeLabels[transaction.type]} | ${formatCurrency(
          Number(transaction.original_amount),
          transaction.currency
        )} | ${transaction.tags.map((tag) => tag.name).join(", ") || "No tags"}`,
        margin,
        y
      );
      y += 20;
    });

    doc.save("ironglass-credit-report.pdf");
    toast.success("PDF exported.");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        icon={<Download size={16} />}
        onClick={exportCsv}
      >
        CSV
      </Button>
      <Button
        type="button"
        variant="secondary"
        icon={<FileText size={16} />}
        onClick={exportPdf}
      >
        PDF
      </Button>
    </div>
  );
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
