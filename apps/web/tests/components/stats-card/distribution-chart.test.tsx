import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DistributionChart } from "@/components/stats/distribution-chart";

afterEach(cleanup);

it("shows actual counts and shares alongside the rings", () => {
  render(
    <DistributionChart
      totalsByAction={{
        pet: {
          totalHasPerformed: 9_000,
          totalUsers: 10,
          imageUrl: "",
        },
        bite: {
          totalHasPerformed: 999,
          totalUsers: 5,
          imageUrl: "",
        },
        hug: {
          totalHasPerformed: 1,
          totalUsers: 1,
          imageUrl: "",
        },
        bonk: {
          totalHasPerformed: 0,
          totalUsers: 0,
          imageUrl: "",
        },
      }}
    />,
  );

  const totals = screen.getByRole("list", { name: "Action totals" });
  const pet = within(totals).getByText("Pet").closest("li");
  const bite = within(totals).getByText("Bite").closest("li");
  const hug = within(totals).getByText("Hug").closest("li");

  expect(pet).toHaveTextContent("9,000");
  expect(pet).toHaveTextContent("90%");
  expect(bite).toHaveTextContent("999");
  expect(bite).toHaveTextContent("10%");
  expect(hug).toHaveTextContent("1");
  expect(hug).toHaveTextContent("<0.1%");
  expect(within(totals).queryByText("Bonk")).not.toBeInTheDocument();
  expect(screen.getByText(/logarithmic scale/i)).toBeInTheDocument();
});
