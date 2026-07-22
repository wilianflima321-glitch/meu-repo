import { SemanticWorldIntent } from './world-forge-maestro'

/**
 * Aethel Engine: A Autogênese (Cura da Mudez do Destino)
 * A engine toma a iniciativa criativa se o usuário parar.
 */
export class AutogenesisDirector {
  private hesitationThresholdMs = 30000 // 30 segundos
  private hesitationTimer: NodeJS.Timeout | null = null

  /**
   * Ligado ao monitoramento de Gaze (Eye-tracking) ou repouso de mouse no UX.
   */
  public onUserHesitationStarted(currentMatterIntent: SemanticWorldIntent) {
    if (this.hesitationTimer) clearTimeout(this.hesitationTimer)
    
    this.hesitationTimer = setTimeout(() => {
      this.triggerAutogenesis(currentMatterIntent)
    }, this.hesitationThresholdMs)
  }

  public onUserInteracted() {
    if (this.hesitationTimer) {
      clearTimeout(this.hesitationTimer)
      this.hesitationTimer = null
    }
  }

  /**
   * Ocorre quando o usuário encara a arte por 30s sem saber o que fazer.
   * O Maestro colapsa o vazio injetando 3 destinos (Ruína, Máquina, Biológico).
   */
  private triggerAutogenesis(baseIntent: SemanticWorldIntent) {
    console.log('[Autogenesis] Fricção criativa (30s de hesitação) detectada.')
    console.log('[Autogenesis] Projetando Hologramas de Destino...')

    const destinyBranches: SemanticWorldIntent[] = [
      { ...baseIntent, mood: `${baseIntent.mood} decaying ancient rune temple` }, // Ruína
      { ...baseIntent, mood: `${baseIntent.mood} industrial war machine cogs` },   // Máquina
      { ...baseIntent, mood: `${baseIntent.mood} flesh biological anomaly pulse` } // Biológico
    ]

    // Estes 3 intents seriam enviados ao `quantum_overlap.rs` para desenhar 
    // realidades holográficas semi-transparentes na UI.
    console.table(destinyBranches)
  }
}
