/** Where a task sits horizontally once overlapping tasks are split into columns. */
export interface TaskLane {
  /** 0-based column index inside the task's overlap cluster. */
  lane: number
  /** How many columns that cluster was split into (1 = the task has the day column to itself). */
  laneCount: number
}

interface TaskSpan {
  id: string
  startMinute: number
  durationMinute: number
}

/**
 * Splits a day's tasks into side-by-side columns so overlapping ones stay
 * visible instead of covering each other.
 *
 * Tasks are grouped into "clusters" of transitively overlapping spans — a new
 * cluster starts at the first task beginning at or after every earlier task has
 * ended. Inside a cluster each task takes the leftmost column that is already
 * free at its start minute, and every task in the cluster reports the same
 * `laneCount`, so a cluster reads as one evenly divided block rather than
 * columns that shift width partway down.
 *
 * Touching tasks (09:00–10:00 and 10:00–11:00) do not overlap and stay full
 * width.
 */
export function computeTaskLanes(tasks: TaskSpan[]): Map<string, TaskLane> {
  const lanes = new Map<string, TaskLane>()

  // Earliest first; on a tie the longer task takes the left column, which keeps
  // an all-day-ish block on the left and its short overlappers stacked to the
  // right. `id` breaks the remaining ties so the layout is stable across
  // renders instead of following the incoming array order.
  const sorted = [...tasks].sort(
    (a, b) =>
      a.startMinute - b.startMinute ||
      b.durationMinute - a.durationMinute ||
      (a.id < b.id ? -1 : 1),
  )

  let cluster: string[] = []
  /** End minute of the task currently occupying each column of the open cluster. */
  let laneEnds: number[] = []
  let clusterEnd = -Infinity

  const closeCluster = () => {
    for (const id of cluster) lanes.get(id)!.laneCount = laneEnds.length
    cluster = []
    laneEnds = []
    clusterEnd = -Infinity
  }

  for (const task of sorted) {
    if (task.startMinute >= clusterEnd) closeCluster()

    const endMinute = task.startMinute + task.durationMinute
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= task.startMinute)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = endMinute

    // laneCount is a placeholder until the cluster closes and its width is known.
    lanes.set(task.id, { lane, laneCount: 1 })
    cluster.push(task.id)
    clusterEnd = Math.max(clusterEnd, endMinute)
  }
  closeCluster()

  return lanes
}
