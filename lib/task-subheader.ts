// Greeting subheader for the dashboard. The more open tasks there are, the more
// it teases. Deterministic (variant chosen by count) so server and client render
// the same text.

const pick = (count: number, variants: string[]) => variants[count % variants.length]

export function getTaskSubheader(count: number): string {
  const n = Math.max(0, Math.floor(count))
  const things = n === 1 ? 'thing' : 'things'

  if (n === 0) {
    return pick(n, [
      'Nothing on your list. Suspiciously calm. Did you actually finish everything?',
      'Zero tasks. Enjoy it, or add something before it gets weird.',
    ])
  }
  if (n === 1) {
    return pick(n, [
      'You have 1 thing on your list. One. You could do it before your coffee cools.',
      'Just 1 thing on your list. No excuses, but also no pressure.',
    ])
  }
  if (n <= 3) {
    return pick(n, [
      `You have ${n} ${things} on your list. Very manageable. Try not to make it a personality.`,
      `${n} ${things} on your list. That’s barely a to-do list. You’ve got this.`,
    ])
  }
  if (n <= 6) {
    return pick(n, [
      `You have ${n} ${things} on your list. Respectable. Nobody’s checking them off by staring at them.`,
      `${n} ${things} on your list. Not bad, but they won’t finish themselves.`,
      `${n} ${things} to do. The list is starting to notice you’re not moving.`,
    ])
  }
  if (n <= 10) {
    return pick(n, [
      `${n} ${things} on your list. Bold of you to open this app and not start.`,
      `You have ${n} ${things} on your list. Future you is already composing a strongly worded email.`,
      `${n} ${things} to do. That’s a lot of “I’ll get to it.”`,
    ])
  }
  return pick(n, [
    `${n} ${things} on your list. At this point it’s less a list and more a lifestyle.`,
    `${n} ${things}?! Your list has its own zip code. Pick one and start.`,
    `You have ${n} ${things} on your list. Impressive commitment to optimism, not so much to finishing.`,
  ])
}
