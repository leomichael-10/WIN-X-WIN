export interface Player {
  id: string
  name: string
  money: number
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type CompletionStatus = 'pending' | 'confirmed' | 'rejected'

export interface Completion {
  id: string
  player_name: string
  avatar_url: string | null
  challenge_text: string
  status: CompletionStatus
  reward: number
  created_at: string
  resolved_at: string | null
}
