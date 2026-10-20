import { eq, like, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tasks, user } from '@/lib/db/schema'

// Persistence without a schema change, shared by the games that keep per-player data. Each player gets one reserved
// row per game in the existing `tasks` table:
//   id          '<prefix><user id>'  (primary key, so there is at most one row per player and game)
//   userId      '<prefix><user id>'  (NOT the player's own id, so every todo query, which filters on the signed-in
//                                     user's id, never sees or touches it; tasks.userId has no foreign key)
//   title       a fixed label
//   description JSON payload, owned by the game that uses the prefix
// Nothing else in the app reads these rows; the leaderboard reads only rows whose id starts with the prefix.
//
// Each prefix ends in ':' and no two prefixes start the same way, so games never see each other's rows.
export type ReservedRows<T> = {
  // The player's payload (the empty payload when they have no row yet).
  read(userId: string): Promise<T>
  // Read-modify-write under a row lock. `change` returns the new payload, or null to leave the stored one alone.
  // Returns whether anything was written. Concurrent calls for the same player serialize, so a change decided from
  // the current value (e.g. "only keep a better score") can never be overwritten by one decided from a stale value.
  modify(userId: string, change: (current: T) => T | null): Promise<boolean>
  // Every player's payload with their display fields, for building a leaderboard.
  readAll(): Promise<{ userId: string; name: string; email: string; payload: T }[]>
}

export function reservedRows<T>(options: { prefix: string; title: string; empty: () => T; parse: (text: string | null) => T }): ReservedRows<T> {
  const { prefix, title, empty, parse } = options
  const rowId = (userId: string) => prefix + userId

  return {
    async read(userId) {
      const [row] = await db.select({ description: tasks.description }).from(tasks).where(eq(tasks.id, rowId(userId))).limit(1)
      return parse(row?.description ?? null)
    },

    // The row is created if needed (INSERT ... ON CONFLICT DO NOTHING) and then locked (SELECT ... FOR UPDATE).
    modify(userId, change) {
      const id = rowId(userId)
      return db.transaction(async (tx) => {
        await tx
          .insert(tasks)
          .values({ id, userId: id, title, description: JSON.stringify(empty()), completed: true })
          .onConflictDoNothing({ target: tasks.id })
        const [row] = await tx.select({ description: tasks.description }).from(tasks).where(eq(tasks.id, id)).for('update')
        const next = change(parse(row?.description ?? null))
        if (next === null) return false
        await tx.update(tasks).set({ description: JSON.stringify(next), updatedAt: sql`now()` }).where(eq(tasks.id, id))
        return true
      })
    },

    async readAll() {
      const rows = await db
        .select({ userId: user.id, name: user.name, email: user.email, description: tasks.description })
        .from(tasks)
        .innerJoin(user, sql`${tasks.id} = ${prefix} || ${user.id}`)
        .where(like(tasks.id, `${prefix}%`))
      return rows.map((row) => ({ userId: row.userId, name: row.name, email: row.email, payload: parse(row.description) }))
    },
  }
}
