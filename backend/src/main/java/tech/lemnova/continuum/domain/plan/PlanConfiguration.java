package tech.lemnova.continuum.domain.plan;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class PlanConfiguration {

    private final Map<PlanType, PlanLimits> limits;

    public PlanConfiguration(
            @Value("${plan.free.max-entities:20}") int freeMaxEntities,
            @Value("${plan.free.max-notes:50}") int freeMaxNotes,
            @Value("${plan.free.max-history-days:30}") int freeMaxHistoryDays,
            @Value("${plan.free.max-metadata-size-kb:10}") int freeMaxMetadataSizeKb,
            @Value("${plan.free.max-vault-size-mb:100}") int freeVaultSizeMB,
            @Value("${plan.free.advanced-metrics:false}") boolean freeAdvancedMetrics,
            @Value("${plan.free.data-export:false}") boolean freeDataExport,
            @Value("${plan.free.calendar-sync:false}") boolean freeCalendarSync,

            @Value("${plan.plus.max-entities:100}") int plusMaxEntities,
            @Value("${plan.plus.max-notes:500}") int plusMaxNotes,
            @Value("${plan.plus.max-history-days:180}") int plusMaxHistoryDays,
            @Value("${plan.plus.max-metadata-size-kb:50}") int plusMaxMetadataSizeKb,
            @Value("${plan.plus.max-vault-size-mb:1024}") int plusVaultSizeMB,
            @Value("${plan.plus.advanced-metrics:true}") boolean plusAdvancedMetrics,
            @Value("${plan.plus.data-export:false}") boolean plusDataExport,
            @Value("${plan.plus.calendar-sync:false}") boolean plusCalendarSync,

            @Value("${plan.pro.max-entities:-1}") int proMaxEntities,
            @Value("${plan.pro.max-notes:-1}") int proMaxNotes,
            @Value("${plan.pro.max-history-days:730}") int proMaxHistoryDays,
            @Value("${plan.pro.max-metadata-size-kb:500}") int proMaxMetadataSizeKb,
            @Value("${plan.pro.max-vault-size-mb:2048}") int proVaultSizeMB,
            @Value("${plan.pro.advanced-metrics:true}") boolean proAdvancedMetrics,
            @Value("${plan.pro.data-export:true}") boolean proDataExport,
            @Value("${plan.pro.calendar-sync:true}") boolean proCalendarSync,

            @Value("${plan.vision.max-entities:-1}") int visionMaxEntities,
            @Value("${plan.vision.max-notes:-1}") int visionMaxNotes,
            @Value("${plan.vision.max-history-days:-1}") int visionMaxHistoryDays,
            @Value("${plan.vision.max-metadata-size-kb:2048}") int visionMaxMetadataSizeKb,
            @Value("${plan.vision.max-vault-size-mb:4096}") int visionVaultSizeMB,
            @Value("${plan.vision.advanced-metrics:true}") boolean visionAdvancedMetrics,
            @Value("${plan.vision.data-export:true}") boolean visionDataExport,
            @Value("${plan.vision.calendar-sync:true}") boolean visionCalendarSync
    ) {
        this.limits = Map.of(
                PlanType.FREE, new PlanLimits(freeMaxEntities, freeMaxNotes, freeMaxHistoryDays, freeMaxMetadataSizeKb, freeVaultSizeMB, freeAdvancedMetrics, freeDataExport, freeCalendarSync),
                PlanType.PLUS, new PlanLimits(plusMaxEntities, plusMaxNotes, plusMaxHistoryDays, plusMaxMetadataSizeKb, plusVaultSizeMB, plusAdvancedMetrics, plusDataExport, plusCalendarSync),
                PlanType.PRO, new PlanLimits(proMaxEntities, proMaxNotes, proMaxHistoryDays, proMaxMetadataSizeKb, proVaultSizeMB, proAdvancedMetrics, proDataExport, proCalendarSync),
                PlanType.VISION, new PlanLimits(visionMaxEntities, visionMaxNotes, visionMaxHistoryDays, visionMaxMetadataSizeKb, visionVaultSizeMB, visionAdvancedMetrics, visionDataExport, visionCalendarSync)
        );
    }

    public PlanLimits getLimits(PlanType plan) {
        return limits.getOrDefault(plan, limits.get(PlanType.FREE));
    }

    public boolean canCreateEntity(PlanType plan, long currentCount) {
        int max = getLimits(plan).maxEntities();
        return max == Integer.MAX_VALUE || currentCount < max;
    }

    public boolean canCreateNote(PlanType plan, long currentCount) {
        int max = getLimits(plan).maxNotes();
        return max == Integer.MAX_VALUE || currentCount < max;
    }

    public boolean canAccessAdvancedMetrics(PlanType plan) {
        return getLimits(plan).advancedMetrics();
    }

    public boolean canExportData(PlanType plan) {
        return getLimits(plan).dataExport();
    }

    public boolean canSyncCalendar(PlanType plan) {
        return getLimits(plan).calendarSync();
    }

    public int getHistoryDays(PlanType plan) {
        return getLimits(plan).maxHistoryDays();
    }
}
