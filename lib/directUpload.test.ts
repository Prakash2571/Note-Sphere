import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadDirect } from "./directUpload";

afterEach(() => vi.unstubAllGlobals());

describe("direct upload", () => {
  it("sends only metadata to the app and file bytes directly to R2", async () => {
    const uploadUrl = "https://example.r2.cloudflarestorage.com/bucket/note.pdf?signature=test";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ key: "notes/u/note.pdf", uploadUrl }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["%PDF-1.7"], "note.pdf", { type: "application/pdf" });
    expect(await uploadDirect(file, "/api/notes/upload-url")).toBe("notes/u/note.pdf");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/notes/upload-url");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      size: file.size,
      type: "application/pdf",
    });
    expect(fetchMock.mock.calls[1][0]).toBe(uploadUrl);
    expect(fetchMock.mock.calls[1][1].body).toBe(file);
  });
});
