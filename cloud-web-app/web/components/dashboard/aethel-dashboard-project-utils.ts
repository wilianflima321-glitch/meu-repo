import type { Project } from './aethel-dashboard-model'

export function createProjectEntry(
  projects: Project[],
  name: string,
  type: Project['type']
): Project {
  const maxId = projects.reduce((max, project) => Math.max(max, project.id), 0)
  return {
    id: maxId + 1,
    name,
    type,
    status: 'active',
  }
}

export function removeProjectEntry(projects: Project[], id: number): Project[] {
  return projects.filter((project) => project.id !== id)
}
