export type ChatThreadContentState =
  | 'ready'
  | 'loading'
  | 'error'
  | 'mismatch'
  | 'empty'

export function getChatThreadContentState({
  loading,
  loadError,
  itemCount,
  hasConversationPreview,
}: {
  loading: boolean
  loadError: string | null
  itemCount: number
  hasConversationPreview: boolean
}): ChatThreadContentState {
  if (itemCount > 0) return 'ready'
  if (loading) return 'loading'
  if (loadError) return 'error'
  return hasConversationPreview ? 'mismatch' : 'empty'
}
