import assert from "node:assert/strict";
import test from "node:test";
import { orderPdfDownloadFilename, orderPdfFilename } from "./order-pdf-filename";

test("PDF filenames contain the branch and Istanbul date, preserving midnight boundaries", () => {
  const name = orderPdfFilename("İCEBERRY TOROS ŞUBESİ", new Date("2026-11-23T22:05:06Z"), "1234-abcd");
  assert.equal(name, "Iceberry-Siparis-ICEBERRY-TOROS-SUBESI-20261124-010506-1234abcd.pdf");
});
test("repeated exports of the same branch in the same instant get different names", () => {
  const date = new Date("2026-11-24T10:00:00Z");
  assert.notEqual(orderPdfFilename("Toros", date), orderPdfFilename("Toros", date));
});
test("filenames remove unsafe characters and limit long branch names", () => {
  const name = orderPdfFilename('../../Şube: "adı"\r\n'.repeat(50));
  assert.match(name, /^Iceberry-Siparis-[a-zA-Z0-9-]+\.pdf$/);
  assert.ok(name.length <= 200);
});
test("the browser uses the server filename, with a unique safe fallback", () => {
  const filename = orderPdfFilename("Toros");
  assert.equal(orderPdfDownloadFilename(new Headers({ "X-Iceberry-Pdf-Filename": filename })), filename);
  for (const supplied of ["../../old.pdf", "Iceberry-Siparis-Onizleme.pdf.exe", ""]) {
    const headers = new Headers({ "X-Iceberry-Pdf-Filename": supplied });
    const first = orderPdfDownloadFilename(headers);
    assert.match(first, /^Iceberry-Siparis-Onizleme-/);
    assert.notEqual(first, orderPdfDownloadFilename(headers));
  }
});
