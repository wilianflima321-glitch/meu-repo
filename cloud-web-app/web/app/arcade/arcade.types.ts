export type ArcadeGame = {
  slug: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  tags: string[]
  status: string
  plays: number
  authorName: string
  publishedAt: string | null
}

export type ArcadeGameDetail = ArcadeGame & {
  playUrl: string | null
  playable: boolean
}
