import type { DirectorNote, DirectorProject, DirectorProjectType, DirectorSession } from './types'

export function detectDirectorProjectType(project: DirectorProject): DirectorProjectType {
  const name = (project.name || '').toLowerCase()
  const template = (project.template || '').toLowerCase()
  const tags = extractProjectTags(project.settings)

  if (tags.includes('game') || template.includes('game') || name.includes('game') || name.includes('jogo')) {
    return 'game'
  }
  if (tags.includes('film') || template.includes('film') || name.includes('film') || name.includes('filme')) {
    return 'film'
  }
  if (tags.includes('archviz') || template.includes('archviz') || name.includes('arch') || name.includes('arq')) {
    return 'archviz'
  }
  return 'general'
}

function extractProjectTags(settings: unknown): string[] {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return []
  const tags = (settings as { tags?: unknown }).tags
  return Array.isArray(tags)
    ? tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.toLowerCase())
    : []
}

export function createLegacyHeuristicDirectorSession(projectId: string, project: DirectorProject): DirectorSession {
  const projectType = detectDirectorProjectType(project)
  const notes = generateLegacyHeuristicNotes(projectType)
  const { score, strengths, improvements } = calculateOverallScore(notes)

  return {
    id: `dir_${projectId}_${Date.now()}`,
    projectType,
    notes,
    overallScore: score,
    strengths,
    improvements,
    lastAnalysis: Date.now(),
    isAnalyzing: false,
  }
}

function generateLegacyHeuristicNotes(projectType: DirectorProjectType): DirectorNote[] {
  const notes: DirectorNote[] = []
  const now = Date.now()

  if (projectType === 'game') {
    notes.push({
      id: `note_${now}_gameplay`,
      category: 'gameplay',
      severity: 'suggestion',
      title: 'Add impact feedback',
      description: 'Particle effects, hit stop, and camera feedback can make combat and collisions feel heavier.',
      suggestion: 'Add a CameraShake component and an impact particle preset to the combat loop.',
      autoFixAvailable: true,
      createdAt: now,
      status: 'new',
    })
  }

  if (projectType === 'film' || projectType === 'general') {
    notes.push({
      id: `note_${now}_lighting`,
      category: 'lighting',
      severity: 'recommendation',
      title: 'Improve lighting separation',
      description: 'The main scene appears to need clearer fill and rim-light separation before final preview.',
      suggestion: 'Add a soft fill light opposite the key light and keep rim intensity below the subject highlight.',
      autoFixAvailable: true,
      reference: { type: 'scene', id: 'main_scene', name: 'Main Scene' },
      createdAt: now,
      status: 'new',
    })
  }

  notes.push({
    id: `note_${now}_composition`,
    category: 'composition',
    severity: 'suggestion',
    title: 'Strengthen focal composition',
    description: 'The current focal point appears centered. A rule-of-thirds placement can make the shot feel more intentional.',
    autoFixAvailable: false,
    createdAt: now,
    status: 'new',
  })

  notes.push({
    id: `note_${now}_color`,
    category: 'color',
    severity: 'suggestion',
    title: 'Refine palette hierarchy',
    description: 'The palette has a coherent base but needs one controlled accent color for readability and player guidance.',
    autoFixAvailable: false,
    createdAt: now,
    status: 'new',
  })

  return notes
}

export function calculateOverallScore(notes: DirectorNote[]): {
  score: number
  strengths: string[]
  improvements: string[]
} {
  let score = 85
  for (const note of notes) {
    if (note.severity === 'critical') score -= 15
    else if (note.severity === 'recommendation') score -= 5
    else score -= 2
  }

  const criticalCategories = new Set(notes.filter((note) => note.severity === 'critical').map((note) => note.category))
  const strengths: string[] = []
  const improvements: string[] = []

  if (!criticalCategories.has('composition')) strengths.push('Solid visual composition foundation')
  if (!criticalCategories.has('color')) strengths.push('Coherent color direction')
  if (!criticalCategories.has('lighting')) strengths.push('Lighting is ready for focused refinement')
  else improvements.push('Refine lighting system')

  if (notes.some((note) => note.category === 'gameplay')) improvements.push('Polish gameplay feedback')
  if (notes.some((note) => note.category === 'ux')) improvements.push('Improve player onboarding')

  return { score: Math.max(0, Math.min(100, score)), strengths, improvements }
}
