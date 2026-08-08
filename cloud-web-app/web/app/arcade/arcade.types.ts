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
  /** Hub honesty — Desktop Exclusive when no web demo artifact. */
  noWebDemo?: boolean
  listingLabel?: 'web_demo' | 'desktop_exclusive' | 'build_pending'
}

export type ArcadeGameDetail = ArcadeGame & {
  playUrl: string | null
  /** Honest Instant Play URL when Compression/demo evidence stamped a web demo. */
  demoPlayUrl: string | null
  playable: boolean
  compressionMandatePassed?: boolean
}
