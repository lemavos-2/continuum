import { useCallback, useEffect, useRef, useState } from "react";
import ApkInstaller, { isInstallerAvailable, type DownloadProgressEvent } from "@/lib/updater/native";
import { updaterConfig } from "@/config/updater";
import { checkForUpdate, dismissVersion, isDismissed, markChecked, shouldCheckNow } from "@/lib/updater/manager";
import type { StableRelease } from "@/lib/updater/github";

export type UpdaterPhase = "idle" | "available" | "downloading" | "installing" | "permission" | "failed";

export function useAppUpdater() {
  const [phase, setPhase] = useState<UpdaterPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [installed, setInstalled] = useState("");
  const [release, setRelease] = useState<StableRelease | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (!isInstallerAvailable()) return;
    const controller = new AbortController();

    (async () => {
      if (!shouldCheckNow()) return;
      markChecked();
      const decision = await checkForUpdate(controller.signal);
      if (controller.signal.aborted) return;
      if (decision.status !== "update") return;
      if (isDismissed(decision.latest)) return;
      setInstalled(decision.installed);
      setRelease(decision.release);
      setPhase("available");
    })();

    return () => {
      controller.abort();
      listenerRef.current?.remove();
      listenerRef.current = null;
    };
  }, []);

  const startUpdate = useCallback(async () => {
    if (!release || !isInstallerAvailable()) return;
    try {
      const { granted } = await ApkInstaller.canRequestInstall();
      if (!granted) {
        setPhase("permission");
        return;
      }

      setProgress(0);
      setPhase("downloading");
      listenerRef.current?.remove();
      listenerRef.current = await ApkInstaller.addListener("apkDownloadProgress", (event: DownloadProgressEvent) => {
        setProgress(Math.max(0, Math.min(100, Math.round(event.percent))));
        if (event.percent >= 100) setPhase("installing");
      });

      await ApkInstaller.downloadAndInstall({
        url: release.apkUrl,
        fileName: updaterConfig.apkAssetName,
        version: release.version.raw,
      });
      setPhase("installing");
    } catch {
      setPhase("failed");
    }
  }, [release]);

  const openSettings = useCallback(async () => {
    try {
      await ApkInstaller.openInstallSettings();
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = useCallback(() => {
    if (release) dismissVersion(release.version.raw);
    listenerRef.current?.remove();
    listenerRef.current = null;
    setPhase("idle");
  }, [release]);

  return {
    open: phase !== "idle",
    phase,
    progress,
    installed,
    latest: release?.version.raw ?? "",
    notes: release?.notes ?? "",
    startUpdate,
    openSettings,
    dismiss,
  };
}
