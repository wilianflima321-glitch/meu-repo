import { z } from 'zod'

/**
 * L6 Supremacia: Alquimia Física (O Contrato de Matéria)
 * A Geometria e a Física não são componentes separados. A geometria é a expressão visual
 * das propriedades de matéria descritas neste contrato.
 */
export const PhysicalMatterPropertiesSchema = z.object({
  density: z.number().describe('Densidade base em kg/m³'),
  youngsModulus: z.number().describe('Rigidez elástica do material (GigaPascals)'),
  combustionRate: z.number().min(0).max(1).describe('0 = incombustível, 1 = altamente inflamável'),
  frictionCoefficient: z.number().min(0).describe('Resistência ao deslizamento (0 = gelo, 1 = borracha bruta)'),
  acousticResonance: z.number().min(0).max(1).describe('Propagação de som (0 = abafado, 1 = metálico/cristalino)'),
})
export type PhysicalMatterProperties = z.infer<typeof PhysicalMatterPropertiesSchema>

export const GenomicMatterContractSchema = z.object({
  matterId: z.string().uuid(),
  semanticCategory: z.enum(['wood', 'metal', 'stone', 'flesh', 'synthetic', 'plasma']),
  physics: PhysicalMatterPropertiesSchema,
  // A geometria é subordinada à física:
  proceduralMeshSeed: z.string(), 
  integrityPoints: z.number().describe('Quando a integridade acaba, o ECS gera estilhaços usando a acústica e densidade da matéria.'),
})
export type GenomicMatterContract = z.infer<typeof GenomicMatterContractSchema>
