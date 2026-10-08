import type { ReactNode } from "react";

export type NotificationKind = "success" | "error" | "info";
export const NOTIFICATION_DURATION = 5000;

const headings = {
  en: { success: "Completed", error: "Something went wrong", info: "Notification" },
  pt: { success: "Concluído", error: "Algo deu errado", info: "Notificação" },
  es: { success: "Completado", error: "Algo salió mal", info: "Notificación" },
  fr: { success: "Terminé", error: "Une erreur est survenue", info: "Notification" },
};

export function notificationContent(kind: NotificationKind, title?: ReactNode, description?: ReactNode) {
  const language = typeof document === "undefined" ? "en" : document.documentElement.lang.split("-")[0];
  const labels = headings[language as keyof typeof headings] ?? headings.en;
  return description
    ? { title: title || labels[kind], description }
    : { title: labels[kind], description: title || labels[kind] };
}