import type { FamilyReferralRecord } from "./repository";

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLines(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current.length > 0 ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current.length > 0) {
      lines.push(current);
    }
    current = word;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

function appendSection(target: string[], title: string, lines: string[]) {
  target.push(title);
  target.push(...lines);
  target.push("");
}

function buildReportLines(referral: FamilyReferralRecord) {
  const lines: string[] = [];
  const created = new Date(referral.createdAt).toLocaleString();

  appendSection(lines, "CURA FAMILY REFERRAL SUMMARY", [
    `Referral ID: ${referral.referralId}`,
    `Generated: ${created}`,
  ]);

  appendSection(lines, "CHILD INFORMATION", [
    `Name: ${referral.intake.childName || "Not provided"}`,
    `Age range: ${referral.intake.childAge}`,
    `Gender: ${referral.intake.childGender}`,
  ]);

  appendSection(lines, "RECOMMENDED SPECIALIST", [
    `${referral.decision.specialistType}`,
    referral.decision.specialistDescription,
    `Urgency: ${referral.decision.urgencyLevel.toUpperCase()}`,
  ]);

  appendSection(
    lines,
    "WHY THIS REFERRAL",
    referral.decision.rationale.map((item, index) => `${index + 1}. ${item}`),
  );

  appendSection(
    lines,
    "NEXT STEPS",
    referral.decision.nextSteps.map((item, index) => `${index + 1}. ${item}`),
  );

  appendSection(lines, "DISCLAIMER", [
    "This tool provides referral guidance only.",
    "It does not provide diagnosis, treatment, or emergency care.",
    "If there is immediate danger, call 911.",
    "For mental health crisis support, call or text 988.",
  ]);

  return lines.flatMap((line) => wrapLines(line, 90));
}

export function generateReferralPdf(referral: FamilyReferralRecord) {
  const lines = buildReportLines(referral).slice(0, 52);
  const contentLines = [
    "BT",
    "/F1 11 Tf",
    "54 760 Td",
    "14 TL",
    ...lines.map((line, index) =>
      index === 0 ? `(${escapePdfText(line)}) Tj` : `T* (${escapePdfText(line)}) Tj`,
    ),
    "ET",
  ];
  const stream = `${contentLines.join("\n")}\n`;

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}endstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(output, "utf8"));
    output += object;
  }

  const xrefOffset = Buffer.byteLength(output, "utf8");
  output += `xref\n0 ${objects.length + 1}\n`;
  output += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    output += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(output, "utf8");
}
