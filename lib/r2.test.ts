import { beforeAll, describe, expect, it } from "vitest";
import { avatarPublicUrl, getPresignedUrl, getUploadUrl, ownedAvatarKey } from "./r2";

beforeAll(() => {
  process.env.R2_ACCOUNT_ID = "0123456789abcdef0123456789abcdef";
  process.env.R2_ACCESS_KEY_ID = "test-access-key";
  process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
  process.env.R2_NOTES_BUCKET = "private-notes";
  process.env.R2_AVATARS_BUCKET = "public-avatars";
  process.env.R2_AVATARS_PUBLIC_URL = "https://avatars.example.com/";
});

describe("R2 URLs", () => {
  it("signs a browser PUT for one private PDF key", async () => {
    const url = new URL(await getUploadUrl("notes", "notes/user/document.pdf", "application/pdf"));
    expect(url.host).toBe("0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com");
    expect(url.pathname).toBe("/private-notes/notes/user/document.pdf");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(url.searchParams.get("X-Amz-Signature")).toBeTruthy();
  });

  it("signs a temporary private read", async () => {
    const url = new URL(await getPresignedUrl("notes/user/document.pdf"));
    expect(url.pathname).toBe("/private-notes/notes/user/document.pdf");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("3600");
  });

  it("only recognizes this user's public avatar URLs", () => {
    const key = "avatars/user/file.png";
    expect(avatarPublicUrl(key)).toBe("https://avatars.example.com/" + key);
    expect(ownedAvatarKey("https://avatars.example.com/" + key, "user")).toBe(key);
    expect(ownedAvatarKey("https://avatars.example.com/avatars/other/file.png", "user")).toBeNull();
  });
});
