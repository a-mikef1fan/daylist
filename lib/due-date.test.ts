import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isValidDueDate } from './due-date.ts'

test('accepts a well-formed date from <input type="date">', () => {
  assert.equal(isValidDueDate('2026-10-15'), true)
  assert.equal(isValidDueDate('2028-02-29'), true)
})

test('rejects impossible calendar dates', () => {
  assert.equal(isValidDueDate('2026-02-30'), false)
  assert.equal(isValidDueDate('2026-13-01'), false)
})

test('rejects malformed values', () => {
  for (const value of ['', '10/15/2026', '2026-1-5', '2026-10-15T00:00:00Z', '\\d{4}', null, 20261015]) {
    assert.equal(isValidDueDate(value), false, String(value))
  }
})
