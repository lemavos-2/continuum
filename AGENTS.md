# Architecture rules

- Route all transient notifications through Sonner and the shared notification content helper; the legacy toast hook remains a compatibility adapter to keep existing callers on one presentation system.