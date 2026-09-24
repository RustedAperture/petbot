import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { UserDistributionChart } from "@/components/stats/user-distribution-chart";

afterEach(cleanup);

it("shows exact performed and received counts with shares of each total", () => {
  render(
    <UserDistributionChart
      totalsByAction={{
        pet: {
          totalHasPerformed: 9_000,
          totalHasReceived: 9,
          totalUsers: 10,
          imageUrl: "",
        },
        bite: {
          totalHasPerformed: 999,
          totalHasReceived: 1,
          totalUsers: 5,
          imageUrl: "",
        },
        hug: {
          totalHasPerformed: 1,
          totalHasReceived: 0,
          totalUsers: 1,
          imageUrl: "",
        },
        bonk: {
          totalHasPerformed: 0,
          totalHasReceived: 0,
          totalUsers: 0,
          imageUrl: "",
        },
      }}
    />,
  );

  const totals = screen.getByRole("table", { name: "Action totals" });
  const pet = within(totals).getByText("Pet").closest("tr");
  const bite = within(totals).getByText("Bite").closest("tr");
  const hug = within(totals).getByText("Hug").closest("tr");

  expect(within(pet!).getAllByRole("cell")[0]).toHaveTextContent("9,000");
  expect(within(pet!).getAllByRole("cell")[0]).toHaveTextContent("90%");
  expect(within(pet!).getAllByRole("cell")[1]).toHaveTextContent("9");
  expect(within(pet!).getAllByRole("cell")[1]).toHaveTextContent("90%");
  expect(within(bite!).getAllByRole("cell")[0]).toHaveTextContent("999");
  expect(within(bite!).getAllByRole("cell")[1]).toHaveTextContent("10%");
  expect(within(hug!).getAllByRole("cell")[0]).toHaveTextContent("<0.1%");
  expect(within(totals).queryByText("Bonk")).not.toBeInTheDocument();
  expect(
    screen.getByText(/bar lengths use a logarithmic scale/i),
  ).toBeInTheDocument();
});

it("shows zero received share when no actions were received", () => {
  render(
    <UserDistributionChart
      totalsByAction={{
        pet: {
          totalHasPerformed: 2,
          totalHasReceived: 0,
          totalUsers: 1,
          imageUrl: "",
        },
      }}
    />,
  );

  const pet = within(screen.getByRole("table", { name: "Action totals" }))
    .getByText("Pet")
    .closest("tr");
  expect(within(pet!).getAllByRole("cell")[1]).toHaveTextContent("0%");
});

it("shows an empty state instead of an empty plot", () => {
  render(
    <UserDistributionChart
      totalsByAction={{
        pet: {
          totalHasPerformed: 0,
          totalHasReceived: 0,
          totalUsers: 0,
          imageUrl: "",
        },
      }}
    />,
  );

  expect(screen.getByText("No interactions recorded yet.")).toBeInTheDocument();
  expect(
    screen.queryByRole("table", { name: "Action totals" }),
  ).not.toBeInTheDocument();
});
