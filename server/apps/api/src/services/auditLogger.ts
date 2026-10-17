import mongoose, { Types } from "mongoose";
import { AuditLog } from "../db/models";

export interface LogEventParams {
  userId?: string | Types.ObjectId;
  eventType: string;
  entityType: string;
  entityId?: string;
  payload: Record<string, any>;
}

/**
 * Appends an immutable event to the system audit log.
 */
export async function logAuditEvent(params: LogEventParams): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    return; // Standalone / offline mode
  }

  try {
    await AuditLog.create({
      userId: params.userId && Types.ObjectId.isValid(params.userId.toString())
        ? new Types.ObjectId(params.userId.toString())
        : undefined,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      payload: params.payload,
    });
  } catch (error) {
    console.error("[AuditLogger] Failed to write audit event:", error);
  }
}

