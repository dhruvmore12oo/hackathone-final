import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const askCopilot = createServerFn({ method: "POST" })
  .inputValidator(z.object({ message: z.string() }))
  .handler(async ({ data }) => {
    const { requirePermission } = await import("../auth/server");
    const { prisma } = await import("../db.server");
    const { GoogleGenAI } = await import("@google/genai");

    await requirePermission("dashboard:read");

    const products = await prisma.product.findMany({ select: { sku: true, name: true, onHandQty: true, reservedQty: true, reorderPoint: true } });
    const pendingPurchaseOrders = await prisma.purchaseOrder.findMany({ where: { status: { in: ["PENDING_APPROVAL", "APPROVED", "CONFIRMED"] } }, include: { lines: { include: { product: true } } } });
    const activeManufacturingOrders = await prisma.manufacturingOrder.findMany({ where: { status: "IN_PROGRESS" } });

    const systemPrompt = `You are FlowAI Copilot.
You are an ERP operations assistant for a furniture manufacturing company.
Always answer using provided ERP data.
Provide actionable business recommendations.
Keep responses concise and professional.

Context Data:
Products (Low stock if onHandQty - reservedQty < reorderPoint):
${JSON.stringify(products, null, 2)}

Pending Purchase Orders:
${JSON.stringify(pendingPurchaseOrders, null, 2)}

Active Manufacturing Orders:
${JSON.stringify(activeManufacturingOrders, null, 2)}`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: data.message,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return { answer: response.text || "" };
  });
