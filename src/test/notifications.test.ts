import { describe, expect, it } from "vitest";
import { notificationContent, NOTIFICATION_DURATION } from "@/lib/notifications";

describe("shared notification content", () => {
  it("preserves a supplied title and description", () => {
    expect(notificationContent("success", "Marked as done", "H")).toEqual({ title: "Marked as done", description: "H" });
  });
  it("gives title-only messages a heading and description", () => {
    document.documentElement.lang = "pt";
    expect(notificationContent("error", "Falha ao salvar")).toEqual({ title: "Algo deu errado", description: "Falha ao salvar" });
    expect(notificationContent("info", "Sem conexão").title).toBe("Notificação");
    document.documentElement.lang = "en";
  });
  it("uses five seconds", () => {
    expect(NOTIFICATION_DURATION).toBe(5000);
  });
});