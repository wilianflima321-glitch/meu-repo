export type BiasItem = {
  id: string
  text: string
  status: string
  autoScore?: number | null
  autoFlags?: string[]
  createdAt: string
}

export type BiasStats = {
  total: number
  highBias: number
  mediumBias: number
  lowBias: number
  pending: number
}

export type BiasPriority = 'low' | 'normal' | 'high' | 'urgent'
export type StatusFilter = 'all' | 'pending' | 'resolved'
export type BiasFilter = 'all' | 'high' | 'medium' | 'low' | 'none'

export const emptyStats: BiasStats = {
  total: 0,
  highBias: 0,
  mediumBias: 0,
  lowBias: 0,
  pending: 0,
}
