import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq, asc, desc } from 'drizzle-orm'
import { AuthScreen } from '@/components/auth-screen'
import { TodoApp } from '@/components/todo-app'
import { isPreviewTestLoginEnabled } from '@/lib/preview-login'
import { getUserProgress } from '@/lib/gamification-server'
import { toTaskView } from '@/lib/recurrence'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return <AuthScreen previewTestLogin={isPreviewTestLoginEnabled()} />

  const userTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, session.user.id))
    .orderBy(asc(tasks.completed), desc(tasks.createdAt))

  const progress = await getUserProgress(session.user.id)

  return <TodoApp initialTasks={userTasks.map(toTaskView)} userName={session.user.name} initialProgress={progress} />
}
