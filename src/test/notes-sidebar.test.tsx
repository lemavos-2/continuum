import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const fixtures = vi.hoisted(() => ({
  notes: [{ id: "note-1", title: "Project journal", type: "Journal", createdAt: "2026-10-01T12:00:00Z", updatedAt: "2026-10-01T12:00:00Z", favorite: true }],
  types: ["Journal", "Idea"],
}));

vi.mock("@/components/AppLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock("@/hooks/useRequireAuth", () => ({ useRequireAuth: () => ({ loading: false }) }));
vi.mock("@/hooks/usePlanGate", () => ({ usePlanGate: () => ({ getLimitMessage: () => "", refresh: vi.fn(), applyUsageDelta: vi.fn() }) }));
vi.mock("@/hooks/useCreateNote", () => ({ useCreateNote: () => ({ createNote: vi.fn(), creating: false }) }));
vi.mock("@/hooks/useCachedResource", () => ({ useCachedResource: (key: string[]) => ({ data: key.includes("types") ? fixtures.types : fixtures.notes, loading: false, setData: vi.fn(), refetch: vi.fn() }) }));
vi.mock("@/lib/query-client", () => ({ queryClient: { invalidateQueries: vi.fn(), getQueryData: vi.fn() } }));
vi.mock("@/components/InsightSignal", () => ({ InsightSignalBadge: () => null }));
vi.mock("@/components/UpgradeModal", () => ({ default: () => null }));
vi.mock("@/components/import/MarkdownImportDialog", () => ({ default: () => null }));
vi.mock("@/components/ui/confirm-dialog", () => ({ ConfirmDialog: () => null }));
vi.mock("@/components/ui/fit-text", () => ({ FitText: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));

import Notes from "@/pages/Notes";

afterEach(cleanup);

describe("desktop Notes sidebar", () => {
  it("opens and closes only through its toggle, retaining visibility after choosing filters and clicking elsewhere", () => {
    render(<MemoryRouter><Notes /></MemoryRouter>);
    const toggle = screen.getByRole("button", { name: "notes_filters" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    const sidebar = screen.getByRole("complementary", { name: "notes_filters" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(sidebar.querySelector("button") as HTMLButtonElement);
    fireEvent.click(screen.getByRole("heading", { name: "notes_title" }));
    expect(sidebar).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});