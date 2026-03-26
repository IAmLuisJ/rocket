import { describe, it, expect } from 'vitest'
import { detectComplete, detectBlocked, detectDecide } from './tags.js'

describe('detectComplete', () => {
  it('returns true when <complete> is present', () => {
    expect(detectComplete('<complete>')).toBe(true)
  })

  it('detects tag in mid-text', () => {
    expect(detectComplete('All done! <complete> goodbye')).toBe(true)
  })

  it('returns false for text without <complete>', () => {
    expect(detectComplete('just some text')).toBe(false)
  })

  it('returns false for incomplete tag', () => {
    expect(detectComplete('<complet')).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(detectComplete('<COMPLETE>')).toBe(false)
    expect(detectComplete('<Complete>')).toBe(false)
  })
})

describe('detectBlocked', () => {
  it('extracts reason from blocked tag', () => {
    expect(detectBlocked('<blocked>npm install failed</blocked>')).toEqual({
      blocked: true,
      reason: 'npm install failed',
    })
  })

  it('trims whitespace from reason', () => {
    expect(detectBlocked('<blocked>  spaces  </blocked>')).toEqual({
      blocked: true,
      reason: 'spaces',
    })
  })

  it('handles multi-line reason', () => {
    expect(detectBlocked('<blocked>line1\nline2</blocked>')).toEqual({
      blocked: true,
      reason: 'line1\nline2',
    })
  })

  it('returns null when no blocked tag is found', () => {
    expect(detectBlocked('no issues here')).toBeNull()
  })

  it('returns null for opening tag without closing tag', () => {
    expect(detectBlocked('<blocked>no end')).toBeNull()
  })

  it('extracts from mid-text', () => {
    expect(detectBlocked('prefix <blocked>reason</blocked> suffix')).toEqual({
      blocked: true,
      reason: 'reason',
    })
  })
})

describe('detectDecide', () => {
  it('extracts question from decide tag', () => {
    expect(detectDecide('<decide>Use REST or GraphQL?</decide>')).toEqual({
      decide: true,
      question: 'Use REST or GraphQL?',
    })
  })

  it('trims whitespace from question', () => {
    expect(detectDecide('<decide>  padded  </decide>')).toEqual({
      decide: true,
      question: 'padded',
    })
  })

  it('handles multi-line question', () => {
    expect(detectDecide('<decide>line1\nline2</decide>')).toEqual({
      decide: true,
      question: 'line1\nline2',
    })
  })

  it('returns null when no decide tag is found', () => {
    expect(detectDecide('no decision needed')).toBeNull()
  })

  it('returns null for opening tag without closing tag', () => {
    expect(detectDecide('<decide>no end')).toBeNull()
  })

  it('extracts from mid-text', () => {
    expect(detectDecide('before <decide>question?</decide> after')).toEqual({
      decide: true,
      question: 'question?',
    })
  })
})
