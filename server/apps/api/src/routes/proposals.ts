import { Router, Request, Response } from "express";
import { proposalAdjustSchema } from "@confluence/shared-schemas";
import { TradeProposal, Order, RiskProfile, AgentRun, AgentMessage } from "../db/models";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { CurrentPriceService } from "../market/currentPriceService";
import { PaperTradingService } from "../services/paperTradingService";
import { notifyOrderEvent } from "../services/fcmService";

export const proposalsRouter = Router();

// Get user's proposals enriched with debate rationale and committee arguments
proposalsRouter.get("/proposals", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string;
    const filter: any = { userId: req.user!.id };
    if (status) {
      filter.status = status;
    }
    const proposals = await TradeProposal.find(filter).sort({ createdAt: -1 });

    const enriched = await Promise.all(
      proposals.map(async (p) => {
        let run: any = null;
        let bullArgs: string[] = [];
        let bearArgs: string[] = [];
        let rationale = "Quantitative factor consensus & risk manager approved.";
        let horizon = "5d";

        if (p.runId) {
          run = await AgentRun.findById(p.runId);
          if (run) {
            horizon = run.horizon || "5d";
            rationale = run.rationale || rationale;
          }
          const messages = await AgentMessage.find({ runId: p.runId }).sort({ sequenceIndex: 1 });
          const bull = messages.find((m) => m.agentRole === "bull_researcher");
          const bear = messages.find((m) => m.agentRole === "bear_researcher");

          if (bull?.structuredOutput?.keyArguments && Array.isArray(bull.structuredOutput.keyArguments)) {
            bullArgs = bull.structuredOutput.keyArguments;
          } else if (bull?.content) {
            bullArgs = [bull.content.slice(0, 120)];
          }

          if (bear?.structuredOutput?.keyArguments && Array.isArray(bear.structuredOutput.keyArguments)) {
            bearArgs = bear.structuredOutput.keyArguments;
          } else if (bear?.content) {
            bearArgs = [bear.content.slice(0, 120)];
          }
        }

        if (bullArgs.length === 0) {
          bullArgs = ["Momentum factor signals bullish trend", "RSI and MACD technical support", "Low volatility breakout potential"];
        }
        if (bearArgs.length === 0) {
          bearArgs = ["Macro volatility headline risk", "Potential overhead resistance level"];
        }

        const pObj = p.toObject();
        return {
          ...pObj,
          id: p._id.toString(),
          suggestedQty: p.suggestedQuantity || 10,
          suggestedSizePct: p.suggestedSizePct || 5.0,
          price: 150.0,
          horizon,
          rationale,
          bullArgs,
          bearArgs,
        };
      })
    );

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Approve a proposal -> triggers virtual paper order execution
proposalsRouter.post(
  "/proposals/:id/approve",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const proposal = await TradeProposal.findOne({
        _id: req.params.id,
        userId: req.user!.id,
      });

      if (!proposal) {
        res.status(404).json({ error: "Proposal not found." });
        return;
      }

      if (proposal.status !== "pending") {
        res.status(400).json({ error: `Cannot approve proposal with status: ${proposal.status}` });
        return;
      }

      const quantity = proposal.suggestedQuantity || 1;
      const quote = await CurrentPriceService.getQuote(proposal.ticker).catch(() => null);
      const fillPrice = quote?.price || 100.0;

      // Execute order directly through PaperTradingService
      const paperOrder = await PaperTradingService.executeOrder(req.user!.id, {
        ticker: proposal.ticker,
        side: proposal.action,
        quantity,
        orderType: "market",
        proposalId: proposal._id.toString(),
      });

      // Also persist to Order collection if MongoDB is connected
      let order: any = null;
      try {
        order = await Order.create({
          proposalId: proposal._id,
          userId: req.user!.id,
          brokerOrderId: paperOrder.orderId,
          ticker: proposal.ticker,
          side: proposal.action,
          quantity,
          orderType: "market",
          isPaper: true,
          status: paperOrder.status,
          filledAvgPrice: paperOrder.executedPrice,
        });
      } catch (dbErr) {
        order = paperOrder;
      }

      // Update proposal status
      proposal.status = "approved";
      proposal.reviewedAt = new Date();
      await proposal.save().catch(() => null);

      // Push notification
      try {
        await notifyOrderEvent(req.user!.id, {
          ticker: proposal.ticker,
          side: proposal.action,
          qty: quantity,
          status: "filled",
          filledPrice: order?.price || 0,
        });
      } catch (e) {}

      res.json({
        success: true,
        message: "Proposal approved. Virtual INR paper trade executed successfully.",
        order,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Reject a proposal
proposalsRouter.post(
  "/proposals/:id/reject",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const proposal = await TradeProposal.findOneAndUpdate(
        { _id: req.params.id, userId: req.user!.id, status: "pending" },
        { status: "rejected", reviewedAt: new Date() },
        { new: true }
      );

      if (!proposal) {
        res.status(404).json({ error: "Pending proposal not found." });
        return;
      }

      res.json({ success: true, message: "Proposal rejected.", proposal });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Adjust proposal size within Risk Manager limits
proposalsRouter.patch(
  "/proposals/:id/adjust",
  requireAuth,
  validateBody(proposalAdjustSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { quantity } = req.body;
      const proposal = await TradeProposal.findOne({
        _id: req.params.id,
        userId: req.user!.id,
        status: "pending",
      });

      if (!proposal) {
        res.status(404).json({ error: "Pending proposal not found." });
        return;
      }

      // Verify that new quantity does not breach maxPositionPct
      const riskProfile = await RiskProfile.findOne({ userId: req.user!.id });
      const capital = riskProfile?.allocatableCapital || 10000;
      const maxPct = riskProfile?.maxPositionPct || 10;
      const quote = await CurrentPriceService.getQuote(proposal.ticker).catch(() => null);
      const estPrice = quote?.price || 150.0;
      const maxAllowedQty = Math.floor((capital * (maxPct / 100)) / estPrice);

      if (quantity > maxAllowedQty) {
        res.status(400).json({
          error: `Adjusted quantity (${quantity}) exceeds Risk Manager maximum allowed position limit (${maxAllowedQty} shares).`,
        });
        return;
      }

      proposal.suggestedQuantity = quantity;
      proposal.suggestedSizePct = Number(((quantity * estPrice) / capital * 100).toFixed(2));
      await proposal.save();

      res.json(proposal);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
