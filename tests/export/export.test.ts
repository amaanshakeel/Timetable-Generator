import { it, expect } from "vitest";
import { fixture } from "../fixture";
import {
  buildExportModel,
  createWorkbook,
  pdfDefinition,
} from "../../src/export/exports";
it("splits long wrapped cells into printable continuation rows without losing text", async () => {
  const p = fixture();
  const note = "Long-Unbroken-Notes-".repeat(140);
  p.sessions[0].note = note;
  const wb = await createWorkbook(buildExportModel(p, "university", {}));
  const ws = wb.getWorksheet("Mon")!;
  const cells: string[] = [];
  ws.eachRow((row, n) => {
    if (n > 4) {
      expect(row.height || 0).toBeLessThanOrEqual(409);
      cells.push(String(row.getCell(2).value || ""));
    }
  });
  expect(ws.rowCount).toBeGreaterThan(6);
  expect(cells.join("").replaceAll("\n", "")).toContain(note);
});
it("keeps separate rooms separate even when display names match", async () => {
  const p = fixture();
  p.rooms[1].name = p.rooms[0].name;
  const wb = await createWorkbook(buildExportModel(p, "university", {}));
  expect(wb.getWorksheet("Mon")?.getCell("B6").value).toBe("");
});
it("exports filtered shared classes once with all labels and optional notes", () => {
  const p = fixture();
  const model = buildExportModel(p, "filtered", {
    departmentId: "cs",
    semester: 1,
  });
  expect(model.sessions).toHaveLength(2);
  expect(model.rows[0].groups).toContain("SE");
  expect(model.rows[0].note).toBe("2-hour lab");
  expect(model.rows[1].note).toBe("");
  expect(p.sessions).toHaveLength(2);
});
it("round trips literal spreadsheet text and includes structured classes and issues", async () => {
  const p = fixture();
  p.sessions[0].note = '=HYPERLINK("unsafe")';
  const wb = await createWorkbook(buildExportModel(p, "university", {}));
  expect(wb.getWorksheet("Classes")?.getCell("H2").value).toBe(
    '=HYPERLINK("unsafe")',
  );
  expect(wb.getWorksheet("Issues")).toBeTruthy();
  const bytes = await wb.xlsx.writeBuffer();
  expect(bytes.byteLength).toBeGreaterThan(1000);
});
it("uses vector table text with repeat headers and does not omit long notes", () => {
  const p = fixture();
  p.sessions[0].note = "Long note ".repeat(100);
  const definition = pdfDefinition(buildExportModel(p, "university", {}));
  const text = JSON.stringify(definition);
  expect(text).toContain("Long note");
  expect(text).toContain("headerRows");
  expect(text).toContain("SE");
  expect(text).not.toContain("screenshot");
});
