export function DashboardContentCreationTab() {
  return (
    <div className="aethel-p-6">
      <h2 className="aethel-text-2xl aethel-font-bold aethel-mb-6">Criacao de conteudo</h2>
      <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
        <div className="aethel-card aethel-p-6">
          <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Conteudo com IA</h3>
          <p className="aethel-text-slate-400 aethel-mb-4">Gere codigo, documentacao e conteudo criativo com assistencia de IA.</p>
          <button type="button" className="aethel-button aethel-button-primary">Comecar a criar</button>
        </div>
        <div className="aethel-card aethel-p-6">
          <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Modelos</h3>
          <p className="aethel-text-slate-400 aethel-mb-4">Use modelos pre-prontos para tarefas comuns de desenvolvimento.</p>
          <button type="button" className="aethel-button aethel-button-secondary">Ver modelos</button>
        </div>
      </div>
    </div>
  )
}
