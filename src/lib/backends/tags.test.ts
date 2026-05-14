import { describe, it, expect } from 'vitest'
import {
  hasCompleteTag,
  hasBlockedTag,
  hasDecideTag,
  extractBlockedReason,
  extractDecideQuestion,
} from './tags.js'

describe('hasCompleteTag', () => {
  it('detects <complete> tag', () => {
    expect(hasCompleteTag('<complete>')).toBe(true)
  })

  it('detects tag in mid-text', () => {
    expect(hasCompleteTag('All done! <complete> goodbye')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(hasCompleteTag('<COMPLETE>')).toBe(true)
    expect(hasCompleteTag('<Complete>')).toBe(true)
  })

  it('returns false for no tag', () => {
    expect(hasCompleteTag('just some text')).toBe(false)
  })

  it('returns false for incomplete tag', () => {
    expect(hasCompleteTag('<complet')).toBe(false)
  })

  it('detects legacy promise complete tag', () => {
    expect(hasCompleteTag('<promise>COMPLETE</promise>')).toBe(true)
  })
})

describe('hasBlockedTag', () => {
  it('detects <blocked> tag', () => {
    expect(hasBlockedTag('<blocked>reason</blocked>')).toBe(true)
  })

  it('returns false for no tag', () => {
    expect(hasBlockedTag('no issues here')).toBe(false)
  })

  it('detects legacy promise blocked tag', () => {
    expect(hasBlockedTag('<promise>BLOCKED:Missing API key</promise>')).toBe(true)
  })
})

describe('hasDecideTag', () => {
  it('detects <decide> tag', () => {
    expect(hasDecideTag('<decide>question?</decide>')).toBe(true)
  })

  it('returns false for no tag', () => {
    expect(hasDecideTag('no decision needed')).toBe(false)
  })

  it('detects legacy promise decide tag', () => {
    expect(hasDecideTag('<promise>DECIDE:Use REST?</promise>')).toBe(true)
  })
})

describe('extractBlockedReason', () => {
  it('extracts reason from blocked tag', () => {
    expect(extractBlockedReason('<blocked>npm install failed</blocked>')).toBe('npm install failed')
  })

  it('trims whitespace from reason', () => {
    expect(extractBlockedReason('<blocked>  spaces  </blocked>')).toBe('spaces')
  })

  it('returns default when no closing tag', () => {
    expect(extractBlockedReason('<blocked>no end')).toBe('Agent is blocked and needs human input.')
  })

  it('extracts reason from legacy promise blocked tag', () => {
    expect(extractBlockedReason('<promise>BLOCKED:Missing API key</promise>')).toBe(
      'Missing API key',
    )
  })
})

describe('extractDecideQuestion', () => {
  it('extracts question from decide tag', () => {
    expect(extractDecideQuestion('<decide>Use REST or GraphQL?</decide>')).toBe(
      'Use REST or GraphQL?',
    )
  })

  it('returns default when no closing tag', () => {
    expect(extractDecideQuestion('<decide>no end')).toBe('Agent needs a decision from you.')
  })

  it('extracts question from legacy promise decide tag', () => {
    expect(extractDecideQuestion('<promise>DECIDE:Use REST?</promise>')).toBe('Use REST?')
  })
})
