import { describe, it, expect } from 'vitest'
import { SUBJECTS, SUBJECT_BY_ID, type SubjectId } from '../subjects'

describe('纳税主体定义', () => {
  it('至少 4 类主体(MVP 范围)', () => {
    expect(SUBJECTS.length).toBeGreaterThanOrEqual(4)
  })

  it('id 唯一', () => {
    const ids = SUBJECTS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('SUBJECT_BY_ID 索引完整', () => {
    for (const s of SUBJECTS) {
      expect(SUBJECT_BY_ID[s.id]).toBe(s)
    }
  })

  it('每类主体都至少支持 1 个税种', () => {
    for (const s of SUBJECTS) {
      expect(s.applicableTaxes.length).toBeGreaterThan(0)
    }
  })

  it('MVP 必含的 4 类主体齐全', () => {
    const required: SubjectId[] = [
      'individual-salary',
      'individual-labor',
      'small-business',
      'general-company',
    ]
    for (const r of required) {
      expect(SUBJECT_BY_ID[r]).toBeDefined()
    }
  })
})
