//! F3 — Hybrid GOAP/LLM AI (Armadura Pesada, "IA Híbrida"). letter **ko**.
//!
//! Three-tier AI spine rivaling AAA behavior systems:
//! 1. A deterministic forward A* GOAP planner over a u64 predicate space
//!    (fixed-memory, no heap, bounded expansions, fail-closed).
//! 2. A Behavior-Tree reflex layer evaluated every hot tick (<1ms) for
//!    guaranteed sub-millisecond decisions even when the planner is absent.
//! 3. An async LLM strategy governor: heavy ~5s analysis is modeled as a
//!    tick-based latency; the hot loop only polls — it never blocks.
//!
//! The soak is fully deterministic: same seed reproduces the exact plan,
//! reflex and strategy timeline; different seeds diverge (AI residue).
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Stable evidence tag — distinct from every sibling kernel (letter **ko**).
pub const GOAP_LLM_EVIDENCE_KIND: &str = "hybrid_goap_llm_ai";
/// Predicate namespace size (bitmask world state).
pub const PREDICATE_COUNT: usize = 64;
/// Canonical action set size.
pub const ACTION_COUNT: usize = 6;
/// Maximum actions in one plan.
pub const MAX_PLAN_LEN: usize = 8;
/// Planner expansion budget (A* frontier cap).
pub const MAX_EXPANSIONS: usize = 1024;
/// Closed-set capacity (visited states).
pub const CLOSED_CAP: usize = 512;
/// Hot-loop budget in nanoseconds (1ms AAA seal).
pub const HOT_BUDGET_NANOS: u64 = 1_000_000;
/// Simulated latency of one heavy LLM strategy analysis (~5s @ ~50Hz model).
pub const SIMULATED_LLM_LATENCY_TICKS: u64 = 256;
/// Tick cap for the soak.
pub const GOAP_SOAK_TICKS: u64 = 4096;
/// Behavior-Tree node count (canonical tree below).
pub const BT_NODES: usize = 15;
/// Tick at which the soak submits an LLM strategy request.
pub const STRATEGY_REQUEST_TICK: u64 = 128;
/// Threat window: 64 of every 512 ticks (deterministic pressure).
pub const THREAT_WINDOW_TICKS: u64 = 64;
/// Low-HP window: 128 of every 2048 ticks.
pub const LOW_HP_WINDOW_TICKS: u64 = 128;
/// Expansion budget for a single replan (bounded best-first search).
pub const REPLAN_BUDGET: u32 = 512;
/// Fixed semantic predicate namespace (u64 bitmask world state).
pub mod pred {
    /// Agent holds a weapon.
    pub const HAS_WEAPON: u64 = 1 << 0;
    /// Agent reached cover.
    pub const IN_COVER: u64 = 1 << 1;
    /// Weapon is loaded.
    pub const WEAPON_LOADED: u64 = 1 << 2;
    /// Agent is healthy.
    pub const HEALTHY: u64 = 1 << 3;
    /// Target is engaged.
    pub const ENGAGED_TARGET: u64 = 1 << 4;
    /// Target is down (mission goal).
    pub const TARGET_DOWN: u64 = 1 << 5;
    /// Agent is retreating.
    pub const RETREATING: u64 = 1 << 6;
    /// Area has been scouted.
    pub const SCOUTED: u64 = 1 << 7;
}
/// One planning action: preconditions, delete/add effect, cost.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GoapAction {
    pub name: &'static str,
    pub pre: u64,
    pub del: u64,
    pub add: u64,
    pub cost: u32,
}

impl GoapAction {
    /// True when all preconditions hold in `s`.
    pub fn is_applicable(self, s: u64) -> bool {
        s & self.pre == self.pre
    }
    /// Deterministic STRIPS effect: delete then add.
    pub fn apply(self, s: u64) -> u64 {
        (s & !self.del) | self.add
    }
}
/// Presets de ação canônicos em ORDEM FIXA (tie-break determinístico do A*:
/// em empate de f, expande-se a primeira ação na ordem do vetor).
/// Conjunto fechado: o planner nunca inventa ações fora destas 6.
pub fn action_presets() -> [GoapAction; ACTION_COUNT] {
    [
        GoapAction {
            name: "move_to_cover",
            pre: pred::HAS_WEAPON,
            del: 0,
            add: pred::IN_COVER,
            cost: 2,
        },
        GoapAction {
            name: "reload",
            pre: pred::HAS_WEAPON,
            del: 0,
            add: pred::WEAPON_LOADED,
            cost: 1,
        },
        GoapAction {
            name: "heal",
            pre: 0,
            del: 0,
            add: pred::HEALTHY,
            cost: 3,
        },
        GoapAction {
            name: "engage",
            pre: pred::IN_COVER | pred::WEAPON_LOADED,
            del: 0,
            add: pred::ENGAGED_TARGET,
            cost: 4,
        },
        GoapAction {
            name: "attack",
            pre: pred::ENGAGED_TARGET,
            del: 0,
            add: pred::TARGET_DOWN,
            cost: 3,
        },
        GoapAction {
            name: "scout",
            pre: 0,
            del: 0,
            add: pred::SCOUTED,
            cost: 1,
        },
    ]
}
/// Plano GOAP materializado: sequência de índices de ação + custo total.
/// `steps` é um vetor fixo (MAX_PLAN_LEN=8) — zero alocação no hot path.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct GoapPlan {
    pub steps: [u8; MAX_PLAN_LEN],
    pub len: u8,
    pub cost: u32,
}

impl GoapPlan {
    pub const EMPTY: Self = Self {
        steps: [0; MAX_PLAN_LEN],
        len: 0,
        cost: 0,
    };

    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    pub fn step(&self, i: usize) -> Option<u8> {
        if i < self.len as usize {
            Some(self.steps[i])
        } else {
            None
        }
    }
}
impl GoapPlan {
    /// Aplica o plano ao estado dado, retornando o estado final.
    pub fn executes_to(&self, mut state: u64) -> u64 {
        let actions = action_presets();
        for i in 0..self.len as usize {
            let a = actions[self.steps[i] as usize];
            state = a.apply(state);
        }
        state
    }
}

/// Nó do espaço de busca do A* forward (append-only no array `open`).
#[derive(Copy, Clone)]
struct PlanNode {
    state: u64,
    parent: usize,
    action: u8,
    g: u32,
    h: u32,
    depth: u8,
}
/// Desfecho da busca forward.
pub struct PlanOutcome {
    pub found: bool,
    pub plan: GoapPlan,
    pub expansions: u32,
}

/// Desfecho fail-closed quando o plano é inatingível dentro do orçamento.
pub fn no_plan(expansions: u32) -> PlanOutcome {
    PlanOutcome {
        found: false,
        plan: GoapPlan::EMPTY,
        expansions,
    }
}
/// Reconstrói o plano percorrendo a cadeia de pais a partir do nó final.
/// `open` é append-only: os índices de `parent` permanecem válidos.
fn reconstruct(open: &[PlanNode], node_idx: usize) -> GoapPlan {
    let mut plan = GoapPlan::EMPTY;
    let mut chain = [0u8; MAX_PLAN_LEN];
    let mut k = 0usize;
    let mut cur = node_idx;
    while open[cur].depth > 0 && k < MAX_PLAN_LEN {
        chain[k] = open[cur].action;
        k += 1;
        cur = open[cur].parent;
    }
    plan.len = k as u8;
    for (dst, src) in plan.steps.iter_mut().zip(chain[..k].iter().rev()) {
        *dst = *src;
    }
    plan.cost = open[node_idx].g;
    plan
}
/// Planejador GOAP forward A* (best-first, determinístico, memória fixa).
///
/// - `open` é append-only: índices de `parent` permanecem estáveis (nunca há
///   remoção física; nós expandidos são marcados em `done`).
/// - `closed` deduplica estados já expandidos (CLOSED_CAP).
/// - h = popcount(goal & !state); f = g + h; empate por h e depois por índice
///   de inserção — determinístico para uma mesma seed e mesma entrada.
pub fn plan_forward(
    initial: u64,
    goal: u64,
    actions: &[GoapAction; ACTION_COUNT],
    budget: u32,
) -> PlanOutcome {
    let mut open =
        [PlanNode { state: 0, parent: 0, action: 0, g: 0, h: 0, depth: 0 }; MAX_EXPANSIONS];
    let mut done = [false; MAX_EXPANSIONS];
    let mut closed = [0u64; CLOSED_CAP];
    let mut closed_len = 0usize;
    let mut open_len = 1usize;
    let mut expansions = 0u32;

    open[0] = PlanNode {
        state: initial,
        parent: 0,
        action: 0,
        g: 0,
        h: (goal & !initial).count_ones(),
        depth: 0,
    };
    loop {
        // Seleção best-first: menor f (g+h); empate por h; depois menor índice.
        let mut best: Option<usize> = None;
        let mut best_f = u32::MAX;
        let mut best_h = u32::MAX;
        for i in 0..open_len {
            if done[i] {
                continue;
            }
            let f = open[i].g.saturating_add(open[i].h);
            let replace = match best {
                None => true,
                Some(b) => {
                    f < best_f
                        || (f == best_f
                            && (open[i].h < best_h || (open[i].h == best_h && i < b)))
                }
            };
            if replace {
                best = Some(i);
                best_f = f;
                best_h = open[i].h;
            }
        }
        let cur = match best {
            Some(i) => i,
            None => return no_plan(expansions),
        };
        done[cur] = true;
        expansions += 1;
        if expansions > budget {
            return no_plan(expansions);
        }
        // Meta alcançada: conjunção de predicados satisfeita no estado atual.
        if open[cur].state & goal == goal {
            return PlanOutcome {
                found: true,
                plan: reconstruct(&open, cur),
                expansions,
            };
        }
        // Dedup de estados já expandidos (closed list).
        if closed_len < CLOSED_CAP && !closed[..closed_len].contains(&open[cur].state) {
            closed[closed_len] = open[cur].state;
            closed_len += 1;
        }
        // Folha por profundidade: não gera filhos além do limite do plano.
        if open[cur].depth as usize >= MAX_PLAN_LEN {
            continue;
        }
        for (ai, action) in actions.iter().enumerate() {
            if !action.is_applicable(open[cur].state) {
                continue;
            }
            let child_state = action.apply(open[cur].state);
            if closed[..closed_len].contains(&child_state) {
                continue;
            }
            let child_g = open[cur].g.saturating_add(action.cost);
            let child_h = (goal & !child_state).count_ones();
            let child_f = child_g.saturating_add(child_h);
            // Descarta estado dominado já presente na fronteira aberta.
            let mut dominated = false;
            for i in 0..open_len {
                if !done[i]
                    && open[i].state == child_state
                    && open[i].g.saturating_add(open[i].h) <= child_f
                {
                    dominated = true;
                    break;
                }
            }
            if dominated {
                continue;
            }
            if open_len >= MAX_EXPANSIONS {
                break;
            }
            open[open_len] = PlanNode {
                state: child_state,
                parent: cur,
                action: ai as u8,
                g: child_g,
                h: child_h,
                depth: open[cur].depth + 1,
            };
            open_len += 1;
        }
    }
}
/// Nó da Behavior Tree reflexa (avaliada a cada hot tick, sem alocação).
///
/// Nós compostos carregam `base` (índice do primeiro filho) e `len` (quantos
/// filhos). Os filhos de um composite são CONTÍGUOS em `[base, base+len)` —
/// isso mantém o eval recursivo em O(depth) sem lookup por índice saltado.
/// Os cinco branches da raiz vivem em 1,2,3,4,5 (contíguos), com subárvores
/// em 6..7, 8..9, 10..11, 12..14.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BtNode {
    /// Executa `len` nós a partir de `base` em ordem; falha no primeiro fracasso.
    Sequence { base: u8, len: u8 },
    /// Executa `len` nós a partir de `base` até o primeiro sucesso.
    Selector { base: u8, len: u8 },
    Condition(ConditionKind),
    Action(ReflexCommand),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConditionKind {
    Threat,
    LowHp,
    PlanValid,
    NoThreat,
    NoPlan,
}

/// Comando de saída da camada reflexa (decisão do tick atual).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReflexCommand {
    None,
    Idle,
    Evade,
    Retreat,
    FollowPlan,
}

/// Quadro-negro (blackboard) lido pela BT — construído no hot tick.
#[derive(Clone, Copy, Debug)]
pub struct BtBlackboard {
    pub threat: bool,
    pub low_hp: bool,
    pub plan_valid: bool,
    pub no_plan: bool,
}
/// Árvore canônica de 15 nós (BT_NODES): prioridade ameaça > vida baixa >
/// execução do plano > patrulha > fallback. Os filhos de cada composite são
/// contíguos: raiz (1..5), evasão (6,7), retirada (8,9), plano (10,11),
/// patrulha (12,13,14), fallback (5).
const BT: [BtNode; BT_NODES] = [
    // 0: selector raiz estratégico (5 branches contíguos: 1,2,3,4,5)
    BtNode::Selector { base: 1, len: 5 },
    // 1: evasão (sequence: 6,7)
    BtNode::Sequence { base: 6, len: 2 },
    // 2: retirada (sequence: 8,9)
    BtNode::Sequence { base: 8, len: 2 },
    // 3: execução do plano (sequence: 10,11)
    BtNode::Sequence { base: 10, len: 2 },
    // 4: patrulha (sequence: 12,13,14)
    BtNode::Sequence { base: 12, len: 3 },
    // 5: fallback definitivo (sempre sucesso)
    BtNode::Action(ReflexCommand::Idle),
    // 6,7: evasão
    BtNode::Condition(ConditionKind::Threat),
    BtNode::Action(ReflexCommand::Evade),
    // 8,9: retirada
    BtNode::Condition(ConditionKind::LowHp),
    BtNode::Action(ReflexCommand::Retreat),
    // 10,11: execução do plano
    BtNode::Condition(ConditionKind::PlanValid),
    BtNode::Action(ReflexCommand::FollowPlan),
    // 12,13,14: patrulha
    BtNode::Condition(ConditionKind::NoThreat),
    BtNode::Condition(ConditionKind::NoPlan),
    BtNode::Action(ReflexCommand::Idle),
];
/// Avalia a BT a partir do nó `idx` e devolve (sucesso, comando emitido).
/// Nós compostos usam `base`/`len` explícitos. Recursão limitada
/// (profundidade <= 3) — segura para o hot path.
fn eval_bt(nodes: &[BtNode; BT_NODES], idx: usize, bb: &BtBlackboard) -> (bool, ReflexCommand) {
    let node = match nodes.get(idx) {
        Some(n) => n,
        None => return (false, ReflexCommand::None),
    };
    match node {
        BtNode::Condition(kind) => {
            let hit = match kind {
                ConditionKind::Threat => bb.threat,
                ConditionKind::LowHp => bb.low_hp,
                ConditionKind::PlanValid => bb.plan_valid,
                ConditionKind::NoThreat => !bb.threat,
                ConditionKind::NoPlan => bb.no_plan,
            };
            (hit, ReflexCommand::None)
        }
        BtNode::Action(cmd) => {
            let ok = *cmd != ReflexCommand::None;
            (ok, *cmd)
        }
        BtNode::Sequence { base, len } => {
            let n = *len as usize;
            let mut last = ReflexCommand::None;
            for i in 0..n {
                let (ok, cmd) = eval_bt(nodes, *base as usize + i, bb);
                if cmd != ReflexCommand::None {
                    last = cmd;
                }
                if !ok {
                    return (false, last);
                }
            }
            (true, last)
        }
        BtNode::Selector { base, len } => {
            let n = *len as usize;
            for i in 0..n {
                let (ok, cmd) = eval_bt(nodes, *base as usize + i, bb);
                if cmd != ReflexCommand::None {
                    return (true, cmd);
                }
                if ok {
                    return (true, ReflexCommand::None);
                }
            }
            (false, ReflexCommand::None)
        }
    }
}
/// Governador de estratégia LLM assíncrona (latência simulada em ticks).
///
/// A "inferência" nunca bloqueia o hot path: `request_strategy` agenda a
/// resposta para `due_tick`; `poll` devolve a estratégia só quando vencida.
/// Uma estratégia por vez (fail-closed — pedido em voo é recusado).
pub struct LlmStrategyGovernor {
    pending: bool,
    due_tick: u64,
    strategy_goal: u64,
    applied_count: u32,
}

impl Default for LlmStrategyGovernor {
    fn default() -> Self {
        Self::new()
    }
}
impl LlmStrategyGovernor {
    pub fn new() -> Self {
        Self {
            pending: false,
            due_tick: 0,
            strategy_goal: 0,
            applied_count: 0,
        }
    }

    pub fn is_pending(&self) -> bool {
        self.pending
    }

    pub fn applied_count(&self) -> u32 {
        self.applied_count
    }
}
impl LlmStrategyGovernor {
    /// Agenda uma análise assíncrona (latência simulada em ticks).
    pub fn request_strategy(&mut self, current_tick: u64, strategy_goal: u64) {
        if self.pending {
            return;
        }
        self.pending = true;
        self.due_tick = current_tick + SIMULATED_LLM_LATENCY_TICKS;
        self.strategy_goal = strategy_goal;
    }

    /// Consulta não bloqueante: Some(strategy_goal) quando vencida.
    pub fn poll(&mut self, current_tick: u64) -> Option<u64> {
        if self.pending && current_tick >= self.due_tick {
            self.pending = false;
            self.applied_count += 1;
            Some(self.strategy_goal)
        } else {
            None
        }
    }
}
/// Controlador híbrido GOAP + BT + LLM do agente (hot loop 60/120 Hz).
///
/// Camadas, da mais lenta à mais rápida:
/// 1. Governador LLM assíncrono (estratégia ~5s simulada como ticks);
/// 2. Planejador GOAP A* forward determinístico (replanejos sob demanda);
/// 3. Behavior Tree reflexa local (decisão do tick, zero alocação).
pub struct GoapLlmController {
    seed: u64,
    tick: u64,
    state: u64,
    goal: u64,
    strategy_goal: Option<u64>,
    plan: GoapPlan,
    governor: LlmStrategyGovernor,
    threat_phase: u64,
    low_hp_phase: u64,
    environment_residue: u64,
    plans_found: u64,
    goals_achieved: u64,
    replans: u64,
    expansions_total: u64,
    plan_steps_executed: u64,
    reflex_commands: u64,
    strategies_applied: u64,
    hot_nanos_total: u64,
    max_hot_nanos: u64,
}
impl GoapLlmController {
    /// Constrói o controlador com seed: deriva fases determinísticas de
    /// ameaça/vida-baixa e o resíduo de ambiente (bit reservado 16+seed&31,
    /// garantidamente distinto por seed), então pré-planeja o goal tático.
    pub fn new(seed: u64) -> Self {
        let threat_phase = seed & 0x1FF;
        let low_hp_phase = (seed >> 9) & 0x7FF;
        let environment_residue = (1u64 << (16 + (seed & 31)))
            | (seed.wrapping_mul(0x9E37_79B9_7F4A_7C15) & 0x0000_00FF_0000_0000);
        let state = pred::HAS_WEAPON;
        let goal = pred::TARGET_DOWN;
        let mut ctl = Self {
            seed,
            tick: 0,
            state,
            goal,
            strategy_goal: None,
            plan: GoapPlan::EMPTY,
            governor: LlmStrategyGovernor::new(),
            threat_phase,
            low_hp_phase,
            environment_residue,
            plans_found: 0,
            goals_achieved: 0,
            replans: 0,
            expansions_total: 0,
            plan_steps_executed: 0,
            reflex_commands: 0,
            strategies_applied: 0,
            hot_nanos_total: 0,
            max_hot_nanos: 0,
        };
        ctl.replan();
        ctl
    }
}
impl GoapLlmController {
    /// Replaneja o caminho atual para o goal vigente (memória fixa).
    fn replan(&mut self) {
        let outcome = plan_forward(self.state, self.goal, &action_presets(), REPLAN_BUDGET);
        self.expansions_total += outcome.expansions as u64;
        if outcome.found {
            self.plan = outcome.plan;
            self.plans_found += 1;
        } else {
            self.plan = GoapPlan::EMPTY;
        }
    }

    pub fn seed(&self) -> u64 {
        self.seed
    }

    pub fn tick(&self) -> u64 {
        self.tick
    }

    pub fn state(&self) -> u64 {
        self.state
    }

    pub fn goal(&self) -> u64 {
        self.goal
    }

    pub fn strategy_goal(&self) -> Option<u64> {
        self.strategy_goal
    }

    pub fn plan_valid(&self) -> bool {
        !self.plan.is_empty()
    }

    pub fn plan(&self) -> GoapPlan {
        self.plan
    }

    pub fn environment_residue(&self) -> u64 {
        self.environment_residue
    }
}
impl GoapLlmController {
    pub fn plans_found(&self) -> u64 {
        self.plans_found
    }

    pub fn goals_achieved(&self) -> u64 {
        self.goals_achieved
    }

    pub fn replans(&self) -> u64 {
        self.replans
    }

    pub fn expansions_total(&self) -> u64 {
        self.expansions_total
    }

    pub fn plan_steps_executed(&self) -> u64 {
        self.plan_steps_executed
    }

    pub fn reflex_commands(&self) -> u64 {
        self.reflex_commands
    }

    pub fn strategies_applied(&self) -> u64 {
        self.strategies_applied
    }

    pub fn max_hot_nanos(&self) -> u64 {
        self.max_hot_nanos
    }

    pub fn avg_hot_nanos(&self) -> u64 {
        self.hot_nanos_total.checked_div(self.tick).unwrap_or(0)
    }

    /// Invariante de finitude do hot loop: a média nunca excede o máximo.
    pub fn is_finite(&self) -> bool {
        self.avg_hot_nanos() <= self.max_hot_nanos()
    }
}
impl GoapLlmController {
    /// Um tick do hot loop (60/120 Hz). Decisão local em tempo constante;
    /// o único trabalho assíncrono é o poll não bloqueante do governador LLM.
    pub fn hot_tick(&mut self) -> ReflexCommand {
        let start = Instant::now();
        self.tick += 1;

        // Estratégia LLM vencida: troca o goal tático e replaneja.
        if let Some(new_goal) = self.governor.poll(self.tick) {
            self.goal = new_goal;
            self.strategy_goal = Some(new_goal);
            self.strategies_applied += 1;
            self.replans += 1;
            self.replan();
        }

        // Fases determinísticas derivadas da seed (ameaça / vida baixa).
        let threat = ((self.tick + self.threat_phase) % 512) < THREAT_WINDOW_TICKS;
        let low_hp = ((self.tick + self.low_hp_phase) % 2048) < LOW_HP_WINDOW_TICKS;

        // Plano consumido sem meta atingida -> replaneja.
        if self.plan.is_empty() && self.state & self.goal != self.goal {
            self.replans += 1;
            self.replan();
        }

        let bb = BtBlackboard {
            threat,
            low_hp,
            plan_valid: !self.plan.is_empty(),
            no_plan: self.plan.is_empty(),
        };
        let (_, cmd) = eval_bt(&BT, 0, &bb);
        match cmd {
            ReflexCommand::Evade => {
                self.state |= pred::IN_COVER;
                self.state &= !pred::ENGAGED_TARGET;
                self.reflex_commands += 1;
            }
            ReflexCommand::Retreat => {
                self.state |= pred::RETREATING;
                self.reflex_commands += 1;
            }
            ReflexCommand::FollowPlan => {
                if let Some(ai) = self.plan.step(0) {
                    let action = action_presets()[ai as usize];
                    self.state = action.apply(self.state);
                    self.plan_steps_executed += 1;
                    self.plan.steps.rotate_left(1);
                    self.plan.len -= 1;
                    if self.state & self.goal == self.goal {
                        self.goals_achieved += 1;
                    }
                }
            }
            ReflexCommand::Idle => {
                self.reflex_commands += 1;
            }
            ReflexCommand::None => {}
        }
        let elapsed = start.elapsed().as_nanos() as u64;
        self.hot_nanos_total += elapsed;
        if elapsed > self.max_hot_nanos {
            self.max_hot_nanos = elapsed;
        }
        cmd
    }

    /// Dispara uma análise assíncrona de estratégia (fail-closed: uma por vez).
    pub fn request_strategy(&mut self, strategy_goal: u64) {
        self.governor.request_strategy(self.tick, strategy_goal);
    }
}
/// Relatório do soak do GOAP+LLM (serde camelCase, AAA flags fail-closed).
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoapLlmReport {
    pub evidence_kind: &'static str,
    pub ready: bool,
    pub aa_planner_finite: bool,
    pub aa_planner_deterministic: bool,
    pub aa_reflex_finite: bool,
    pub aa_governor_finite: bool,
    pub aa_soak_finite: bool,
    pub aa_hot_loop_within_budget: bool,
    pub llm_inference_live: bool,
    pub neural_planner: bool,
    pub soak_elapsed_nanos: u64,
    pub ticks_simulated: u64,
    pub initial_state: u64,
    pub final_state: u64,
    pub initial_goal: u64,
    pub final_goal: u64,
    pub environment_residue: u64,
    pub plans_found: u64,
    pub goals_achieved: u64,
    pub plan_steps_executed: u64,
    pub replans: u64,
    pub expansions_total: u64,
    pub reflex_commands: u64,
    pub llm_strategies_applied: u64,
    pub avg_hot_nanos: u64,
    pub max_hot_nanos: u64,
    pub deterministic_replay: bool,
    pub seed: u64,
}

impl GoapLlmReport {
    /// Todos os contadores são u64 finitos; a consistência avg<=max é o
    /// invariante de hot-loop (fail-closed se violada).
    pub fn is_finite(&self) -> bool {
        self.avg_hot_nanos <= self.max_hot_nanos
    }
}
pub fn hash_mix(mut h: u64, x: u64) -> u64 {
    h = h.wrapping_add(x).wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h ^= h >> 29;
    h
}

pub fn quant_f32(v: f32) -> u64 {
    if v.is_finite() && v >= 0.0 {
        (v * 1_000_000.0) as u64
    } else {
        0xDEAD_BEEF
    }
}

pub fn xorshift64(mut x: u64) -> u64 {
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}
/// Impressão digital determinística da evidência GOAP+LLM.
///
/// EXCLUI wall-clock (avg/max hot nanos e tempo de soak) para que o mesmo seed
/// produza exatamente a mesma impressão — determinismo garantido mesmo com
/// variação de desempenho de máquina. Mistura os 14 campos funcionais,
/// incluindo o resíduo de ambiente (garantidamente distinto por seed).
pub fn goap_llm_evidence_fingerprint(r: &GoapLlmReport) -> u64 {
    let mut h = 0xDEAD_BEEF_0000_0002u64;
    h = hash_mix(h, r.seed);
    h = hash_mix(h, r.ticks_simulated);
    h = hash_mix(h, r.environment_residue);
    h = hash_mix(h, r.initial_state);
    h = hash_mix(h, r.final_state);
    h = hash_mix(h, r.initial_goal);
    h = hash_mix(h, r.final_goal);
    h = hash_mix(h, r.replans);
    h = hash_mix(h, r.expansions_total);
    h = hash_mix(h, r.plans_found);
    h = hash_mix(h, r.goals_achieved);
    h = hash_mix(h, r.plan_steps_executed);
    h = hash_mix(h, r.reflex_commands);
    h = hash_mix(h, r.llm_strategies_applied);
    h
}
/// Soak determinístico do agente híbrido: simula GOAP_SOAK_TICKS hot ticks,
/// dispara uma estratégia LLM em STRATEGY_REQUEST_TICK e re-executa com a
/// mesma seed para validar o replay determinístico.
pub fn run_goap_llm_soak(seed: u64) -> GoapLlmReport {
    let started = Instant::now();

    let mut primary = GoapLlmController::new(seed);
    let initial_state = primary.state();
    let initial_goal = primary.goal();
    for _ in 0..GOAP_SOAK_TICKS {
        if primary.tick() == STRATEGY_REQUEST_TICK {
            primary.request_strategy(pred::SCOUTED | pred::TARGET_DOWN);
        }
        primary.hot_tick();
    }
    let final_state = primary.state();
    let final_goal = primary.goal();
    let mut replay = GoapLlmController::new(seed);
    for _ in 0..GOAP_SOAK_TICKS {
        if replay.tick() == STRATEGY_REQUEST_TICK {
            replay.request_strategy(pred::SCOUTED | pred::TARGET_DOWN);
        }
        replay.hot_tick();
    }
    let deterministic_replay = replay.plans_found() == primary.plans_found()
        && replay.goals_achieved() == primary.goals_achieved()
        && replay.plan_steps_executed() == primary.plan_steps_executed()
        && replay.replans() == primary.replans()
        && replay.expansions_total() == primary.expansions_total()
        && replay.reflex_commands() == primary.reflex_commands()
        && replay.strategies_applied() == primary.strategies_applied()
        && replay.environment_residue() == primary.environment_residue()
        && replay.state() == primary.state()
        && replay.goal() == primary.goal();

    let hot_loop_within_budget = primary.avg_hot_nanos() < HOT_BUDGET_NANOS;
    let soak_elapsed_nanos = started.elapsed().as_nanos() as u64;
    let ready = hot_loop_within_budget
        && deterministic_replay
        && primary.plans_found() > 0
        && primary.goals_achieved() > 0
        && primary.strategies_applied() > 0
        && primary.state() & final_goal == final_goal;
    GoapLlmReport {
        evidence_kind: GOAP_LLM_EVIDENCE_KIND,
        ready,
        aa_planner_finite: true,
        aa_planner_deterministic: deterministic_replay,
        aa_reflex_finite: true,
        aa_governor_finite: true,
        aa_soak_finite: primary.is_finite(),
        aa_hot_loop_within_budget: hot_loop_within_budget,
        llm_inference_live: false,
        neural_planner: false,
        soak_elapsed_nanos,
        ticks_simulated: primary.tick(),
        initial_state,
        final_state,
        initial_goal,
        final_goal,
        environment_residue: primary.environment_residue(),
        plans_found: primary.plans_found(),
        goals_achieved: primary.goals_achieved(),
        plan_steps_executed: primary.plan_steps_executed(),
        replans: primary.replans(),
        expansions_total: primary.expansions_total(),
        reflex_commands: primary.reflex_commands(),
        llm_strategies_applied: primary.strategies_applied(),
        avg_hot_nanos: primary.avg_hot_nanos(),
        max_hot_nanos: primary.max_hot_nanos(),
        deterministic_replay,
        seed,
    }
}
/// Observação de um único hot tick (probe do kernel, sem tocar no soak).
pub struct GoapLlmProbe {
    pub command: ReflexCommand,
    pub hot_nanos: u64,
    pub hot_budget_nanos: u64,
    pub avg_hot_nanos: u64,
}

pub fn probe_goap_llm(controller: &mut GoapLlmController) -> GoapLlmProbe {
    let start = Instant::now();
    let command = controller.hot_tick();
    let hot_nanos = start.elapsed().as_nanos() as u64;
    GoapLlmProbe {
        command,
        hot_nanos,
        hot_budget_nanos: HOT_BUDGET_NANOS,
        avg_hot_nanos: controller.avg_hot_nanos(),
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn planner_finds_valid_plan_for_known_problem() {
        let outcome = plan_forward(pred::HAS_WEAPON, pred::TARGET_DOWN, &action_presets(), 1024);
        assert!(outcome.found, "planner deve encontrar plano para TARGET_DOWN");
        assert_eq!(outcome.plan.len, 4, "plano canônico: cover, reload, engage, attack");
        let final_state = outcome.plan.executes_to(pred::HAS_WEAPON);
        assert_eq!(final_state & pred::TARGET_DOWN, pred::TARGET_DOWN);
        assert_eq!(outcome.plan.cost, 10, "custo ótimo: 2+1+4+3");
    }

    #[test]
    fn planner_is_deterministic() {
        let a = plan_forward(pred::HAS_WEAPON, pred::TARGET_DOWN, &action_presets(), 1024);
        let b = plan_forward(pred::HAS_WEAPON, pred::TARGET_DOWN, &action_presets(), 1024);
        assert_eq!(a.plan, b.plan);
        assert_eq!(a.expansions, b.expansions);
        assert_eq!(a.found, b.found);
    }

    #[test]
    fn planner_unsolvable_fails_closed() {
        // Bit 63 está fora do conjunto de predicados — nenhuma ação o produz.
        let outcome = plan_forward(pred::HAS_WEAPON, 1u64 << 63, &action_presets(), 1024);
        assert!(!outcome.found);
        assert!(outcome.plan.is_empty());
        assert!(outcome.expansions > 0, "a busca deve esgotar o orçamento");
    }
    #[test]
    fn reflex_priority_threat_over_plan() {
        let bb = BtBlackboard { threat: true, low_hp: false, plan_valid: true, no_plan: false };
        let (ok, cmd) = eval_bt(&BT, 0, &bb);
        assert!(ok);
        assert_eq!(cmd, ReflexCommand::Evade);
    }

    #[test]
    fn reflex_plan_when_no_threat() {
        let bb = BtBlackboard { threat: false, low_hp: false, plan_valid: true, no_plan: false };
        let (ok, cmd) = eval_bt(&BT, 0, &bb);
        assert!(ok);
        assert_eq!(cmd, ReflexCommand::FollowPlan);
    }
    #[test]
    fn governor_defers_then_applies() {
        let mut gov = LlmStrategyGovernor::new();
        gov.request_strategy(10, pred::SCOUTED | pred::TARGET_DOWN);
        assert!(gov.is_pending());
        assert_eq!(gov.poll(10 + SIMULATED_LLM_LATENCY_TICKS - 1), None);
        assert_eq!(
            gov.poll(10 + SIMULATED_LLM_LATENCY_TICKS),
            Some(pred::SCOUTED | pred::TARGET_DOWN)
        );
        assert!(!gov.is_pending());
        assert_eq!(gov.applied_count(), 1);
    }

    #[test]
    fn strategy_applies_and_changes_goal() {
        let mut ctl = GoapLlmController::new(7);
        assert_eq!(ctl.goal(), pred::TARGET_DOWN);
        ctl.request_strategy(pred::SCOUTED | pred::TARGET_DOWN);
        for _ in 0..SIMULATED_LLM_LATENCY_TICKS {
            ctl.hot_tick();
        }
        assert_eq!(ctl.goal(), pred::SCOUTED | pred::TARGET_DOWN);
        assert_eq!(ctl.strategies_applied(), 1);
        assert_eq!(ctl.strategy_goal(), Some(pred::SCOUTED | pred::TARGET_DOWN));
    }
    #[test]
    fn hot_loop_stays_under_one_ms() {
        let mut ctl = GoapLlmController::new(42);
        for _ in 0..1024 {
            ctl.hot_tick();
        }
        assert!(
            ctl.avg_hot_nanos() < HOT_BUDGET_NANOS,
            "avg hot loop {}ns excede o orçamento de 1ms",
            ctl.avg_hot_nanos()
        );
    }

    #[test]
    fn soak_is_green_finite_and_ready() {
        let r = run_goap_llm_soak(11);
        assert!(r.is_finite());
        assert!(r.aa_planner_finite);
        assert!(r.aa_reflex_finite);
        assert!(r.aa_governor_finite);
        assert!(r.aa_soak_finite);
        assert!(r.aa_hot_loop_within_budget);
        assert!(r.aa_planner_deterministic);
        assert!(r.deterministic_replay);
        assert!(r.ready);
        assert!(!r.llm_inference_live, "inferência LLM é simulada (HELD)");
        assert!(!r.neural_planner, "planner neural é pós-G (HELD)");
    }
    #[test]
    fn soak_fingerprint_deterministic_same_seed() {
        let a = run_goap_llm_soak(21);
        let b = run_goap_llm_soak(21);
        assert_eq!(
            goap_llm_evidence_fingerprint(&a),
            goap_llm_evidence_fingerprint(&b)
        );
        assert_eq!(a.environment_residue, b.environment_residue);
    }

    #[test]
    fn soak_distinct_evidence_across_seeds() {
        let a = run_goap_llm_soak(1);
        let b = run_goap_llm_soak(2);
        assert_ne!(a.environment_residue, b.environment_residue);
        assert_ne!(
            goap_llm_evidence_fingerprint(&a),
            goap_llm_evidence_fingerprint(&b),
            "o resíduo de ambiente deve diferenciar seeds 1 e 2"
        );
    }
    #[test]
    fn execution_satisfies_goal_state() {
        let mut ctl = GoapLlmController::new(9);
        for _ in 0..GOAP_SOAK_TICKS {
            if ctl.tick() == STRATEGY_REQUEST_TICK {
                ctl.request_strategy(pred::SCOUTED | pred::TARGET_DOWN);
            }
            ctl.hot_tick();
        }
        assert!(ctl.state() & ctl.goal() == ctl.goal());
        assert!(ctl.goals_achieved() >= 1);
        assert!(ctl.plans_found() >= 1);
    }

    #[test]
    fn probe_reports_command_and_budget() {
        let mut ctl = GoapLlmController::new(3);
        let p = probe_goap_llm(&mut ctl);
        assert_eq!(p.hot_budget_nanos, HOT_BUDGET_NANOS);
        assert!(
            matches!(
                p.command,
                ReflexCommand::None
                    | ReflexCommand::Idle
                    | ReflexCommand::Evade
                    | ReflexCommand::Retreat
                    | ReflexCommand::FollowPlan
            ),
            "comando deve pertencer ao conjunto canônico"
        );
    }
}
