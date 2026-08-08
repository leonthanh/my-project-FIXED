import {
  buildAdminWorkspaceLinks,
  buildReviewWorkspaceNav,
} from "../AdminStickySidebarLayout";

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
      "fce",
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
      "fce",
      "display-settings",
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
      "fce",
    ]);
  });
});

describe("buildReviewWorkspaceNav", () => {
  const createReviewTabs = () => [
    {
      key: "ix",
      shortLabel: "IX",
      label: "IX Review Queue",
      tone: "reading",
      badge: 11,
    },
    {
      key: "writing",
      shortLabel: "Writing",
      label: "Writing Review Queue",
      tone: "writing",
      badge: 5,
    },
    {
      key: "reading",
      shortLabel: "Reading",
      label: "Reading Review Queue",
      tone: "reading",
      badge: 4,
    },
    {
      key: "listening",
      shortLabel: "Listening",
      label: "Listening Review Queue",
      tone: "listening",
      badge: 2,
    },
  ];

  const createArgs = (overrides = {}) => {
    const navigate = jest.fn();
    const setActiveWorkspaceGroup = jest.fn();
    const setActiveTab = jest.fn();
    const navigateToIxSubmissionPage = jest.fn();
    const navigateToPlatformSubmissionPage = jest.fn();

    return {
      args: {
        navigate,
        displayLabels: {
          ixDisplayName: "IX",
          fceDisplayName: "General",
        },
        activeTab: "writing",
        activeWorkspaceGroup: "ix",
        setActiveWorkspaceGroup,
        setActiveTab,
        reviewTabs: createReviewTabs(),
        navigateToIxSubmissionPage,
        navigateToPlatformSubmissionPage,
        orangeSubmissionTypeTabs: [
          { key: "all", shortLabel: "All", label: "All Submissions", tone: "orange" },
          { key: "listening", shortLabel: "Listening", label: "Listening Submissions", tone: "green" },
          { key: "reading", shortLabel: "Reading", label: "Reading Submissions", tone: "violet" },
        ],
        generalSubmissionTypeTabs: [
          { key: "all", shortLabel: "All", label: "All Submissions", tone: "blue" },
          { key: "listening", shortLabel: "Listening", label: "Listening Submissions", tone: "green" },
          { key: "reading", shortLabel: "Reading + Writing", label: "Reading + Writing Submissions", tone: "violet" },
        ],
        activeReviewTabShortLabel: "Writing",
        ...overrides,
      },
      fns: {
        navigate,
        setActiveWorkspaceGroup,
        setActiveTab,
        navigateToIxSubmissionPage,
        navigateToPlatformSubmissionPage,
      },
    };
  };

  test("builds workspace parents, IX child links, and submission tabs for IX mode", () => {
    const { args } = createArgs();
    const nav = buildReviewWorkspaceNav(args);

    expect(nav.ixDisplayName).toBe("IX");
    expect(nav.workspaceParentLinks.map((item) => item.key)).toEqual([
      "workspace-review",
      "workspace-ix",
      "workspace-orange",
      "workspace-general",
    ]);
    expect(nav.workspaceChildLinks.map((item) => item.key)).toEqual([
      "workspace-child-writing",
      "workspace-child-reading",
      "workspace-child-listening",
    ]);
    expect(nav.workspaceChildMeta).toBe("IX");
    expect(nav.workspaceChildAriaLabel).toBe("IX submission types");
    expect(nav.submissionTypeTabs.map((item) => item.key)).toEqual([
      "writing",
      "reading",
      "listening",
    ]);
  });

  test("hides child links and submission tabs in review mode", () => {
    const { args } = createArgs({
      activeTab: "review",
      activeWorkspaceGroup: "review",
      activeReviewTabShortLabel: "Review",
    });
    const nav = buildReviewWorkspaceNav(args);

    expect(nav.workspaceChildLinks).toEqual([]);
    expect(nav.submissionTypeTabs).toEqual([]);
    expect(nav.workspaceChildMeta).toBe("Review");
    expect(nav.workspaceChildAriaLabel).toBe("Submission types");
  });

  test("IX parent click updates state and opens writing submissions page", () => {
    const { args, fns } = createArgs();
    const nav = buildReviewWorkspaceNav(args);

    const ixParent = nav.workspaceParentLinks.find(
      (item) => item.key === "workspace-ix"
    );

    ixParent.onClick();

    expect(fns.setActiveWorkspaceGroup).toHaveBeenCalledWith("ix");
    expect(fns.setActiveTab).toHaveBeenCalledWith("writing");
    expect(fns.navigateToIxSubmissionPage).toHaveBeenCalledWith("writing");
  });

  test("review parent click updates state and navigates to review route", () => {
    const { args, fns } = createArgs();
    const nav = buildReviewWorkspaceNav(args);

    const reviewParent = nav.workspaceParentLinks.find(
      (item) => item.key === "workspace-review"
    );

    reviewParent.onClick();

    expect(fns.setActiveWorkspaceGroup).toHaveBeenCalledWith("review");
    expect(fns.setActiveTab).toHaveBeenCalledWith("review");
    expect(fns.navigate).toHaveBeenCalledWith("/review");
  });

  test("orange and general child links route through platform navigation callback", () => {
    const { args, fns } = createArgs({
      activeWorkspaceGroup: "orange",
      activeTab: "writing",
    });
    const orangeNav = buildReviewWorkspaceNav(args);
    orangeNav.workspaceChildLinks[0].onClick();

    const { args: generalArgs } = createArgs({
      activeWorkspaceGroup: "general",
      activeTab: "reading",
    });
    const generalNav = buildReviewWorkspaceNav(generalArgs);
    generalNav.workspaceChildLinks[0].onClick();

    expect(fns.navigateToPlatformSubmissionPage).toHaveBeenCalledWith("orange", "all");
    expect(generalArgs.navigateToPlatformSubmissionPage).toHaveBeenCalledWith("general", "all");
  });
});