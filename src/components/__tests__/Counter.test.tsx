import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Counter from "@/components/Counter";

describe("Counter", () => {
  it("renders with the initial count", () => {
    render(<Counter initialCount={2} />);

    expect(screen.getByText("Count: 2")).toBeInTheDocument();
  });

  it("increments the counter when the button is clicked", async () => {
    const user = userEvent.setup();

    render(<Counter />);
    await user.click(screen.getByRole("button", { name: "Increment" }));

    expect(screen.getByText("Count: 1")).toBeInTheDocument();
  });
});
