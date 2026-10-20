// Run with `pnpm test` (Node's built-in test runner).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addDays,
  computeStreaks,
  effectiveStreak,
  emptyProgress,
  isPlausibleLocalDate,
  isValidDateKey,
  levelFromXp,
  levelProgress,
  taskXp,
  unlockedAchievementIds,
  xpForLevel,
} from './gamification.ts'

test('taskXp: base, high priority and on-time bonuses', () => {
  assert.equal(taskXp({ priority: 'normal', dueDate: null, completedOn: '2026-01-05' }), 10)
  assert.equal(taskXp({ priority: 'high', dueDate: null, completedOn: '2026-01-05' }), 15)
  assert.equal(taskXp({ priority: 'low', dueDate: '2026-01-05', completedOn: '2026-01-05' }), 15)
  assert.equal(taskXp({ priority: 'low', dueDate: '2026-01-05', completedOn: '2026-01-06' }), 10)
  assert.equal(taskXp({ priority: 'high', dueDate: '2026-01-09', completedOn: '2026-01-05' }), 20)
})

test('xpForLevel follows 25 * n * (n - 1)', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(xpForLevel), [0, 50, 150, 300, 500])
})

test('levelFromXp is the inverse of xpForLevel at and around every threshold', () => {
  for (let level = 1; level <= 200; level++) {
    assert.equal(levelFromXp(xpForLevel(level)), level)
    if (level > 1) assert.equal(levelFromXp(xpForLevel(level) - 1), level - 1)
  }
  assert.equal(levelFromXp(0), 1)
  assert.equal(levelFromXp(-20), 1)
})

test('levelProgress reports position inside the level band', () => {
  const p = levelProgress(100)
  assert.equal(p.level, 2)
  assert.equal(p.xpIntoLevel, 50)
  assert.equal(p.xpForNextLevel, 100)
  assert.equal(p.xpToNext, 50)
  assert.equal(p.fraction, 0.5)
  assert.equal(levelProgress(0).fraction, 0)
})

test('date helpers', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01')
  assert.equal(addDays('2026-01-01', -1), '2025-12-31')
  assert.equal(isValidDateKey('2026-02-30'), false)
  assert.equal(isValidDateKey('2026-2-3'), false)
  assert.equal(isValidDateKey('2026-02-03'), true)
})

test('isPlausibleLocalDate allows one day either side of UTC only', () => {
  const now = new Date('2026-06-10T23:30:00Z')
  assert.equal(isPlausibleLocalDate('2026-06-09', now), true)
  assert.equal(isPlausibleLocalDate('2026-06-10', now), true)
  assert.equal(isPlausibleLocalDate('2026-06-11', now), true)
  assert.equal(isPlausibleLocalDate('2026-06-12', now), false)
  assert.equal(isPlausibleLocalDate('2026-06-08', now), false)
})

test('computeStreaks', () => {
  assert.deepEqual(computeStreaks([]), { currentStreak: 0, bestStreak: 0, lastActiveDate: null })
  assert.deepEqual(computeStreaks(['2026-03-01', '2026-03-01']), { currentStreak: 1, bestStreak: 1, lastActiveDate: '2026-03-01' })
  // Crosses a month boundary; unsorted with duplicates.
  assert.deepEqual(computeStreaks(['2026-03-01', '2026-02-27', '2026-02-28', '2026-02-28']), {
    currentStreak: 3,
    bestStreak: 3,
    lastActiveDate: '2026-03-01',
  })
  // Best run is in the past, current run is shorter.
  assert.deepEqual(computeStreaks(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-10', '2026-01-11']), {
    currentStreak: 2,
    bestStreak: 3,
    lastActiveDate: '2026-01-11',
  })
})

test('effectiveStreak lapses only after a full missed day', () => {
  const stats = { currentStreak: 4, lastActiveDate: '2026-03-10' }
  assert.equal(effectiveStreak(stats, '2026-03-10'), 4)
  assert.equal(effectiveStreak(stats, '2026-03-11'), 4)
  assert.equal(effectiveStreak(stats, '2026-03-12'), 0)
  assert.equal(effectiveStreak({ currentStreak: 0, lastActiveDate: null }, '2026-03-12'), 0)
})

test('achievements unlock from progress', () => {
  assert.deepEqual(unlockedAchievementIds(emptyProgress), [])
  assert.deepEqual(unlockedAchievementIds({ ...emptyProgress, tasksCompleted: 10, bestStreak: 7 }), [
    'first-task',
    'ten-tasks',
    'seven-day-streak',
  ])
})
