'use client'

import React, { useState, useMemo } from 'react'
import {
  MessageSquare,
  User,
  GitBranch,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Sliders,
  Volume2,
  Sparkles,
  Shield,
  Zap,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  Smile,
  Frown,
  AlertCircle,
  Eye,
  FolderPlus,
  Coins,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────

export type DialogueNodeType = 'speaker' | 'choice' | 'condition' | 'action'

export type FacialEmotion = 'neutral' | 'happy' | 'angry' | 'skeptical' | 'fearful' | 'intrigued'

export interface ChoiceOption {
  id: string
  text: string
  targetNodeId?: string | null
  skillCheck?: {
    type: 'Persuasion' | 'Intimidation' | 'Insight' | 'Tech' | 'Arcana'
    difficulty: number // DC 10..25
    successNodeId?: string
    failureNodeId?: string
  }
  reputationRequirement?: {
    faction: string
    minPoints: number
  }
}

export interface DialogueNode {
  id: string
  type: DialogueNodeType
  title: string
  speakerName?: string
  speakerAvatar?: string
  emotion?: FacialEmotion
  dialogueText?: string
  voiceAudioCue?: string
  cameraShotPreset?: 'CloseUp' | 'Medium' | 'OverTheShoulder' | 'Wide'
  choices?: ChoiceOption[]
  condition?: {
    variableKey: string
    operator: '==' | '!=' | '>=' | '<='
    expectedValue: string | number | boolean
    trueTargetNodeId?: string
    falseTargetNodeId?: string
  }
  action?: {
    actionType: 'GiveQuest' | 'GiveItem' | 'TriggerCombat' | 'PlayCutscene' | 'ModifyReputation'
    payload: string
    targetNodeId?: string
  }
  x: number
  y: number
}

export interface DialogueConnection {
  id: string
  fromNodeId: string
  fromSlotId?: string
  toNodeId: string
}

// Initial Fixture Graph
const INITIAL_NODES: DialogueNode[] = [
  {
    id: 'd-root',
    type: 'speaker',
    title: 'Greeting (NPC)',
    speakerName: 'Commander Vane',
    emotion: 'skeptical',
    dialogueText: 'You made it through the perimeter alive. Did you secure the orbital telemetry core?',
    voiceAudioCue: 'VO_Vane_Greeting_01',
    cameraShotPreset: 'Medium',
    x: 60,
    y: 100,
  },
  {
    id: 'd-choice-01',
    type: 'choice',
    title: 'Player Responses',
    x: 380,
    y: 100,
    choices: [
      {
        id: 'opt-1',
        text: 'Here is the telemetry core, completely uncorrupted.',
        targetNodeId: 'd-action-reward',
      },
      {
        id: 'opt-2',
        text: '[Persuasion DC 14] I secured it, but the data is worth double what we agreed on.',
        skillCheck: {
          type: 'Persuasion',
          difficulty: 14,
          successNodeId: 'd-persuade-success',
          failureNodeId: 'd-persuade-fail',
        },
      },
      {
        id: 'opt-3',
        text: 'The facility was crawling with rogue drones. I barely escaped.',
        targetNodeId: 'd-drone-info',
      },
    ],
  },
  {
    id: 'd-action-reward',
    type: 'action',
    title: 'Complete Mission & Payout',
    action: {
      actionType: 'GiveItem',
      payload: 'Item_AethelCoins_500 + XP_1200',
      targetNodeId: 'd-farewell',
    },
    x: 740,
    y: 40,
  },
  {
    id: 'd-persuade-success',
    type: 'speaker',
    title: 'Vane (Convinced)',
    speakerName: 'Commander Vane',
    emotion: 'intrigued',
    dialogueText: 'Fair enough operative. Good work is scarce out here. Here is your bonus payout.',
    voiceAudioCue: 'VO_Vane_Bonus_Agreed',
    cameraShotPreset: 'CloseUp',
    x: 740,
    y: 200,
  },
  {
    id: 'd-persuade-fail',
    type: 'speaker',
    title: 'Vane (Offended)',
    speakerName: 'Commander Vane',
    emotion: 'angry',
    dialogueText: 'Dont get greedy with me. You take the standard contract rate or you leave empty handed.',
    voiceAudioCue: 'VO_Vane_Angry_Deny',
    cameraShotPreset: 'CloseUp',
    x: 740,
    y: 360,
  },
  {
    id: 'd-farewell',
    type: 'speaker',
    title: 'Mission Debrief',
    speakerName: 'Commander Vane',
    emotion: 'happy',
    dialogueText: 'Transmission received. Stand by for your next deployment coordinates.',
    cameraShotPreset: 'Medium',
    x: 1060,
    y: 120,
  },
]

const INITIAL_CONNECTIONS: DialogueConnection[] = [
  { id: 'c1', fromNodeId: 'd-root', toNodeId: 'd-choice-01' },
  { id: 'c2', fromNodeId: 'd-choice-01', fromSlotId: 'opt-1', toNodeId: 'd-action-reward' },
  { id: 'c3', fromNodeId: 'd-action-reward', toNodeId: 'd-farewell' },
  { id: 'c4', fromNodeId: 'd-persuade-success', toNodeId: 'd-farewell' },
]

export default function DialogueTreeStudio() {
  const [nodes, setNodes] = useState<DialogueNode[]>(INITIAL_NODES)
  const [connections, setConnections] = useState<DialogueConnection[]>(INITIAL_CONNECTIONS)
  const [selectedNodeId, setSelectedNodeId] = useState<string>('d-root')
  const [isSimulating, setIsSimulating] = useState(false)
  const [currentNodeInSim, setCurrentNodeInSim] = useState<string>('d-root')
  const [simLog, setSimLog] = useState<{ speaker: string; text: string }[]>([])

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || nodes[0], [nodes, selectedNodeId])

  const startSimulation = () => {
    setIsSimulating(true)
    setCurrentNodeInSim('d-root')
    const root = nodes.find((n) => n.id === 'd-root')
    if (root && root.dialogueText) {
      setSimLog([{ speaker: root.speakerName || 'Speaker', text: root.dialogueText }])
    } else {
      setSimLog([])
    }
  }

  const stopSimulation = () => {
    setIsSimulating(false)
    setSimLog([])
  }

  const handleChoiceInSim = (choice: ChoiceOption) => {
    // Add player response to log
    setSimLog((prev) => [...prev, { speaker: 'Player', text: choice.text }])

    let nextTargetId = choice.targetNodeId

    // Handle Skill Check
    if (choice.skillCheck) {
      const roll = Math.floor(Math.random() * 20) + 1 + 3 // +3 bonus
      const isSuccess = roll >= choice.skillCheck.difficulty
      nextTargetId = isSuccess ? choice.skillCheck.successNodeId : choice.skillCheck.failureNodeId
      setSimLog((prev) => [
        ...prev,
        {
          speaker: 'System Check',
          text: `[${choice.skillCheck?.type} Roll: ${roll} vs DC ${choice.skillCheck?.difficulty}] ➔ ${
            isSuccess ? 'SUCCESS' : 'FAILED'
          }`,
        },
      ])
    }

    if (nextTargetId) {
      setCurrentNodeInSim(nextTargetId)
      const nextNode = nodes.find((n) => n.id === nextTargetId)
      if (nextNode && nextNode.dialogueText) {
        setSimLog((prev) => [...prev, { speaker: nextNode.speakerName || 'Speaker', text: nextNode.dialogueText! }])
      }
    }
  }

  const activeSimNode = useMemo(() => nodes.find((n) => n.id === currentNodeInSim), [nodes, currentNodeInSim])

  return (
    <div className="flex h-full w-full flex-col bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] select-none">
      {/* ── Top Main Toolbar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
              Dialogue Tree & Narrative Studio
            </h1>
            <p className="text-[11px] text-[var(--aethel-text-tertiary)]">
              Branching Conversations, Skill Checks (DC), Voice Cues & Emotion Blending
            </p>
          </div>
        </div>

        {/* Action Controls & Simulator Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const newNode: DialogueNode = {
                id: `d-${Date.now()}`,
                type: 'speaker',
                title: `Line_${nodes.length + 1}`,
                speakerName: 'NPC',
                emotion: 'neutral',
                dialogueText: 'New dialogue sentence goes here...',
                x: 200,
                y: 200,
              }
              setNodes([...nodes, newNode])
              setSelectedNodeId(newNode.id)
            }}
            className="flex h-7 items-center gap-1 rounded-md border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 text-xs font-medium text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)] hover:text-[var(--aethel-text-primary)]"
          >
            <Plus className="h-3 w-3" /> Add Dialogue Node
          </button>

          <button
            onClick={isSimulating ? stopSimulation : startSimulation}
            className={`flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-all ${
              isSimulating
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" /> Exit Sim
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" /> Test Dialogue
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center: Graph Canvas */}
        <div
          className="relative flex-1 overflow-hidden bg-slate-950 p-6"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* Nodes Rendering */}
          <div className="absolute inset-0 p-8 overflow-auto">
            <div className="relative w-[1800px] h-[1000px]">
              {nodes.map((node) => {
                const isSelected = selectedNodeId === node.id
                const isSimActive = isSimulating && currentNodeInSim === node.id

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`absolute w-72 rounded-xl border bg-slate-900/95 p-3.5 shadow-2xl transition-all cursor-pointer ${
                      isSimActive
                        ? 'ring-2 ring-amber-400 border-amber-400 shadow-amber-500/20'
                        : isSelected
                          ? 'ring-2 ring-blue-500 border-blue-400 shadow-blue-500/20'
                          : 'border-slate-700/60 hover:border-slate-500'
                    }`}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  >
                    {/* Node Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
                      <div className="flex items-center gap-1.5 truncate">
                        {node.type === 'speaker' && <User className="h-3.5 w-3.5 text-blue-400" />}
                        {node.type === 'choice' && <GitBranch className="h-3.5 w-3.5 text-emerald-400" />}
                        {node.type === 'action' && <Zap className="h-3.5 w-3.5 text-amber-400" />}
                        <span className="text-xs font-bold text-slate-200 truncate">{node.title}</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase rounded bg-slate-800 px-1.5 py-0.5 text-slate-400">
                        {node.type}
                      </span>
                    </div>

                    {/* Dialogue Text Content */}
                    {node.type === 'speaker' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-blue-300">{node.speakerName}</span>
                          <span className="text-[10px] text-slate-400 capitalize">Emotion: {node.emotion}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/60 p-2 rounded border border-slate-800/80">
                          &ldquo;{node.dialogueText}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Choices Content */}
                    {node.type === 'choice' && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Options ({node.choices?.length || 0})
                        </span>
                        {node.choices?.map((ch, idx) => (
                          <div
                            key={ch.id}
                            className="rounded bg-slate-950/80 border border-slate-800 p-1.5 text-[11px] text-emerald-300"
                          >
                            <span className="font-mono text-[10px] text-slate-500 mr-1.5">{idx + 1}.</span>
                            {ch.text}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Content */}
                    {node.type === 'action' && (
                      <div className="rounded bg-amber-950/20 border border-amber-500/30 p-2 text-xs text-amber-300 space-y-1">
                        <span className="font-semibold block">{node.action?.actionType}</span>
                        <span className="font-mono text-[11px] text-slate-400 block">{node.action?.payload}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom Interactive Dialogue Simulator (When Playing) */}
          {isSimulating && (
            <div className="absolute bottom-6 inset-x-8 max-w-2xl mx-auto rounded-2xl border border-blue-500/40 bg-slate-900/95 shadow-2xl backdrop-blur-xl p-4 space-y-3 z-30">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <Play className="h-3 w-3 fill-current" /> Live Conversation Simulator
                </span>
                <span className="text-[10px] font-mono text-slate-400">Node: {activeSimNode?.id}</span>
              </div>

              {/* Chat Transcript Log */}
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 text-xs">
                {simLog.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg ${
                      entry.speaker === 'Player'
                        ? 'bg-blue-950/50 text-blue-200 border border-blue-800/40 ml-4'
                        : entry.speaker === 'System Check'
                          ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40 font-mono text-[11px]'
                          : 'bg-slate-800/60 text-slate-200 border border-slate-700/40 mr-4'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70 mb-0.5">
                      {entry.speaker}
                    </span>
                    <p className="leading-relaxed">{entry.text}</p>
                  </div>
                ))}
              </div>

              {/* Player Choice Options Input */}
              {activeSimNode?.type === 'choice' && activeSimNode.choices && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Select Response:
                  </span>
                  {activeSimNode.choices.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => handleChoiceInSim(ch)}
                      className="w-full text-left rounded-lg border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/50 p-2 text-xs text-emerald-200 transition-all"
                    >
                      {ch.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Node Details Inspector */}
        <aside className="w-80 flex flex-col border-l border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4 overflow-y-auto space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-text-secondary)] flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5" /> Node Properties
          </h2>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] text-[var(--aethel-text-tertiary)] uppercase font-semibold block mb-1">
                  Node Title
                </span>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) => {
                    const val = e.target.value
                    setNodes(nodes.map((n) => (n.id === selectedNode.id ? { ...n, title: val } : n)))
                  }}
                  className="h-7 w-full rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2 font-semibold text-xs text-[var(--aethel-text-primary)]"
                />
              </div>

              {selectedNode.type === 'speaker' && (
                <>
                  <div>
                    <span className="text-[10px] text-[var(--aethel-text-tertiary)] uppercase font-semibold block mb-1">
                      Speaker Name
                    </span>
                    <input
                      type="text"
                      value={selectedNode.speakerName || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setNodes(nodes.map((n) => (n.id === selectedNode.id ? { ...n, speakerName: val } : n)))
                      }}
                      className="h-7 w-full rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2 font-mono text-xs text-[var(--aethel-text-primary)]"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--aethel-text-tertiary)] uppercase font-semibold block mb-1">
                      Facial Emotion
                    </span>
                    <select
                      value={selectedNode.emotion || 'neutral'}
                      onChange={(e) => {
                        const val = e.target.value as FacialEmotion
                        setNodes(nodes.map((n) => (n.id === selectedNode.id ? { ...n, emotion: val } : n)))
                      }}
                      className="h-7 w-full rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2 text-xs text-[var(--aethel-text-primary)]"
                    >
                      <option value="neutral">Neutral</option>
                      <option value="happy">Happy</option>
                      <option value="angry">Angry</option>
                      <option value="skeptical">Skeptical</option>
                      <option value="fearful">Fearful</option>
                      <option value="intrigued">Intrigued</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--aethel-text-tertiary)] uppercase font-semibold block mb-1">
                      Dialogue Lines
                    </span>
                    <textarea
                      rows={4}
                      value={selectedNode.dialogueText || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setNodes(nodes.map((n) => (n.id === selectedNode.id ? { ...n, dialogueText: val } : n)))
                      }}
                      className="w-full rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-2 text-xs text-[var(--aethel-text-primary)] focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-[var(--aethel-border-subtle)]">
                <button
                  onClick={() => {
                    setNodes(nodes.filter((n) => n.id !== selectedNode.id))
                    setSelectedNodeId(nodes[0]?.id || '')
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-red-500/40 bg-red-950/40 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/60"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Node
                </button>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
