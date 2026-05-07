import { buildAdminWorkspaceLinks } from "../AdminStickySidebarLayout";

describe("buildAdminWorkspaceLinks", () => {
  test("omits admin-only links for teachers", () => {
    const links = buildAdminWorkspaceLinks(jest.fn(), "review", {
      role: "teacher",
    });

    expect(links.map((item) => item.key)).toEqual([
      "review",
      "writing",
      "reading",
      "listening",
      "cambridge",
    ]);
  });

  test("includes admin-only links for admins", () => {
    const links = buildAdminWorkspaceLinks(jest.fn(), "permissions", {
      role: "admin",
    });

    expect(links.map((item) => item.key)).toEqual([
      "review",
      "writing",
      "reading",
      "listening",
      "cambridge",
      "permissions",
      "users",
    ]);
  });

  test("omits admin-only links in the review workspace group for admins", () => {
    const links = buildAdminWorkspaceLinks(
      jest.fn(),
      "writing",
      { role: "admin" },
      "review"
    );

    expect(links.map((item) => item.key)).toEqual([
      "review",
      "writing",
      "reading",
      "listening",
      "cambridge",
    ]);
  });
});