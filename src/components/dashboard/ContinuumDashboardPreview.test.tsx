import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ContinuumDashboardPreview from "./ContinuumDashboardPreview";

describe("ContinuumDashboardPreview", () => {
  it("renders the welcome header and recent documents", () => {
    render(
      <ContinuumDashboardPreview
        greeting="Good morning"
        displayName="Ada"
        stats={[
          { label: "Notes", value: "24", delta: "+2 this week", trend: "up" as const },
          { label: "Entities", value: "18", delta: "+3", trend: "up" as const },
        ]}
        documents={[
          { title: "Systems Thinking", type: "Concept", connections: 11, updated: "2h ago" },
        ]}
      />,
    );

    expect(screen.getByText(/Good morning, Ada/i)).toBeInTheDocument();
    expect(screen.getByText(/Workspace overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Systems Thinking/i)).toBeInTheDocument();
  });
});
