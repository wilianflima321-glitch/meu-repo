import { SemanticWorldIntent } from './world-forge-maestro'

/**
 * Entropia de Shannon Estética (Morte do Plástico Genérico)
 * A IA não decide o que é 'bonito'. Ela calcula se a forma é rica em informação.
 * Se for medíocre (plástica/perfeita), a Aethel Engine injeta micro-imperfeições (Ruído Paramétrico).
 */
export class ShannonEntropyAuditor {
  /**
   * Avalia a complexidade informacional da Intenção.
   * Se o design da argila for simples demais, força ruídos de imperfeição orgânica.
   */
  public static enforceInformationDensity(intent: SemanticWorldIntent): SemanticWorldIntent {
    const entropyScore = this.calculateEntropy(intent)
    
    // Threshold de Entropia: Se o score for menor que 3.0, a matéria é falsa (perfeita demais).
    if (entropyScore < 3.0) {
      console.warn(`[Shannon Auditor] Entropia baixa (${entropyScore.toFixed(2)}). Design genérico detectado. Injetando Micro-Imperfeições.`)
      return this.injectDigitalImperfections(intent)
    }

    return intent
  }

  private static calculateEntropy(intent: SemanticWorldIntent): number {
    // Cálculo heurístico simulando Shannon H(X) sobre a variância descritiva do material
    let entropy = 1.0
    
    if (intent.mood.includes('organic') || intent.mood.includes('ruin')) {
      entropy += 1.5
    }
    
    // Matéria sintética/pura tende a ter baixa entropia (design 'plástico')
    if (intent.environmentType === 'urban' || intent.environmentType === 'alien') {
      entropy -= 0.5 
    }
    
    return entropy
  }

  private static injectDigitalImperfections(intent: SemanticWorldIntent): SemanticWorldIntent {
    return {
      ...intent,
      // Força a inserção de 'fractal-scratch', 'asymmetric-wear', 'organic-porosity'
      mood: `${intent.mood} with asymmetric high-frequency micro-porosity and structural wear`,
      suggestedPropDistribution: {
        ...intent.suggestedPropDistribution,
        '_aethel_forced_noise_layer': 0.8 // Sinaliza o Rust SDF Sculptor para aumentar octaves de ruído
      }
    }
  }
}
