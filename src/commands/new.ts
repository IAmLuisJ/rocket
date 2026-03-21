import React from 'react'
import { render } from 'ink'
import { NewProjectWizard } from '../tui/components/NewProjectWizard.js'

export async function runNew(
  projectName: string | undefined,
  opts: { type?: string },
): Promise<void> {
  const { waitUntilExit } = render(
    React.createElement(NewProjectWizard, { initialName: projectName, initialType: opts.type }),
  )
  await waitUntilExit()
}
