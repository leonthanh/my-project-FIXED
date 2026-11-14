import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { buildAdminRoutes } from "../../app/routes/adminRoutes";
import { buildPrepareRoutes } from "./routes";

jest.mock("../../shared/components/ProtectedRoute", () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

jest.mock("./pages/PrepareSkillBuilderPage", () => ({
  __esModule: true,
  default: () => <div>Prepare builder</div>,
}));

jest.mock("./pages/PrepareHubPage", () => ({
  __esModule: true,
  default: () => <div>Prepare hub</div>,
}));

jest.mock("./pages/PrepareSkillRuntimePage", () => ({
  __esModule: true,
  default: () => <div>Prepare runtime</div>,
}));

jest.mock("./pages/PrepareSubmissionsPage", () => ({
  __esModule: true,
  default: () => <div>Prepare submissions</div>,
}));

jest.mock("./pages/PrepareSubmissionReviewPage", () => ({
  __esModule: true,
  default: () => <div>Prepare submission review</div>,
}));

jest.mock("./pages/PrepareSubmissionResultPage", () => ({
  __esModule: true,
  default: () => <div>Prepare submission result</div>,
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const renderRoutes = (initialPath) => render(
  <MemoryRouter initialEntries={[initialPath]}>
    <Routes>
      {buildAdminRoutes()}
      {buildPrepareRoutes({ isAuthenticated: true })}
      <Route path="*" element={<LocationProbe />} />
    </Routes>
  </MemoryRouter>
);

test("redirects the retired Level Registry URL to the Prepare test list", async () => {
  renderRoutes("/admin/exam-levels");

  expect(await screen.findByTestId("location")).toHaveTextContent(
    "/select-test?platform=prepare"
  );
});

test("redirects legacy Prepare builder links to the standalone module route", async () => {
  renderRoutes("/admin/exam-levels/prepare/reading-writing/42/edit");

  expect(await screen.findByText("Prepare builder")).toBeInTheDocument();
});

test.each([
  ["/exam-levels/prepare", "Prepare hub"],
  ["/exam-levels/prepare/listening/42", "Prepare runtime"],
  ["/exam-levels/prepare/submissions", "Prepare submissions"],
  ["/exam-levels/prepare/submissions/42", "Prepare submission review"],
  ["/exam-levels/prepare/submission-results/42", "Prepare submission result"],
])("redirects legacy Prepare route %s into the standalone module", async (path, target) => {
  renderRoutes(path);

  expect(await screen.findByText(target)).toBeInTheDocument();
});
