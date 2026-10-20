export type Quote = { text: string; author: string }

// Curated, attributed quotes. Append new entries at the end so earlier days keep their order.
export const quotes: readonly Quote[] = [
  { text: 'Well done is better than well said.', author: 'Benjamin Franklin' },
  { text: 'You don’t have to see the whole staircase, just take the first step.', author: 'Martin Luther King Jr.' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Will Durant' },
  { text: 'The journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: 'Nothing will work unless you do.', author: 'Maya Angelou' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'You have power over your mind, not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius' },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius' },
  { text: 'We suffer more often in imagination than in reality.', author: 'Seneca' },
  { text: 'It is not that we have a short time to live, but that we waste a lot of it.', author: 'Seneca' },
  { text: 'I learned that courage was not the absence of fear, but the triumph over it.', author: 'Nelson Mandela' },
  { text: 'Great things are done by a series of small things brought together.', author: 'Vincent van Gogh' },
  { text: 'Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.', author: 'Antoine de Saint-Exupéry' },
  { text: 'Knowing is not enough; we must apply. Willing is not enough; we must do.', author: 'Johann Wolfgang von Goethe' },
  { text: 'Things which matter most must never be at the mercy of things which matter least.', author: 'Johann Wolfgang von Goethe' },
  { text: 'Don’t watch the clock; do what it does. Keep going.', author: 'Sam Levenson' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: 'Energy and persistence conquer all things.', author: 'Benjamin Franklin' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'You can’t use up creativity. The more you use, the more you have.', author: 'Maya Angelou' },
  { text: 'Happiness is not something ready made. It comes from your own actions.', author: 'Dalai Lama' },
  { text: 'Start where you are. Use what you have. Do what you can.', author: 'Arthur Ashe' },
  { text: 'Fall seven times, stand up eight.', author: 'Japanese proverb' },
  { text: 'The beginning is the most important part of the work.', author: 'Plato' },
  { text: 'Nothing in life is to be feared, it is only to be understood.', author: 'Marie Curie' },
  { text: 'What you do makes a difference, and you have to decide what kind of difference you want to make.', author: 'Jane Goodall' },
  { text: 'Our greatest glory is not in never falling, but in rising every time we fall.', author: 'Oliver Goldsmith' },
  { text: 'Nothing great was ever achieved without enthusiasm.', author: 'Ralph Waldo Emerson' },
  { text: 'Do the thing and you shall have the power.', author: 'Ralph Waldo Emerson' },
  { text: 'Almost everything will work again if you unplug it for a few minutes, including you.', author: 'Anne Lamott' },
  { text: 'When we are no longer able to change a situation, we are challenged to change ourselves.', author: 'Viktor Frankl' },
  { text: 'Tell me, what is it you plan to do with your one wild and precious life?', author: 'Mary Oliver' },
  { text: 'You must do the thing you think you cannot do.', author: 'Eleanor Roosevelt' },
  { text: 'The most difficult thing is the decision to act, the rest is merely tenacity.', author: 'Amelia Earhart' },
  { text: 'A man who dares to waste one hour of time has not discovered the value of life.', author: 'Charles Darwin' },
  { text: 'No man is free who is not master of himself.', author: 'Epictetus' },
  { text: 'If one advances confidently in the direction of his dreams, and endeavors to live the life which he has imagined, he will meet with a success unexpected in common hours.', author: 'Henry David Thoreau' },
  { text: 'Lost time is never found again.', author: 'Benjamin Franklin' },
  { text: 'The unexamined life is not worth living.', author: 'Socrates' },
] as const

const MS_PER_DAY = 86_400_000

// Whole days since the Unix epoch for the *local* calendar date, so the value
// only changes at the viewer's local midnight and is independent of time of day.
export function localEpochDay(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY)
}

// Deterministic: the same local calendar date always yields the same quote.
export function getQuoteForDate(date: Date): Quote {
  return quotes[localEpochDay(date) % quotes.length]
}
