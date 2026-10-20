// Content and selection logic for the card shown when a task is completed.
// Jokes are bundled so the celebration works offline. The panda GIFs are
// self-hosted under /public/pandas, so they render without any third-party
// request (and under any future Content-Security-Policy `img-src 'self'`).

export type Celebration = {
  /** Unique per celebration so React remounts the card and restarts its timers. */
  id: number
  taskId: string
  taskTitle: string
  joke: Joke
  panda: PandaGif
}

export type Joke = { setup: string; punchline: string }

export type PandaGif = {
  /** Animated GIF. */
  src: string
  /** Still frame, used when the visitor prefers reduced motion. */
  still: string
  alt: string
}

export const JOKES: readonly Joke[] = [
  { setup: 'Why did the panda get kicked out of the restaurant?', punchline: 'He eats, shoots and leaves.' },
  { setup: 'What do you call a bear with no teeth?', punchline: 'A gummy bear.' },
  { setup: 'Why don’t scientists trust atoms?', punchline: 'Because they make up everything.' },
  { setup: 'What did the zero say to the eight?', punchline: 'Nice belt.' },
  { setup: 'Why did the scarecrow win an award?', punchline: 'He was outstanding in his field.' },
  { setup: 'I told my computer I needed a break.', punchline: 'Now it won’t stop sending me Kit Kat ads.' },
  { setup: 'What do you call fake spaghetti?', punchline: 'An impasta.' },
  { setup: 'Why did the bicycle fall over?', punchline: 'It was two tired.' },
  { setup: 'What’s a panda’s favorite kind of music?', punchline: 'Bamboo-gie woogie.' },
  { setup: 'How does a penguin build its house?', punchline: 'Igloos it together.' },
  { setup: 'Why did the math book look so sad?', punchline: 'It had too many problems.' },
  { setup: 'What do you call a fish wearing a bowtie?', punchline: 'Sofishticated.' },
  { setup: 'Why can’t you give Elsa a balloon?', punchline: 'Because she’ll let it go.' },
  { setup: 'What did the ocean say to the beach?', punchline: 'Nothing, it just waved.' },
  { setup: 'Why did the cookie go to the doctor?', punchline: 'It felt crumby.' },
  { setup: 'Why did the panda cross the road?', punchline: 'To get to the bamboo store on the other side.' },
  { setup: 'Why did the coffee file a police report?', punchline: 'It got mugged.' },
  { setup: 'What do you call cheese that isn’t yours?', punchline: 'Nacho cheese.' },
  { setup: 'Why did the golfer bring two pairs of pants?', punchline: 'In case he got a hole in one.' },
  { setup: 'What’s black, white, and red all over?', punchline: 'A panda with a sunburn.' },
  { setup: 'Why do bees have sticky hair?', punchline: 'Because they use honeycombs.' },
  { setup: 'How do you organize a space party?', punchline: 'You planet.' },
  { setup: 'What did one wall say to the other?', punchline: 'I’ll meet you at the corner.' },
  { setup: 'Why was the to-do list so calm?', punchline: 'It knew everything would get checked off eventually.' },
  { setup: 'What do you call a sleeping panda?', punchline: 'A bamboo-zzzzzer.' },
]

export const PANDA_GIFS: readonly PandaGif[] = [
  { src: '/pandas/jump.gif', still: '/pandas/jump-still.png', alt: 'A cartoon panda jumping for joy as confetti falls' },
  { src: '/pandas/wave.gif', still: '/pandas/wave-still.png', alt: 'A cartoon panda waving hello among twinkling stars' },
  { src: '/pandas/roll.gif', still: '/pandas/roll-still.png', alt: 'A cartoon panda rocking side to side and celebrating' },
]

function pickIndex(length: number, previous: number, random: () => number) {
  if (length <= 1) return 0
  // Draw from the other length-1 entries so the same item never shows twice in a row.
  const index = Math.floor(random() * (length - 1))
  return index >= previous ? index + 1 : index
}

export type CelebrationHistory = { joke: number; panda: number }

/** Picks a random joke and panda, never repeating the previous pick of either. */
export function pickCelebration(
  previous: CelebrationHistory = { joke: -1, panda: -1 },
  random: () => number = Math.random,
): { joke: Joke; panda: PandaGif; history: CelebrationHistory } {
  const joke = pickIndex(JOKES.length, previous.joke, random)
  const panda = pickIndex(PANDA_GIFS.length, previous.panda, random)
  return { joke: JOKES[joke], panda: PANDA_GIFS[panda], history: { joke, panda } }
}
