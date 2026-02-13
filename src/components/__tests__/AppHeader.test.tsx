import { render, screen } from "@testing-library/react";

import AppHeader from "@/components/AppHeader";

describe("AppHeader", () => {
  it("renders the provided title", () => {
    render(<AppHeader title="Petverse" />);

    expect(screen.getByRole("heading", { name: "Petverse" })).toBeInTheDocument();
  });
});
