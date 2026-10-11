import { afterEach, expect, it, vi } from "vitest";
import { getCachedPdf, putCachedPdf } from "./pdfCache";

afterEach(() => vi.unstubAllGlobals());

it("does not read or write an empty cache key used by public share pages", async () => {
  const open = vi.fn(() => { throw new Error("Storage should not be accessed"); });
  vi.stubGlobal("indexedDB", { open });

  expect(await getCachedPdf("")).toBeNull();
  await putCachedPdf("", new ArrayBuffer(8));

  expect(open).not.toHaveBeenCalled();
});
