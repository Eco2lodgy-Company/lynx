import prisma from "@lynx/prisma";

/**
 * Log an action to the audit trail.
 * This is non-modifiable and used for compliance/legal traceability.
 */
export async function logAudit({
    userId,
    action,
    entity,
    entityId,
    details,
    ipAddress,
}: {
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
}) {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entity,
                entityId,
                details: details ? JSON.stringify(details) : null,
                ipAddress: ipAddress || null,
            },
        });
    } catch (error) {
        // Never let audit logging crash the main flow
        console.error("[AUDIT] Failed to log action:", error);
    }
}

/**
 * Standard action names used across the application.
 */
export const AuditActions = {
    // Daily Logs
    VALIDATE_LOG: "VALIDATE_LOG",
    REJECT_LOG: "REJECT_LOG",
    CREATE_LOG: "CREATE_LOG",
    UPDATE_LOG: "UPDATE_LOG",
    DELETE_LOG: "DELETE_LOG",

    // Incidents
    CREATE_INCIDENT: "CREATE_INCIDENT",
    UPDATE_INCIDENT: "UPDATE_INCIDENT",
    RESOLVE_INCIDENT: "RESOLVE_INCIDENT",

    // Tasks
    CREATE_TASK: "CREATE_TASK",
    UPDATE_TASK: "UPDATE_TASK",
    ASSIGN_TASK: "ASSIGN_TASK",

    // Reports
    CREATE_REPORT: "CREATE_REPORT",
    UPDATE_REPORT: "UPDATE_REPORT",
    PUBLISH_REPORT: "PUBLISH_REPORT",
    DELETE_REPORT: "DELETE_REPORT",

    // Attendance
    VALIDATE_ATTENDANCE: "VALIDATE_ATTENDANCE",
    CORRECT_ATTENDANCE: "CORRECT_ATTENDANCE",

    // Users
    CREATE_USER: "CREATE_USER",
    UPDATE_USER: "UPDATE_USER",
    DEACTIVATE_USER: "DEACTIVATE_USER",

    // Projects
    CREATE_PROJECT: "CREATE_PROJECT",
    UPDATE_PROJECT: "UPDATE_PROJECT",
} as const;
