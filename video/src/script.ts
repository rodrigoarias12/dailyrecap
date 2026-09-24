/**
 * The script is the contract between the agent and the renderer. The agent writes it
 * (after the team approved the text, when approval applies), the renderer only reads it.
 * Everything a viewer sees or hears is in here; nothing is decided at render time.
 * scripts/render.mjs validates it before rendering and refuses anything off-schema.
 */
export const FPS = 30;

export type Brand = {
  name: string;
  /** Shown on the closing card, e.g. "acme.com". */
  url: string;
  /** The action color. Always used as a BACKGROUND with `ink` text on top, never as text. */
  accent: string;
  /** Text color on light backgrounds; the dark background of title scenes. */
  ink: string;
  /** Page background for light scenes. */
  bg: string;
  /** Optional logo under public/, e.g. "screens/acme/logo.png". */
  logo?: string;
};

export type Focus = { x: number; y: number; w: number; h: number };

/** Every scene may carry `voice`: one spoken sentence. The render narrates it and ducks the music. */
export type Scene =
  /** Big statement on a dark, slowly moving background. Opens the video or lands a point. */
  | { type: 'title'; label?: string; text: string; seconds: number; voice?: string }
  /** A full-bleed image (screenshot or photo) with the statement over it. The scene people remember. */
  | { type: 'cover'; image: string; label?: string; text: string; seconds: number; voice?: string }
  /** A real screenshot with the camera moving to the part that matters. `focus` in fractions of the image. */
  | { type: 'screen'; image: string; focus: Focus; zoom?: number; label: string; text: string; seconds: number; voice?: string }
  /** Short capabilities appearing one by one. Three to five, never more. */
  | { type: 'chips'; label: string; items: string[]; seconds: number; voice?: string }
  /** Up to four numbers with a claim each. A number without a source is the first thing people discount. */
  | { type: 'numbers'; label: string; items: { value: string; claim: string; source?: string }[]; seconds: number; voice?: string }
  /** What happened: commits, merged PRs, meetings, decisions. Up to six rows, each with a tag (time, PR number, repo). */
  | { type: 'events'; label: string; items: { tag: string; text: string; who?: string }[]; seconds: number; voice?: string }
  /** One number that moved today, with where it came from. `delta` is free text such as "+12 since Monday". */
  | { type: 'metric'; label: string; value: string; delta?: string; up?: boolean; source: string; seconds: number; voice?: string }
  /** Something a teammate said, with their name. Their words, not a paraphrase. */
  | { type: 'quote'; text: string; who: string; seconds: number; voice?: string }
  /** What is next: tomorrow's meetings, deadlines, releases. Up to five rows. */
  | { type: 'agenda'; label: string; items: { when: string; text: string }[]; seconds: number; voice?: string }
  /** Brand, URL and the call to action, on the accent color. */
  | { type: 'closing'; cta: string; seconds: number; voice?: string };

/** One spoken line. `words` carries the engine's word timings (seconds from the clip's start) for captions. */
export type Narration = { file: string; at: number; seconds: number; text: string; words?: { w: string; s: number; e: number }[] };

export type Script = {
  brand: Brand;
  /** 16:9 for the launch video and the internal recap, 9:16 for the public clip. Default landscape. */
  format?: 'landscape' | 'portrait';
  /** Language of the voice lines, e.g. "en" or "es". Picks the default voice. */
  lang?: string;
  /** A specific voice id for the narration engine (edge-tts or ElevenLabs). */
  voiceId?: string;
  scenes: Scene[];
  /** Filled by scripts/narrate.mjs. Times in seconds from the start of the video. */
  narration?: Narration[];
  /** Path under public/ to the music bed, or false for silence. scripts/render.mjs synthesizes it when missing. */
  music?: string | false;
  /** Set to false to drop the small "made with DailyRecap" line on the closing card. */
  credit?: boolean;
  /**
   * Captions that light up with the voice. Default: on for portrait (watched on a phone,
   * usually muted), off for landscape (the scenes already carry their text; a caption under
   * a headline is two texts competing). Set explicitly to override.
   */
  captions?: boolean;
};

export const frames = (seconds: number) => Math.round(seconds * FPS);

/** Where each scene starts, in frames. */
export function sceneStarts(script: Script): number[] {
  const starts: number[] = [];
  let acc = 0;
  for (const s of script.scenes) {
    starts.push(acc);
    acc += frames(s.seconds);
  }
  return starts;
}

export function totalFrames(script: Script): number {
  return script.scenes.reduce((a, s) => a + frames(s.seconds), 0);
}

const ACME: Brand = { name: 'Acme Ops', url: 'acmeops.dev', accent: '#a0e099', ink: '#20291f', bg: '#f8faf7' };

/** The launch video: what the product is, for whom, what it does. */
export const EXAMPLE: Script = {
  brand: ACME,
  lang: 'en',
  music: 'audio/music-launch.mp3',
  scenes: [
    { type: 'title', label: 'For warehouse teams', text: 'Every order, one screen.', seconds: 3.5, voice: 'Acme Ops puts every order on one screen.' },
    { type: 'screen', image: 'screens/example/board.png', focus: { x: 0.06, y: 0.2, w: 0.5, h: 0.32 }, label: 'Live', text: 'Orders update as they move.', seconds: 5, voice: 'Orders update as they move through the warehouse.' },
    { type: 'chips', label: 'What it does', items: ['Picks and packs', 'Flags shortages', 'Reports at 6 pm'], seconds: 5, voice: 'It picks and packs, flags shortages, and reports at six.' },
    { type: 'numbers', label: 'In production', items: [{ value: '3x', claim: 'faster picking', source: 'pilot, 8 weeks' }, { value: '0', claim: 'lost orders' }, { value: '12', claim: 'warehouses' }], seconds: 5, voice: 'Three times faster picking, zero lost orders, twelve warehouses.' },
    { type: 'closing', cta: 'Start free at acmeops.dev', seconds: 4.5, voice: 'Start free at acme ops dot dev.' },
  ],
};

/** The daily recap: what happened today, from the data, for the team. */
export const RECAP: Script = {
  brand: ACME,
  lang: 'en',
  music: 'audio/music-recap.mp3',
  credit: false,
  scenes: [
    { type: 'cover', image: 'screens/example/board.png', label: 'Acme Ops · Tuesday, September 23', text: 'Three PRs merged. One customer went live.', seconds: 4.5, voice: 'Tuesday at Acme Ops: three PRs merged and one customer went live.' },
    { type: 'events', label: 'Shipped', items: [
      { tag: 'PR #212', text: 'Shortage alerts go out by WhatsApp', who: 'Lu' },
      { tag: 'PR #214', text: 'Pick list sorted by aisle', who: 'Marco' },
      { tag: 'PR #215', text: 'Fix: duplicate orders on retry', who: 'Lu' },
      { tag: 'support', text: '31 tickets closed, 2 escalated to Marco', who: 'Ana (agent)' },
      { tag: 'sales', text: '12 demos booked, reported, not verified', who: 'Sam (agent)' },
    ], seconds: 8, voice: 'Lu shipped shortage alerts by WhatsApp and a fix for duplicate orders. Marco sorted the pick list by aisle. Support closed thirty-one tickets. Sales reports twelve demos, not verified.' },
    { type: 'metric', label: 'Orders picked today', value: '1,842', delta: '+9% vs. last Tuesday', up: true, source: 'acmeops.dev/reports', seconds: 4.5, voice: 'One thousand eight hundred forty-two orders picked, nine percent more than last Tuesday.' },
    { type: 'quote', text: 'The Rosario warehouse ran a full day with zero manual picks. First time.', who: 'Sofía, Customer Success', seconds: 5, voice: 'Sofía from Customer Success: the Rosario warehouse ran a full day with zero manual picks. First time.' },
    { type: 'agenda', label: 'Tomorrow', items: [{ when: '10:00', text: 'Demo with Northwind' }, { when: '15:00', text: 'Release 1.8 goes out' }, { when: 'EOD', text: 'Investor update due' }], seconds: 5, voice: 'Tomorrow: the Northwind demo at ten, release one point eight at three, and the investor update by end of day.' },
  ],
};

/** The public clip: vertical, short, only what can be told outside. */
export const CLIP: Script = {
  brand: ACME,
  format: 'portrait',
  lang: 'en',
  music: 'audio/music-clip.mp3',
  scenes: [
    { type: 'title', label: 'Day 47 building Acme Ops', text: 'Zero manual picks. First time.', seconds: 4, voice: 'Day forty-seven building Acme Ops. Zero manual picks, for the first time.' },
    { type: 'events', label: 'Today', items: [{ tag: 'shipped', text: 'Shortage alerts by WhatsApp' }, { tag: 'shipped', text: 'Pick list by aisle' }, { tag: 'live', text: 'Warehouse #12' }], seconds: 6, voice: 'Shipped today: shortage alerts by WhatsApp, the pick list by aisle, and warehouse twelve went live.' },
    { type: 'metric', label: 'Orders picked', value: '1,842', delta: '+9% week over week', up: true, source: 'our dashboard', seconds: 4, voice: 'Eighteen hundred orders picked, up nine percent week over week.' },
    { type: 'closing', cta: 'Follow the build', seconds: 4, voice: 'Follow the build at acme ops dot dev.' },
  ],
};
