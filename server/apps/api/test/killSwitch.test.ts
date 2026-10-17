import { describe, it, expect, vi } from "vitest";
import { requireKillSwitchDisengaged } from "../src/middleware/killSwitchGuard";
import { KillSwitchState } from "../src/db/models";

describe("Kill Switch Enforcement Middleware", () => {
  it("should permit request to proceed when kill switch is NOT engaged", async () => {
    vi.spyOn(KillSwitchState, "findOne").mockResolvedValueOnce({
      isEngaged: false,
    } as any);

    const req: any = { user: { id: "user-123" } };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await requireKillSwitchDisengaged(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should BLOCK trade approval with 403 when kill switch IS engaged", async () => {
    const engagedAt = new Date();
    vi.spyOn(KillSwitchState, "findOne").mockResolvedValueOnce({
      isEngaged: true,
      engagedAt,
    } as any);

    const req: any = { user: { id: "user-123" } };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await requireKillSwitchDisengaged(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Kill switch is currently ENGAGED"),
        engagedAt,
      })
    );
  });
});
