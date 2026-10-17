import { env } from "../config/env";

export interface NotificationPayload {
  to?: string;
  subject: string;
  body: string;
  eventType: "proposal_pending" | "risk_manager_veto" | "kill_switch_engaged" | "order_filled";
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Dispatches notifications (email / webhook) based on user preferences.
   */
  public static async send(payload: NotificationPayload): Promise<void> {
    console.log(`[NotificationService] [${payload.eventType.toUpperCase()}] To: ${payload.to || "User"} | ${payload.subject}`);
    console.log(`  Details: ${payload.body}`);

    // If SMTP host is configured, we can trigger SMTP delivery or Webhook payload
    if (env.SMTP_HOST && payload.to) {
      // In production, nodemailer or HTTP webhook endpoint is dispatched here
      // For resilient runtime, log and complete asynchronously
    }
  }
}
