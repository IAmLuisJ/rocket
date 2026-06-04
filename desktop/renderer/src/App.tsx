import { useEffect, useMemo, useState } from 'react'
import type { ProjectContext, ProjectDashboard } from '../../../src/lib/desktop/projectService'
import type { RecentProject } from '../../../src/lib/desktop/recentProjects'
import type { Task, TaskCategory } from '../../../src/lib/tasks/schema'

type Filter = 'all' | 'incomplete' | 'complete'
type BackendName = 'copilot' | 'claude' | 'docker'
type DetailView = 'task' | 'context'
type TaskDraft = Pick<Task, 'title' | 'description' | 'category' | 'passCondition'>

const taskCategories: TaskCategory[] = [
  'config',
  'functional',
  'ui-ux',
  'data-model',
  'api-endpoint',
  'integration',
  'security',
  'testing',
  'docs',
]

const emptyDashboard: ProjectDashboard = {
  projectRoot: '',
  projectName: 'No project',
  hasAgent: false,
  tasks: [],
  progress: { overall: { complete: 0, total: 0, percent: 0 }, byCategory: {} },
  activity: [],
  history: { sessionCount: 0, totalRuntimeSeconds: 0 },
  currentTask: null,
}

const emptyContext: ProjectContext = {
  hasAgent: false,
  prdMarkdown: '',
  summaryMarkdown: '',
}

export function App() {
  const hasDesktopBridge = Boolean(window.rocket)
  const [dashboard, setDashboard] = useState<ProjectDashboard>(emptyDashboard)
  const [projectPath, setProjectPath] = useState('')
  const [filter, setFilter] = useState<Filter>('incomplete')
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [status, setStatus] = useState(
    hasDesktopBridge
      ? 'Open a Rocket project to inspect tasks and loop state.'
      : 'Rocket desktop bridge is unavailable in browser preview.',
  )
  const [backendName, setBackendName] = useState<BackendName>('copilot')
  const [maxIterations, setMaxIterations] = useState(1)
  const [loopRunning, setLoopRunning] = useState(false)
  const [loopLines, setLoopLines] = useState<string[]>([])
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [editingTask, setEditingTask] = useState(false)
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null)
  const [detailView, setDetailView] = useState<DetailView>('task')
  const [projectContext, setProjectContext] = useState<ProjectContext>(emptyContext)

  const visibleTasks = useMemo(() => {
    if (filter === 'complete') return dashboard.tasks.filter((task) => task.passes)
    if (filter === 'incomplete') return dashboard.tasks.filter((task) => !task.passes)
    return dashboard.tasks
  }, [dashboard.tasks, filter])

  const selectedTask =
    dashboard.tasks.find((task) => task.id === selectedTaskId) ?? visibleTasks[0] ?? null

  useEffect(() => {
    setEditingTask(false)
    setTaskDraft(selectedTask ? toTaskDraft(selectedTask) : null)
  }, [selectedTask])

  useEffect(() => {
    if (!window.rocket?.onLoopEvent) return
    return window.rocket.onLoopEvent((event) => {
      if (event.type === 'started') {
        setLoopRunning(true)
        setLoopLines([`Started ${event.backendName}${event.taskId ? ` on #${event.taskId}` : ''}`])
      } else if (event.type === 'output') {
        setLoopLines((lines) => [...lines.slice(-80), event.line])
      } else if (event.type === 'timing') {
        setLoopLines((lines) => [
          ...lines.slice(-80),
          `Iteration ${event.iterationN} finished in ${Math.round(event.elapsedMs / 1000)}s`,
        ])
      } else if (event.type === 'finished') {
        setDashboard(event.dashboard)
        setLoopRunning(false)
        setStatus('Loop finished. Dashboard refreshed.')
      } else if (event.type === 'error') {
        setLoopRunning(false)
        setStatus(event.message)
      } else {
        setLoopLines((lines) => [...lines.slice(-80), `Loop event: ${event.type}`])
      }
    })
  }, [])

  useEffect(() => {
    void refreshRecentProjects()
  }, [])

  async function chooseProject() {
    if (!window.rocket) {
      setStatus('Open Rocket Desktop to choose a project from disk.')
      return
    }

    const next = await window.rocket.chooseProject()
    if (!next) return
    setDashboard(next)
    setProjectPath(next.projectRoot)
    setSelectedTaskId(next.currentTask?.id ?? next.tasks.find((task) => !task.passes)?.id ?? null)
    setStatus(
      next.hasAgent ? `Loaded ${next.projectName}` : 'That folder is not a Rocket project yet.',
    )
    await refreshProjectContext(next)
    await refreshRecentProjects()
  }

  async function loadProject() {
    if (!window.rocket) {
      setStatus('Open Rocket Desktop to load projects from disk.')
      return
    }
    if (!projectPath.trim()) return
    const next = await window.rocket.readProject(projectPath.trim())
    setDashboard(next)
    setSelectedTaskId(next.currentTask?.id ?? next.tasks.find((task) => !task.passes)?.id ?? null)
    setStatus(
      next.hasAgent ? `Loaded ${next.projectName}` : 'No .agent/tasks.json found in that folder.',
    )
    await refreshProjectContext(next)
    await refreshRecentProjects()
  }

  async function toggleTask(task: Task) {
    if (!window.rocket) {
      setStatus('Open Rocket Desktop to update tasks.')
      return
    }

    const next = await window.rocket.setTaskPasses(dashboard.projectRoot, task.id, !task.passes)
    setDashboard(next)
    setSelectedTaskId(task.id)
    setStatus(`#${task.id} ${task.passes ? 'reopened' : 'marked complete'}.`)
  }

  async function saveTaskDetails() {
    if (!window.rocket) {
      setStatus('Open Rocket Desktop to update tasks.')
      return
    }
    if (!selectedTask || !taskDraft) return

    try {
      const next = await window.rocket.setTaskDetails(
        dashboard.projectRoot,
        selectedTask.id,
        taskDraft,
      )
      setDashboard(next)
      setSelectedTaskId(selectedTask.id)
      setEditingTask(false)
      setStatus(`#${selectedTask.id} updated.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    }
  }

  async function startLoop(taskId: number | null) {
    if (!window.rocket) {
      setStatus('Open Rocket Desktop to run the loop harness.')
      return
    }

    if (!dashboard.hasAgent) {
      setStatus('Open a Rocket project before starting a loop.')
      return
    }

    setLoopLines([])
    const result = await window.rocket.startLoop({
      projectRoot: dashboard.projectRoot,
      backendName,
      maxIterations,
      taskId,
    })
    setStatus(result.message)
    if (result.ok) setLoopRunning(true)
  }

  async function stopLoop() {
    if (!window.rocket) {
      setStatus('Open Rocket Desktop to control the loop harness.')
      return
    }

    const result = await window.rocket.stopLoop()
    setStatus(result.message)
  }

  async function openRecentProject(projectRoot: string) {
    if (!window.rocket) {
      setStatus('Open Rocket Desktop to load recent projects.')
      return
    }

    const next = await window.rocket.readProject(projectRoot)
    setDashboard(next)
    setProjectPath(next.projectRoot)
    setSelectedTaskId(next.currentTask?.id ?? next.tasks.find((task) => !task.passes)?.id ?? null)
    setStatus(
      next.hasAgent ? `Loaded ${next.projectName}` : 'Recent project is missing Rocket files.',
    )
    await refreshProjectContext(next)
    await refreshRecentProjects()
  }

  async function refreshProjectContext(nextDashboard = dashboard) {
    if (!window.rocket || !nextDashboard.hasAgent) {
      setProjectContext(emptyContext)
      return
    }
    setProjectContext(await window.rocket.readProjectContext(nextDashboard.projectRoot))
  }

  async function refreshRecentProjects() {
    if (!window.rocket) return
    setRecentProjects(await window.rocket.recentProjects())
  }

  return (
    <main className="app-shell">
      <aside className="rail">
        <div className="brand-mark">R</div>
        <nav aria-label="Primary">
          <button className="rail-button active" title="Dashboard">
            ⌁
          </button>
          <button className="rail-button" title="Tasks">
            ✓
          </button>
          <button className="rail-button" title="Loop">
            ▶
          </button>
        </nav>
        <div className="recent-rail" aria-label="Recent projects">
          {recentProjects.map((project) => (
            <button
              key={project.projectRoot}
              className="recent-project-button"
              title={project.projectRoot}
              onClick={() => openRecentProject(project.projectRoot)}
            >
              {project.projectName.slice(0, 2).toUpperCase()}
            </button>
          ))}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Rocket Desktop</p>
            <h1>{dashboard.projectName}</h1>
          </div>
          <div className="project-controls">
            <input
              value={projectPath}
              onChange={(event) => setProjectPath(event.target.value)}
              placeholder="/path/to/rocket/project"
              aria-label="Project path"
            />
            <button onClick={loadProject} disabled={!hasDesktopBridge}>
              Load
            </button>
            <button className="primary" onClick={chooseProject} disabled={!hasDesktopBridge}>
              Open
            </button>
          </div>
        </header>

        <section className="summary-strip" aria-label="Project summary">
          <Metric label="Complete" value={`${dashboard.progress.overall.percent}%`} />
          <Metric
            label="Tasks"
            value={`${dashboard.progress.overall.complete}/${dashboard.progress.overall.total}`}
          />
          <Metric label="Sessions" value={String(dashboard.history.sessionCount)} />
          <Metric label="Runtime" value={formatRuntime(dashboard.history.totalRuntimeSeconds)} />
        </section>

        <section className="main-grid">
          <section className="task-panel" aria-label="Tasks">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Queue</p>
                <h2>Tasks</h2>
              </div>
              <div className="segmented" aria-label="Task filter">
                {(['incomplete', 'all', 'complete'] as const).map((item) => (
                  <button
                    key={item}
                    className={filter === item ? 'selected' : ''}
                    onClick={() => setFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="task-list">
              {visibleTasks.length === 0 ? (
                <div className="empty-state">
                  {dashboard.hasAgent ? 'No tasks match this filter.' : 'Open a Rocket project.'}
                </div>
              ) : (
                visibleTasks.map((task) => (
                  <button
                    key={task.id}
                    className={`task-row ${selectedTask?.id === task.id ? 'current' : ''}`}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <span className={task.passes ? 'status-dot done' : 'status-dot'} />
                    <span className="task-id">#{task.id}</span>
                    <span className="task-title">{task.title}</span>
                    <span className="task-category">{task.category}</span>
                  </button>
                ))
              )}
            </div>
          </section>

          <aside className="detail-panel" aria-label="Task detail">
            <section className="loop-controls" aria-label="Loop controls">
              <div>
                <p className="eyebrow">Harness</p>
                <h2>Run Loop</h2>
              </div>
              <label>
                Backend
                <select
                  value={backendName}
                  onChange={(event) => setBackendName(event.target.value as BackendName)}
                  disabled={loopRunning}
                >
                  <option value="copilot">Copilot</option>
                  <option value="claude">Claude</option>
                  <option value="docker">Docker</option>
                </select>
              </label>
              <label>
                Iterations
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={maxIterations}
                  onChange={(event) => setMaxIterations(Math.max(1, Number(event.target.value)))}
                  disabled={loopRunning}
                />
              </label>
              <div className="loop-actions">
                <button
                  disabled={!hasDesktopBridge || loopRunning || !selectedTask}
                  onClick={() => startLoop(selectedTask?.id ?? null)}
                >
                  Run Selected
                </button>
                <button disabled={!hasDesktopBridge || loopRunning} onClick={() => startLoop(null)}>
                  Run Next
                </button>
                <button disabled={!hasDesktopBridge || !loopRunning} onClick={stopLoop}>
                  Stop
                </button>
              </div>
            </section>

            <div className="detail-switch" aria-label="Detail view">
              {(['task', 'context'] as const).map((item) => (
                <button
                  key={item}
                  className={detailView === item ? 'selected' : ''}
                  onClick={() => setDetailView(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {detailView === 'context' ? (
              <ProjectContextPanel context={projectContext} />
            ) : selectedTask ? (
              <>
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Focus</p>
                    <h2>#{selectedTask.id}</h2>
                  </div>
                  <div className="detail-actions">
                    {editingTask ? (
                      <>
                        <button onClick={() => setEditingTask(false)}>Cancel</button>
                        <button className="primary" onClick={saveTaskDetails}>
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setTaskDraft(toTaskDraft(selectedTask))
                            setEditingTask(true)
                          }}
                        >
                          Edit
                        </button>
                        <button onClick={() => toggleTask(selectedTask)}>
                          {selectedTask.passes ? 'Reopen' : 'Complete'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {editingTask && taskDraft ? (
                  <div className="task-editor">
                    <label>
                      Title
                      <input
                        value={taskDraft.title}
                        onChange={(event) =>
                          setTaskDraft({ ...taskDraft, title: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        value={taskDraft.description}
                        onChange={(event) =>
                          setTaskDraft({ ...taskDraft, description: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Category
                      <select
                        value={taskDraft.category}
                        onChange={(event) =>
                          setTaskDraft({
                            ...taskDraft,
                            category: event.target.value as TaskCategory,
                          })
                        }
                      >
                        {taskCategories.map((category) => (
                          <option value={category} key={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Pass Condition
                      <textarea
                        value={taskDraft.passCondition}
                        onChange={(event) =>
                          setTaskDraft({ ...taskDraft, passCondition: event.target.value })
                        }
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    <h3>{selectedTask.title}</h3>
                    <p>{selectedTask.description}</p>
                    <dl>
                      <div>
                        <dt>Category</dt>
                        <dd>{selectedTask.category}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{selectedTask.passes ? 'Complete' : 'Pending'}</dd>
                      </div>
                      <div>
                        <dt>Pass Condition</dt>
                        <dd>{selectedTask.passCondition}</dd>
                      </div>
                    </dl>
                  </>
                )}
              </>
            ) : (
              <div className="empty-state">Select a task to see implementation details.</div>
            )}

            <div className="activity">
              <p className="eyebrow">Recent Activity</p>
              {dashboard.activity.length === 0 ? (
                <p className="muted">No loop activity yet.</p>
              ) : (
                dashboard.activity.slice(-5).map((entry, index) => (
                  <div className="activity-row" key={`${entry.taskId ?? 'auto'}-${index}`}>
                    <span>{entry.outcome === 'complete' ? '✓' : '↻'}</span>
                    <span>{entry.taskId ? `#${entry.taskId}` : 'Auto'}</span>
                    <span>{entry.taskTitle ?? entry.outcome}</span>
                  </div>
                ))
              )}
            </div>

            <div className="loop-output">
              <p className="eyebrow">Loop Output</p>
              {loopLines.length === 0 ? (
                <p className="muted">Output from the active loop appears here.</p>
              ) : (
                <pre>{loopLines.join('\n')}</pre>
              )}
            </div>
          </aside>
        </section>

        <footer className="status-line">{status}</footer>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ProjectContextPanel({ context }: { context: ProjectContext }) {
  return (
    <section className="context-panel" aria-label="Project context">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Context</p>
          <h2>PRD</h2>
        </div>
      </div>
      {!context.hasAgent ? (
        <div className="empty-state">Open a Rocket project to read its PRD and summary.</div>
      ) : (
        <div className="context-sections">
          <article>
            <h3>Summary</h3>
            <MarkdownBlock value={context.summaryMarkdown || 'No SUMMARY.md content found.'} />
          </article>
          <article>
            <h3>Product Requirements</h3>
            <MarkdownBlock value={context.prdMarkdown || 'No PRD.md content found.'} />
          </article>
        </div>
      )}
    </section>
  )
}

function MarkdownBlock({ value }: { value: string }) {
  return <pre className="markdown-block">{value}</pre>
}

function formatRuntime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function toTaskDraft(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    category: task.category,
    passCondition: task.passCondition,
  }
}
