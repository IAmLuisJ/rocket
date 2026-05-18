import { useMemo, useState } from 'react'
import type { ProjectDashboard } from '../../../src/lib/desktop/projectService'
import type { Task } from '../../../src/lib/tasks/schema'

type Filter = 'all' | 'incomplete' | 'complete'

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

export function App() {
  const [dashboard, setDashboard] = useState<ProjectDashboard>(emptyDashboard)
  const [projectPath, setProjectPath] = useState('')
  const [filter, setFilter] = useState<Filter>('incomplete')
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [status, setStatus] = useState('Open a Rocket project to inspect tasks and loop state.')

  const visibleTasks = useMemo(() => {
    if (filter === 'complete') return dashboard.tasks.filter((task) => task.passes)
    if (filter === 'incomplete') return dashboard.tasks.filter((task) => !task.passes)
    return dashboard.tasks
  }, [dashboard.tasks, filter])

  const selectedTask =
    dashboard.tasks.find((task) => task.id === selectedTaskId) ?? visibleTasks[0] ?? null

  async function chooseProject() {
    const next = await window.rocket.chooseProject()
    if (!next) return
    setDashboard(next)
    setProjectPath(next.projectRoot)
    setSelectedTaskId(next.currentTask?.id ?? next.tasks.find((task) => !task.passes)?.id ?? null)
    setStatus(
      next.hasAgent ? `Loaded ${next.projectName}` : 'That folder is not a Rocket project yet.',
    )
  }

  async function loadProject() {
    if (!projectPath.trim()) return
    const next = await window.rocket.readProject(projectPath.trim())
    setDashboard(next)
    setSelectedTaskId(next.currentTask?.id ?? next.tasks.find((task) => !task.passes)?.id ?? null)
    setStatus(
      next.hasAgent ? `Loaded ${next.projectName}` : 'No .agent/tasks.json found in that folder.',
    )
  }

  async function toggleTask(task: Task) {
    const next = await window.rocket.setTaskPasses(dashboard.projectRoot, task.id, !task.passes)
    setDashboard(next)
    setSelectedTaskId(task.id)
    setStatus(`#${task.id} ${task.passes ? 'reopened' : 'marked complete'}.`)
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
            <button onClick={loadProject}>Load</button>
            <button className="primary" onClick={chooseProject}>
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
            {selectedTask ? (
              <>
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Focus</p>
                    <h2>#{selectedTask.id}</h2>
                  </div>
                  <button onClick={() => toggleTask(selectedTask)}>
                    {selectedTask.passes ? 'Reopen' : 'Complete'}
                  </button>
                </div>
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

function formatRuntime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
