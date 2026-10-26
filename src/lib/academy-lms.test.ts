import assert from "node:assert/strict";
import test from "node:test";

import { academyMediaTypeFromFile, clampProgress, lessonTypeFromMediaType, sourceTypeFromUrl } from "@/lib/academy-lms";

test("academyMediaTypeFromFile supports enterprise LMS formats", () => {
  const cases = [
    [new File([""], "video.mp4", { type: "video/mp4" }), "VIDEO"],
    [new File([""], "sunum.pptx", { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }), "POWERPOINT"],
    [new File([""], "rapor.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "EXCEL"],
    [new File([""], "dokuman.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "WORD"],
    [new File([""], "arsiv.zip", { type: "application/zip" }), "ZIP"],
  ] as const;

  for (const [file, expected] of cases) {
    assert.equal(academyMediaTypeFromFile(file), expected);
  }
});

test("sourceTypeFromUrl accepts YouTube and Vimeo links only", () => {
  assert.equal(sourceTypeFromUrl("https://www.youtube.com/watch?v=abc123"), "YOUTUBE");
  assert.equal(sourceTypeFromUrl("https://youtu.be/abc123"), "YOUTUBE");
  assert.equal(sourceTypeFromUrl("https://vimeo.com/123456"), "VIMEO");
  assert.equal(sourceTypeFromUrl("https://example.com/video"), null);
});

test("lessonTypeFromMediaType maps media to current lesson engine", () => {
  assert.equal(lessonTypeFromMediaType("VIDEO"), "VIDEO");
  assert.equal(lessonTypeFromMediaType("YOUTUBE"), "VIDEO");
  assert.equal(lessonTypeFromMediaType("PDF"), "PDF");
  assert.equal(lessonTypeFromMediaType("IMAGE"), "IMAGE");
  assert.equal(lessonTypeFromMediaType("WORD"), "DOCUMENT");
});

test("clampProgress keeps watch progress in valid range", () => {
  assert.equal(clampProgress(-20), 0);
  assert.equal(clampProgress(42.4), 42);
  assert.equal(clampProgress(101), 100);
  assert.equal(clampProgress(Number.NaN), 0);
});
