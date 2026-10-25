import type { TrainingRow, TrainingStore } from '../../worker/src/training'

/** The training table in memory, for tests. */
export function memoryTraining(): TrainingStore & { rows: Map<string, TrainingRow> } {
  const rows = new Map<string, TrainingRow>()
  return {
    rows,
    async training(key) {
      return rows.get(key) ?? null
    },
    async claimTraining(key, title, created) {
      if (rows.has(key)) return false
      rows.set(key, { key, title, issue: null, shots: 0, created })
      return true
    },
    async setTrainingIssue(key, issue) {
      rows.get(key)!.issue = issue
    },
    async addTrainingShot(key) {
      rows.get(key)!.shots++
    },
    async dropTraining(key) {
      rows.delete(key)
    },
  }
}
