'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// ============================================================================
// PROJECT PERSISTENCE SYSTEM (Premiere Pro / DaVinci style)
// ============================================================================

export interface ProjectMetadata {
  id: string
  name: string
  createdAt: string
  modifiedAt: string
  version: string
  author?: string
  description?: string
  tags?: string[]
  thumbnail?: string       // Base64 or URL
}

export interface ProjectSettings {
  resolution: { width: number; height: number }
  frameRate: number
  sampleRate: number
  bitDepth: number
  colorSpace: 'sRGB' | 'Rec709' | 'DCI-P3' | 'Rec2020'
  workingDirectory?: string
}

export interface MediaAsset {
  id: string
  name: string
  type: 'video' | 'audio' | 'image'
  path: string
  originalPath?: string
  duration?: number
  size?: number
  metadata?: {
    width?: number
    height?: number
    frameRate?: number
    codec?: string
    sampleRate?: number
    channels?: number
  }
  thumbnail?: string
  importedAt: string
  missing?: boolean
}

export interface TimelineMarker {
  id: string
  time: number
  name: string
  color: string
  comment?: string
  type: 'marker' | 'chapter' | 'todo'
}

export interface ClipKeyframes {
  property: string
  keyframes: Array<{
    time: number
    value: number | number[]
    easing: string
  }>
}

export interface TimelineClip {
  id: string
  assetId: string
  trackId: string
  startTime: number
  duration: number
  inPoint: number
  outPoint: number
  speed: number
  reversed: boolean
  opacity: number
  volume: number
  muted: boolean
  locked: boolean
  effects: Array<{
    id: string
    type: string
    params: Record<string, unknown>
    bypass: boolean
  }>
  keyframes: ClipKeyframes[]
  transition?: {
    type: string
    duration: number
    params?: Record<string, unknown>
  }
  color?: string
  label?: string
}

export interface TimelineTrack {
  id: string
  name: string
  type: 'video' | 'audio'
  height: number
  muted: boolean
  solo: boolean
  locked: boolean
  visible: boolean
  volume: number
  pan: number
  color: string
}

export interface Timeline {
  duration: number
  playheadPosition: number
  zoomLevel: number
  scrollPosition: number
  tracks: TimelineTrack[]
  clips: TimelineClip[]
  markers: TimelineMarker[]
}

export interface ProjectData {
  metadata: ProjectMetadata
  settings: ProjectSettings
  assets: MediaAsset[]
  timeline: Timeline
  // Extensible for future features
  bins?: Array<{
    id: string
    name: string
    assetIds: string[]
  }>
  sequences?: Timeline[]
  notes?: string
}

// ============================================================================
// PROJECT FILE FORMAT
// ============================================================================

const PROJECT_FILE_VERSION = '1.0.0'
const PROJECT_FILE_EXTENSION = '.aethel'
const PROJECT_FILE_MAGIC = 'AETHEL_PROJECT'

interface ProjectFile {
  magic: string
  version: string
  compressed: boolean
  data: ProjectData
}

// ============================================================================
// SERIALIZATION / DESERIALIZATION
// ============================================================================

export function serializeProject(project: ProjectData): string {
  const file: ProjectFile = {
    magic: PROJECT_FILE_MAGIC,
    version: PROJECT_FILE_VERSION,
    compressed: false,
    data: {
      ...project,
      metadata: {
        ...project.metadata,
        modifiedAt: new Date().toISOString()
      }
    }
  }
  
  return JSON.stringify(file, null, 2)
}

export function deserializeProject(content: string): ProjectData {
  const file = JSON.parse(content) as ProjectFile
  
  if (file.magic !== PROJECT_FILE_MAGIC) {
    throw new Error('Invalid project file format')
  }
  
  // Version migration could happen here
  if (file.version !== PROJECT_FILE_VERSION) {
    console.warn(`Project version mismatch: ${file.version} vs ${PROJECT_FILE_VERSION}. Attempting migration...`)
    // Future: Add migration logic
  }
  
  return file.data
}

// ============================================================================
// LOCAL STORAGE PERSISTENCE
// ============================================================================

const STORAGE_KEY = 'aethel_projects'
const AUTOSAVE_KEY = 'aethel_autosave'

export function saveProjectToLocalStorage(project: ProjectData): void {
  try {
    const projects = getProjectsFromLocalStorage()
    const index = projects.findIndex(p => p.metadata.id === project.metadata.id)
    
    if (index >= 0) {
      projects[index] = project
    } else {
      projects.push(project)
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch (error) {
    console.error('Failed to save project to local storage:', error)
  }
}

export function getProjectsFromLocalStorage(): ProjectData[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load projects from local storage:', error)
    return []
  }
}

export function deleteProjectFromLocalStorage(projectId: string): void {
  try {
    const projects = getProjectsFromLocalStorage()
    const filtered = projects.filter(p => p.metadata.id !== projectId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to delete project from local storage:', error)
  }
}

export function saveAutosave(project: ProjectData): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, serializeProject(project))
  } catch (error) {
    console.error('Failed to save autosave:', error)
  }
}

export function loadAutosave(): ProjectData | null {
  try {
    const data = localStorage.getItem(AUTOSAVE_KEY)
    return data ? deserializeProject(data) : null
  } catch (error) {
    console.error('Failed to load autosave:', error)
    return null
  }
}

export function clearAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY)
  } catch (error) {
    console.error('Failed to clear autosave:', error)
  }
}

// ============================================================================
// FILE SYSTEM PERSISTENCE (using File System Access API)
// ============================================================================

export async function saveProjectToFile(project: ProjectData): Promise<void> {
  if (!('showSaveFilePicker' in window)) {
    // Fallback: download as file
    downloadProject(project)
    return
  }
  
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: `${project.metadata.name}${PROJECT_FILE_EXTENSION}`,
      types: [{
        description: 'Aethel Project',
        accept: { 'application/json': [PROJECT_FILE_EXTENSION] }
      }]
    })
    
    const writable = await handle.createWritable()
    await writable.write(serializeProject(project))
    await writable.close()
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Failed to save project file:', error)
      throw error
    }
  }
}

export async function loadProjectFromFile(): Promise<ProjectData | null> {
  if (!('showOpenFilePicker' in window)) {
    // Fallback: use file input
    return loadProjectViaInput()
  }
  
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [{
        description: 'Aethel Project',
        accept: { 'application/json': [PROJECT_FILE_EXTENSION] }
      }]
    })
    
    const file = await handle.getFile()
    const content = await file.text()
    return deserializeProject(content)
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Failed to load project file:', error)
      throw error
    }
    return null
  }
}

function downloadProject(project: ProjectData): void {
  const content = serializeProject(project)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.metadata.name}${PROJECT_FILE_EXTENSION}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function loadProjectViaInput(): Promise<ProjectData | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = PROJECT_FILE_EXTENSION
    
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      
      try {
        const content = await file.text()
        resolve(deserializeProject(content))
      } catch (error) {
        console.error('Failed to load project:', error)
        resolve(null)
      }
    }
    
    input.click()
  })
}

// ============================================================================
// PROJECT CONTEXT
// ============================================================================

interface ProjectContextValue {
  project: ProjectData | null
  isDirty: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  newProject: (name: string, settings?: Partial<ProjectSettings>) => void
  openProject: () => Promise<void>
  saveProject: () => Promise<void>
  saveProjectAs: () => Promise<void>
  closeProject: () => void
  
  // Updates
  updateMetadata: (updates: Partial<ProjectMetadata>) => void
  updateSettings: (updates: Partial<ProjectSettings>) => void
  updateTimeline: (updates: Partial<Timeline>) => void
  
  // Assets
  addAsset: (asset: MediaAsset) => void
  removeAsset: (assetId: string) => void
  updateAsset: (assetId: string, updates: Partial<MediaAsset>) => void
  
  // Clips
  addClip: (clip: TimelineClip) => void
  removeClip: (clipId: string) => void
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void
  
  // Tracks
  addTrack: (track: TimelineTrack) => void
  removeTrack: (trackId: string) => void
  updateTrack: (trackId: string, updates: Partial<TimelineTrack>) => void
  
  // Recent projects
  recentProjects: ProjectMetadata[]
  openRecentProject: (projectId: string) => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

// ============================================================================
// PROJECT PROVIDER
// ============================================================================

interface ProjectProviderProps {
  children: React.ReactNode
  autosaveInterval?: number // ms, default 30s
}

export function ProjectProvider({
  children,
  autosaveInterval = 30000
}: ProjectProviderProps) {
  const [project, setProject] = useState<ProjectData | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentProjects, setRecentProjects] = useState<ProjectMetadata[]>([])
  
  // Load recent projects on mount
  useEffect(() => {
    const projects = getProjectsFromLocalStorage()
    setRecentProjects(projects.map(p => p.metadata).sort((a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    ))
    
    // Check for autosave recovery
    const autosave = loadAutosave()
    if (autosave) {
      const shouldRecover = confirm('An autosaved project was found. Would you like to recover it?')
      if (shouldRecover) {
        setProject(autosave)
        clearAutosave()
      }
    }
  }, [])
  
  // Autosave
  useEffect(() => {
    if (!project || !isDirty) return
    
    const timer = setInterval(() => {
      saveAutosave(project)
      console.log('Project autosaved')
    }, autosaveInterval)
    
    return () => clearInterval(timer)
  }, [project, isDirty, autosaveInterval])
  
  // Warn before unload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])
  
  const createDefaultProject = useCallback((name: string, settings?: Partial<ProjectSettings>): ProjectData => ({
    metadata: {
      id: `project-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      version: PROJECT_FILE_VERSION
    },
    settings: {
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      sampleRate: 48000,
      bitDepth: 16,
      colorSpace: 'sRGB',
      ...settings
    },
    assets: [],
    timeline: {
      duration: 60,
      playheadPosition: 0,
      zoomLevel: 1,
      scrollPosition: 0,
      tracks: [
        { id: 'v1', name: 'Video 1', type: 'video', height: 60, muted: false, solo: false, locked: false, visible: true, volume: 1, pan: 0, color: '#339af0' },
        { id: 'a1', name: 'Audio 1', type: 'audio', height: 40, muted: false, solo: false, locked: false, visible: true, volume: 1, pan: 0, color: '#51cf66' },
      ],
      clips: [],
      markers: []
    }
  }), [])
  
  const newProject = useCallback((name: string, settings?: Partial<ProjectSettings>) => {
    if (isDirty) {
      const confirmed = confirm('You have unsaved changes. Create new project anyway?')
      if (!confirmed) return
    }
    
    const newProj = createDefaultProject(name, settings)
    setProject(newProj)
    setIsDirty(false)
    setError(null)
    clearAutosave()
  }, [isDirty, createDefaultProject])
  
  const openProject = useCallback(async () => {
    if (isDirty) {
      const confirmed = confirm('You have unsaved changes. Open another project anyway?')
      if (!confirmed) return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const loadedProject = await loadProjectFromFile()
      if (loadedProject) {
        setProject(loadedProject)
        setIsDirty(false)
        clearAutosave()
        
        // Add to recent
        saveProjectToLocalStorage(loadedProject)
      }
    } catch (err) {
      setError('Failed to open project')
    } finally {
      setIsLoading(false)
    }
  }, [isDirty])
  
  const saveProject = useCallback(async () => {
    if (!project) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      await saveProjectToFile(project)
      saveProjectToLocalStorage(project)
      setIsDirty(false)
      clearAutosave()
    } catch (err) {
      setError('Failed to save project')
    } finally {
      setIsLoading(false)
    }
  }, [project])
  
  const saveProjectAs = useCallback(async () => {
    if (!project) return
    
    // Create a new project ID for "Save As"
    const newProject: ProjectData = {
      ...project,
      metadata: {
        ...project.metadata,
        id: `project-${Date.now()}`,
        createdAt: new Date().toISOString()
      }
    }
    
    setProject(newProject)
    await saveProject()
  }, [project, saveProject])
  
  const closeProject = useCallback(() => {
    if (isDirty) {
      const confirmed = confirm('You have unsaved changes. Close anyway?')
      if (!confirmed) return
    }
    
    setProject(null)
    setIsDirty(false)
    clearAutosave()
  }, [isDirty])
  
  const updateMetadata = useCallback((updates: Partial<ProjectMetadata>) => {
    setProject(prev => prev ? {
      ...prev,
      metadata: { ...prev.metadata, ...updates, modifiedAt: new Date().toISOString() }
    } : null)
    setIsDirty(true)
  }, [])
  
  const updateSettings = useCallback((updates: Partial<ProjectSettings>) => {
    setProject(prev => prev ? {
      ...prev,
      settings: { ...prev.settings, ...updates }
    } : null)
    setIsDirty(true)
  }, [])
  
  const updateTimeline = useCallback((updates: Partial<Timeline>) => {
    setProject(prev => prev ? {
      ...prev,
      timeline: { ...prev.timeline, ...updates }
    } : null)
    setIsDirty(true)
  }, [])
  
  const addAsset = useCallback((asset: MediaAsset) => {
    setProject(prev => prev ? {
      ...prev,
      assets: [...prev.assets, asset]
    } : null)
    setIsDirty(true)
  }, [])
  
  const removeAsset = useCallback((assetId: string) => {
    setProject(prev => prev ? {
      ...prev,
      assets: prev.assets.filter(a => a.id !== assetId)
    } : null)
    setIsDirty(true)
  }, [])
  
  const updateAsset = useCallback((assetId: string, updates: Partial<MediaAsset>) => {
    setProject(prev => prev ? {
      ...prev,
      assets: prev.assets.map(a => a.id === assetId ? { ...a, ...updates } : a)
    } : null)
    setIsDirty(true)
  }, [])
  
  const addClip = useCallback((clip: TimelineClip) => {
    setProject(prev => prev ? {
      ...prev,
      timeline: {
        ...prev.timeline,
        clips: [...prev.timeline.clips, clip]
      }
    } : null)
    setIsDirty(true)
  }, [])
  
  const removeClip = useCallback((clipId: string) => {
    setProject(prev => prev ? {
      ...prev,
      timeline: {
        ...prev.timeline,
        clips: prev.timeline.clips.filter(c => c.id !== clipId)
      }
    } : null)
    setIsDirty(true)
  }, [])
  
  const updateClip = useCallback((clipId: string, updates: Partial<TimelineClip>) => {
    setProject(prev => prev ? {
      ...prev,
      timeline: {
        ...prev.timeline,
        clips: prev.timeline.clips.map(c => c.id === clipId ? { ...c, ...updates } : c)
      }
    } : null)
    setIsDirty(true)
  }, [])
  
  const addTrack = useCallback((track: TimelineTrack) => {
    setProject(prev => prev ? {
      ...prev,
      timeline: {
        ...prev.timeline,
        tracks: [...prev.timeline.tracks, track]
      }
    } : null)
    setIsDirty(true)
  }, [])
  
  const removeTrack = useCallback((trackId: string) => {
    setProject(prev => prev ? {
      ...prev,
      timeline: {
        ...prev.timeline,
        tracks: prev.timeline.tracks.filter(t => t.id !== trackId),
        clips: prev.timeline.clips.filter(c => c.trackId !== trackId)
      }
    } : null)
    setIsDirty(true)
  }, [])
  
  const updateTrack = useCallback((trackId: string, updates: Partial<TimelineTrack>) => {
    setProject(prev => prev ? {
      ...prev,
      timeline: {
        ...prev.timeline,
        tracks: prev.timeline.tracks.map(t => t.id === trackId ? { ...t, ...updates } : t)
      }
    } : null)
    setIsDirty(true)
  }, [])
  
  const openRecentProject = useCallback(async (projectId: string) => {
    if (isDirty) {
      const confirmed = confirm('You have unsaved changes. Open another project anyway?')
      if (!confirmed) return
    }
    
    const projects = getProjectsFromLocalStorage()
    const found = projects.find(p => p.metadata.id === projectId)
    
    if (found) {
      setProject(found)
      setIsDirty(false)
      clearAutosave()
    }
  }, [isDirty])
  
  const value = useMemo<ProjectContextValue>(() => ({
    project,
    isDirty,
    isLoading,
    error,
    newProject,
    openProject,
    saveProject,
    saveProjectAs,
    closeProject,
    updateMetadata,
    updateSettings,
    updateTimeline,
    addAsset,
    removeAsset,
    updateAsset,
    addClip,
    removeClip,
    updateClip,
    addTrack,
    removeTrack,
    updateTrack,
    recentProjects,
    openRecentProject
  }), [
    project, isDirty, isLoading, error, recentProjects,
    newProject, openProject, saveProject, saveProjectAs, closeProject,
    updateMetadata, updateSettings, updateTimeline,
    addAsset, removeAsset, updateAsset,
    addClip, removeClip, updateClip,
    addTrack, removeTrack, updateTrack,
    openRecentProject
  ])
  
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}

// ============================================================================
// PROJECT DIALOG COMPONENT
// ============================================================================

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string, settings: Partial<ProjectSettings>) => void
}

export function NewProjectDialog({ open, onClose, onCreate }: NewProjectDialogProps) {
  const [name, setName] = useState('Untitled Project')
  const [width, setWidth] = useState(1920)
  const [height, setHeight] = useState(1080)
  const [frameRate, setFrameRate] = useState(30)
  
  if (!open) return null
  
  const presets = [
    { label: '1080p HD', width: 1920, height: 1080 },
    { label: '4K UHD', width: 3840, height: 2160 },
    { label: '720p HD', width: 1280, height: 720 },
    { label: 'Instagram Square', width: 1080, height: 1080 },
    { label: 'Instagram Story', width: 1080, height: 1920 },
    { label: 'YouTube Shorts', width: 1080, height: 1920 },
  ]
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#25262b',
        borderRadius: 8,
        padding: 24,
        minWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <h2 style={{ color: '#fff', margin: '0 0 20px 0', fontSize: 18 }}>New Project</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Project name */}
          <div>
            <label style={{ color: '#909296', fontSize: 11, display: 'block', marginBottom: 4 }}>
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1a1b1e',
                border: '1px solid #373a40',
                borderRadius: 4,
                color: '#fff',
                fontSize: 14
              }}
            />
          </div>
          
          {/* Resolution presets */}
          <div>
            <label style={{ color: '#909296', fontSize: 11, display: 'block', marginBottom: 4 }}>
              Resolution Preset
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {presets.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setWidth(preset.width)
                    setHeight(preset.height)
                  }}
                  style={{
                    padding: '6px 12px',
                    background: width === preset.width && height === preset.height ? '#339af0' : '#373a40',
                    border: 'none',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: 11,
                    cursor: 'pointer'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Custom resolution */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#909296', fontSize: 11, display: 'block', marginBottom: 4 }}>
                Width
              </label>
              <input
                type="number"
                value={width}
                onChange={e => setWidth(parseInt(e.target.value) || 1920)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1a1b1e',
                  border: '1px solid #373a40',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 14
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#909296', fontSize: 11, display: 'block', marginBottom: 4 }}>
                Height
              </label>
              <input
                type="number"
                value={height}
                onChange={e => setHeight(parseInt(e.target.value) || 1080)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1a1b1e',
                  border: '1px solid #373a40',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 14
                }}
              />
            </div>
          </div>
          
          {/* Frame rate */}
          <div>
            <label style={{ color: '#909296', fontSize: 11, display: 'block', marginBottom: 4 }}>
              Frame Rate
            </label>
            <select
              value={frameRate}
              onChange={e => setFrameRate(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#1a1b1e',
                border: '1px solid #373a40',
                borderRadius: 4,
                color: '#fff',
                fontSize: 14
              }}
            >
              <option value={24}>24 fps (Cinema)</option>
              <option value={25}>25 fps (PAL)</option>
              <option value={30}>30 fps (NTSC)</option>
              <option value={50}>50 fps</option>
              <option value={60}>60 fps</option>
            </select>
          </div>
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #373a40',
              borderRadius: 4,
              color: '#909296',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onCreate(name, {
                resolution: { width, height },
                frameRate
              })
              onClose()
            }}
            style={{
              padding: '8px 16px',
              background: '#339af0',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProjectProvider
