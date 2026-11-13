import { selectSessions } from "../domain/editing";
import { findIssues, groupLabel } from "../domain/issues";
import type { Project, TimetableFilter } from "../domain/types";
import type {
  TDocumentDefinitions,
  Content,
  TableCell,
} from "pdfmake/interfaces";
export function buildExportModel(
  project: Project,
  scope: "filtered" | "university",
  filter: TimetableFilter,
) {
  const sessions = selectSessions(project, scope === "filtered" ? filter : {});
  return {
    project,
    sessions,
    scope,
    rows: sessions.map((s) => {
      const g = project.teachingGroups.find((g) => g.id === s.teachingGroupId)!,
        subject = project.subjects.find((sub) => sub.id === g.subjectId)!,
        slot = project.settings.slots.find((t) => t.id === s.slotId)!;
      return {
        day: s.dayId,
        roomId: s.roomId,
        slotId: s.slotId,
        slot: `${slot.start} – ${slot.end}`,
        room: project.rooms.find((r) => r.id === s.roomId)?.name || "",
        code: subject.code,
        subject: subject.name,
        groups: groupLabel(project, g.id),
        teacher: project.teachers.find((t) => t.id === s.teacherId)?.name || "",
        note: s.note,
        locked: s.locked,
        id: s.id,
      };
    }),
    issues: findIssues(project).filter(
      (i) =>
        !i.sessionIds.length ||
        i.sessionIds.some((id) => sessions.some((s) => s.id === id)),
    ),
  };
}
type ExportModel = ReturnType<typeof buildExportModel>;
export function pdfDefinition(
  model: ExportModel,
  logo?: string,
): TDocumentDefinitions {
  const { project: p } = model;
  const content: Content[] = [];
  const warningIds = new Set(model.issues.flatMap((i) => i.sessionIds));
  const chunks = [];
  for (let i = 0; i < p.settings.slots.length; i += 5)
    chunks.push(p.settings.slots.slice(i, i + 5));
  for (const day of p.settings.days)
    for (const [chunkIndex, slots] of chunks.entries()) {
      if (content.length) content.push({ text: "", pageBreak: "before" });
      if (logo)
        content.push({ image: logo, width: 190, margin: [0, 0, 0, 12] });
      content.push(
        {
          text: p.settings.university,
          fontSize: 15,
          bold: true,
          color: "#0C1460",
          margin: [0, 0, 0, 4],
        },
        {
          text: `${p.settings.term} · ${day}${chunks.length > 1 ? ` · Slots ${chunkIndex * 5 + 1}–${chunkIndex * 5 + slots.length}` : ""}`,
          fontSize: 12,
          bold: true,
          margin: [0, 0, 0, 12],
        },
      );
      const header: TableCell[] = [
        {
          text: "ROOM / VENUE",
          bold: true,
          color: "#ffffff",
          fillColor: "#0C1460",
        },
        ...slots.map((s) => ({
          text: `${s.start} – ${s.end}${s.isBreak ? "\nBREAK" : ""}`,
          bold: true,
          color: "#ffffff",
          fillColor: "#0C1460",
        })),
      ];
      const body: TableCell[][] = [
        header,
        ...p.rooms.map(
          (room) =>
            [
              { text: room.name, bold: true, fillColor: "#f2f4f9" },
              ...slots.map((slot) => {
                const rows = model.rows.filter(
                  (r) =>
                    r.day === day &&
                    r.roomId === room.id &&
                    r.slotId === slot.id,
                );
                if (!rows.length)
                  return {
                    text: slot.isBreak ? "Break" : "",
                    fillColor: slot.isBreak ? "#f4f5f8" : "#ffffff",
                  };
                return {
                  fillColor: rows.some((r) => warningIds.has(r.id))
                    ? "#fff0f0"
                    : "#ffffff",
                  stack: rows.flatMap((r, i) => [
                    {
                      text: r.subject,
                      bold: true,
                      margin: [0, i ? 10 : 0, 0, 3],
                    },
                    { text: r.code, fontSize: 8, color: "#5d6477" },
                    { text: r.groups, margin: [0, 3, 0, 4] },
                    { text: r.teacher, bold: true },
                    ...(r.note
                      ? [{ text: r.note, italics: true, margin: [0, 4, 0, 0] }]
                      : []),
                    ...(warningIds.has(r.id)
                      ? [
                          {
                            text: "Warning — see issue summary",
                            fontSize: 8,
                            color: "#a51a23",
                            margin: [0, 4, 0, 0],
                          },
                        ]
                      : []),
                  ]),
                } as TableCell;
              }),
            ] as TableCell[],
        ),
      ];
      content.push({
        table: {
          headerRows: 1,
          widths: [65, ...slots.map(() => "*" as const)],
          body,
        },
        layout: {
          hLineColor: () => "#d4d8e2",
          vLineColor: () => "#d4d8e2",
          paddingLeft: () => 7,
          paddingRight: () => 7,
          paddingTop: () => 9,
          paddingBottom: () => 9,
        },
      });
    }
  if (model.issues.length) {
    content.push(
      {
        text: "Clashes & issues",
        pageBreak: "before",
        fontSize: 15,
        bold: true,
        color: "#0C1460",
        margin: [0, 0, 0, 12],
      },
      {
        text: "Light red cells require review. Notes are display-only; checks use configured slots.",
        fontSize: 9,
        margin: [0, 0, 0, 12],
      },
      ...model.issues.map(
        (i) => ({ text: `• ${i.message}`, margin: [0, 0, 0, 7] }) as Content,
      ),
    );
  }
  if (!content.length) content.push({ text: "No timetable slots configured" });
  return {
    pageSize: "LETTER",
    pageMargins: [28, 30, 28, 38],
    info: {
      title: `${p.settings.university} — ${p.settings.term} timetable`,
      author: p.settings.university,
    },
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
      color: "#202638",
      lineHeight: 1.15,
    },
    content,
    footer: (current, total) => ({
      columns: [
        { text: p.settings.university },
        { text: `${current} / ${total}`, alignment: "right" },
      ],
      fontSize: 8,
      color: "#707789",
      margin: [28, 12, 28, 0],
    }),
  };
}
export async function createWorkbook(model: ExportModel, logo?: string) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = model.project.settings.university;
  wb.created = new Date();
  const navy = "FF0C1460",
    red = "FFFFEEEE";
  for (const day of model.project.settings.days) {
    const ws = wb.addWorksheet(day, {
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: "1:4",
      },
    });
    const slots = model.project.settings.slots;
    const columns = slots.length + 1;
    ws.mergeCells(1, 1, 1, columns);
    ws.getCell(1, 1).value = model.project.settings.university;
    ws.getCell(1, 1).font = { size: 18, bold: true, color: { argb: navy } };
    ws.getRow(1).height = 38;
    if (logo) {
      const image = wb.addImage({ base64: logo, extension: "png" });
      ws.addImage(image, {
        tl: { col: 0, row: 0 },
        ext: { width: 180, height: 56 },
      });
      ws.getRow(1).height = 50;
      ws.getCell(1, 1).alignment = { horizontal: "right", vertical: "middle" };
    }
    ws.mergeCells(2, 1, 2, columns);
    ws.getCell(2, 1).value = `${model.project.settings.term} · ${day}`;
    ws.getRow(4).values = [
      "Room / venue",
      ...slots.map(
        (s) => `${s.start} – ${s.end}${s.isBreak ? " · Break" : ""}`,
      ),
    ];
    ws.getRow(4).eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    });
    ws.getRow(4).height = 28;
    ws.columns.forEach((c, i) => (c.width = i ? 35 : 22));
    for (const room of model.project.rooms) {
      const values = [
        room.name,
        ...slots.map(
          (s) =>
            model.rows
              .filter(
                (r) =>
                  r.day === day && r.roomId === room.id && r.slotId === s.id,
              )
              .map(
                (r) =>
                  `${r.subject}\n${r.code}\n${r.groups}\n${r.teacher}${r.note ? `\n${r.note}` : ""}${r.locked ? "\n[Locked]" : ""}`,
              )
              .join("\n\n") || (s.isBreak ? "Break" : ""),
        ),
      ];
      const wrapped = values.map((v, i) => wrapForExcel(v, i === 0 ? 16 : 26));
      const parts = Math.max(
        ...wrapped.map((lines) => Math.ceil(lines.length / 23)),
      );
      for (let part = 0; part < parts; part++) {
        const lines = wrapped.map((text, i) =>
          i === 0 && part > 0
            ? [room.name + " (continued)"]
            : text.slice(part * 23, (part + 1) * 23),
        );
        const row = ws.addRow(lines.map((text) => text.join("\n")));
        row.height = Math.max(
          50,
          Math.max(...lines.map((text) => text.length)) * 16 + 12,
        );
        row.eachCell({ includeEmpty: true }, (c, col) => {
          c.font = { name: "Arial", size: 11 };
          c.alignment = { wrapText: true, vertical: "middle" };
          c.border = {
            top: { style: "thin", color: { argb: "FFD8DCE5" } },
            bottom: { style: "thin", color: { argb: "FFD8DCE5" } },
            left: { style: "thin", color: { argb: "FFD8DCE5" } },
            right: { style: "thin", color: { argb: "FFD8DCE5" } },
          };
          if (col === 1) c.font = { name: "Arial", size: 11, bold: true };
          const slot = slots[col - 2];
          if (
            slot &&
            model.rows.some(
              (r) =>
                r.day === day &&
                r.roomId === room.id &&
                r.slotId === slot.id &&
                model.issues.some((i) => i.sessionIds.includes(r.id)),
            )
          )
            c.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: red },
            };
        });
      }
    }
    ws.views = [{ state: "frozen", xSplit: 1, ySplit: 4 }];
  }
  const classes = wb.addWorksheet("Classes");
  classes.addRow([
    "Day",
    "Time slot",
    "Room",
    "Subject code",
    "Subject",
    "Department-semester groups",
    "Teacher",
    "Note",
    "Locked",
  ]);
  model.rows.forEach((r) =>
    classes.addRow([
      r.day,
      r.slot,
      r.room,
      r.code,
      r.subject,
      r.groups,
      r.teacher,
      r.note,
      r.locked ? "Yes" : "No",
    ]),
  );
  classes.autoFilter = { from: "A1", to: "I1" };
  const issues = wb.addWorksheet("Issues");
  issues.addRow(["Type", "Description", "Affected classes"]);
  model.issues.forEach((i) =>
    issues.addRow([i.kind, i.message, i.sessionIds.join(", ")]),
  );
  for (const ws of [classes, issues]) {
    ws.columns.forEach((c) => (c.width = 28));
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: navy },
    };
    ws.eachRow((r) =>
      r.eachCell((c) => (c.alignment = { wrapText: true, vertical: "top" })),
    );
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }
  return wb;
}
function wrapForExcel(text: string, width: number) {
  const lines: string[] = [];
  for (const explicit of text.split("\n")) {
    let line = "",
      used = 0;
    for (const char of explicit) {
      const weight = /[MW@]/.test(char)
        ? 1.7
        : /[il., :;]/.test(char)
          ? 0.55
          : char.codePointAt(0)! > 0x2e80
            ? 2
            : /[A-Z]/.test(char)
              ? 1.2
              : 1;
      if (used + weight > width && line) {
        lines.push(line);
        line = "";
        used = 0;
      }
      line += char;
      used += weight;
    }
    lines.push(line);
  }
  return lines;
}
export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function loadLogo() {
  const response = await fetch(`${import.meta.env.BASE_URL}brand/UOR.png`);
  if (!response.ok) throw Error("University logo could not be loaded");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
export async function exportFile(
  project: Project,
  format: "pdf" | "xlsx",
  scope: "filtered" | "university",
  filter: TimetableFilter,
) {
  const model = buildExportModel(project, scope, filter),
    logo = await loadLogo();
  const filename = `UOR-${project.settings.term.replace(/[^\p{L}\p{N}-]/gu, "-")}-${scope}.${format}`;
  if (format === "xlsx") {
    const wb = await createWorkbook(model, logo);
    const data = await wb.xlsx.writeBuffer();
    downloadBlob(
      new Blob([new Uint8Array(data)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      filename,
    );
  } else {
    const [{ default: pdfMake }, { default: fonts }] = await Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts"),
    ]);
    const maker = pdfMake as unknown as {
      addVirtualFileSystem: (fonts: unknown) => void;
      createPdf: (definition: TDocumentDefinitions) => {
        getBlob: () => Promise<Blob>;
      };
    };
    maker.addVirtualFileSystem(fonts);
    const blob = await maker.createPdf(pdfDefinition(model, logo)).getBlob();
    downloadBlob(blob, filename);
  }
}
