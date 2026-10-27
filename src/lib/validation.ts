import { z } from "zod";
import { safeImageUrl } from "./product-display";
export const imageInput=z.string().max(600000).nullable().optional().refine(v=>!v||safeImageUrl(v)!==null,'Use a valid HTTPS image URL or a PNG, JPEG or WebP image under 400 KB');
export const holdingInput = z.object({
  productId: z.number().int().positive(), kind: z.enum(["card", "sealed", "graded"]),
  finish: z.enum(["standard", "holo"]), condition: z.enum(["NM", "MINT"]),
  quantity: z.number().int().min(1).max(100000),
  purchasePrice: z.number().finite().min(0).max(10000000),
  purchaseDate: z.iso.date().refine(d => d <= new Date().toISOString().slice(0,10), "Purchase date cannot be in the future"),
  notes: z.string().max(2000).default(""),
  gradingCompany: z.string().trim().max(50).nullable(), grade: z.string().trim().max(20).nullable(),
  certificate: z.string().trim().max(100).nullable(),
  manualPrice: z.number().finite().min(0).max(10000000).nullable(),
  customImageUrl:imageInput
}).superRefine((v, ctx) => {
  if (v.kind === "graded" && (!v.gradingCompany || !v.grade)) ctx.addIssue({ code: "custom", message: "Grading company and grade are required", path: ["grade"] });
  if (v.kind === "sealed" && v.finish !== "standard") ctx.addIssue({ code: "custom", message: "Sealed products use standard pricing", path: ["finish"] });
});
