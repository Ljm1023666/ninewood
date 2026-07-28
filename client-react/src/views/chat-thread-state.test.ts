import { describe, expect, it } from 'vitest'
import { getChatThreadContentState } from './chat-thread-state'

describe('getChatThreadContentState', () => {
  it('联系人已有预览时仍显示加载态，避免正文短暂空白', () => {
    expect(
      getChatThreadContentState({
        loading: true,
        loadError: null,
        itemCount: 0,
        hasConversationPreview: true,
      }),
    ).toBe('loading')
  })

  it('区分失败、未同步和真正空会话', () => {
    expect(
      getChatThreadContentState({
        loading: false,
        loadError: '加载失败',
        itemCount: 0,
        hasConversationPreview: true,
      }),
    ).toBe('error')

    expect(
      getChatThreadContentState({
        loading: false,
        loadError: null,
        itemCount: 0,
        hasConversationPreview: true,
      }),
    ).toBe('mismatch')

    expect(
      getChatThreadContentState({
        loading: false,
        loadError: null,
        itemCount: 0,
        hasConversationPreview: false,
      }),
    ).toBe('empty')
  })

  it('已有消息时优先保留正文，不被后台加载错误遮挡', () => {
    expect(
      getChatThreadContentState({
        loading: true,
        loadError: '后台同步失败',
        itemCount: 1,
        hasConversationPreview: true,
      }),
    ).toBe('ready')
  })
})
