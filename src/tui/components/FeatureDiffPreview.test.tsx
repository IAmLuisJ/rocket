import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'
import { FeatureDiffPreview } from './FeatureDiffPreview.js'

describe('FeatureDiffPreview', () => {
  it('renders PRD changes, new tasks, and action labels', () => {
    const { lastFrame } = render(
      <FeatureDiffPreview
        specMarkdown={'## Feature\nAdd dark mode.'}
        tasks={[
          {
            title: 'Build toggle',
            description: 'desc',
            category: 'ui-ux',
            passes: false,
            passCondition: 'toggle works',
          },
        ]}
        onConfirm={vi.fn()}
      />,
    )

    const frame = lastFrame()!
    expect(frame).toContain('+ ## Feature')
    expect(frame).toContain('#1 Build toggle')
    expect(frame).toContain('Yes')
    expect(frame).toContain('Edit')
    expect(frame).toContain('Cancel')
  })
})
