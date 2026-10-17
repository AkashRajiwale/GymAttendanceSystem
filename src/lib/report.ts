// Builds and shares the daily attendance report (browser only).
import type { Attendance } from "./db";
import { GYM_NAME } from "./brand";
import { durationMinutes, fmtDate, fmtDuration, fmtTime } from "./time";

export async function buildReportPdf(date: string, records: Attendance[]) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(GYM_NAME, 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`Attendance - ${fmtDate(date)}   |   Total: ${records.length}`, 14, 26);

  // The built-in PDF font is Latin-1 only, so swap the UI's em dash for a hyphen.
  const plain = (s: string) => s.replace(/—/g, "-");
  autoTable(doc, {
    startY: 32,
    head: [["#", "Name", "Phone", "In", "Out", "Duration"]],
    body: records.map((r, i) => [
      i + 1,
      r.name,
      r.phone,
      plain(fmtTime(r.inTime)),
      plain(fmtTime(r.outTime)),
      plain(fmtDuration(durationMinutes(r.inTime, r.outTime))),
    ]),
    headStyles: { fillColor: [20, 24, 22], textColor: [184, 245, 61] },
    alternateRowStyles: { fillColor: [244, 246, 245] },
    styles: { fontSize: 10 },
  });

  const blob = doc.output("blob");
  return new File([blob], `attendance-${date}.pdf`, { type: "application/pdf" });
}

export function reportText(date: string, records: Attendance[]) {
  const lines = records.map(
    (r, i) => `${i + 1}. ${r.name} — ${fmtTime(r.inTime)} to ${r.outTime ? fmtTime(r.outTime) : "—"}`,
  );
  return `*${GYM_NAME} — Attendance ${fmtDate(date)}*\nTotal: ${records.length}\n\n${lines.join("\n")}`;
}

export function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Opens the phone's share sheet with the PDF so the admin can pick the
 * WhatsApp group. Falls back to downloading where file sharing isn't supported.
 */
export async function sharePdf(file: File, text: string) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name, text });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
    }
  }
  download(file);
  return "downloaded";
}

export function whatsappLink(text: string, phone?: string) {
  return `https://wa.me/${phone ? `91${phone}` : ""}?text=${encodeURIComponent(text)}`;
}
