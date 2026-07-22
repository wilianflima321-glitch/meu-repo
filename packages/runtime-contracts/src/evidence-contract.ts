import { z } from 'zod';

export const AssetEvidenceSchema = z.object({
  assetId: z.string().uuid(),
  bitHash: z.string(), // Hash SHA-256 do conteúdo gerado
  provenance: z.object({
    promptId: z.string(),
    model: z.string(),
    latency: z.number(),
  }),
  // A PROVA: A IA deve rodar um mini-teste antes de enviar
  validation: z.object({
    unitTestPassed: z.boolean(),
    visualChecksum: z.string(), // Print do asset interpretado
    collisionBoundVerified: z.boolean(),
  }),
  status: z.enum(['DRAFT', 'PROVEN', 'REJECTED']),
});

export type AssetEvidence = z.infer<typeof AssetEvidenceSchema>;
