/**
 * Dependency-free spam classifier for the public contact / booking forms.
 *
 * Additive scoring: each independent signal adds a weight, and the total maps to
 * a verdict. Every hit is explained in `reasons` for the logs.
 *
 * The top priority is NO FALSE POSITIVES — a real customer must never be "spam".
 * So no single signal (except the honeypot) can reach the spam threshold on its
 * own; "spam" always needs at least two independent signals. Non-Latin scripts
 * (Cyrillic, CJK, …) are deliberately never a signal: international customers exist.
 * Human quirks that look random are excused rather than scored: caps-lock typing
 * ("mATTIvIRTANEN"), all-caps words and acronyms ("EsaPekkaVIRTANEN", "YLE:n"),
 * one-row keyboard mashes ("asdfghjkl"), and pasted codes with digits score lower.
 *
 * The weekly bot pattern this targets:
 *   name "DZiZYBAuexMthkZAU", email "m.o.r.e.co.p.exu.t32@gmail.com",
 *   message "sMFXjOECFaCAQTQxBTLYD"
 *
 * Lives in api/_lib/ so Vercel does not deploy it as a route.
 */

export type SpamVerdict = "ham" | "suspect" | "spam";

export interface SpamInput {
  formType: "contact" | "booking";
  name: string;
  email: string;
  message: string;
  phone?: string;
  location?: string;
  eventType?: string;
  /** Honeypot – must stay empty for humans. */
  website?: string;
  /** Time from form render to submit; undefined if the client didn't send it. */
  elapsedMs?: number;
}

export interface SpamAssessment {
  verdict: SpamVerdict;
  score: number;
  reasons: string[];
}

/** Score at or above which a submission is "suspect" / "spam". */
export const SPAM_THRESHOLDS = { suspect: 3, spam: 6 } as const;

/**
 * Signal weights. Strong = 4 (suspect alone), medium = 2–3, weak = 1.
 * The largest non-honeypot weight is below `SPAM_THRESHOLDS.spam`.
 */
export const SPAM_WEIGHTS = {
  honeypot: 100,
  fastSubmit: 4,
  nameGibberish: 4,
  messageGibberish: 4,
  /**
   * Message is a random token WITH digits – also what a pasted order code or video ID
   * ("4cOdK2wGLETKBW3PvgPWqT") looks like, so one notch weaker than letters-only
   * gibberish and never combined with `singleTokenFields`.
   */
  messageCode: 3,
  /**
   * Name / message made of several short random-case words ("fGhJk LqWeRt") – the bot
   * string with spaces inserted. Weaker than a gibberish token: suspect alone, spam
   * only when both fields (or another signal) agree.
   */
  spacedGibberish: 3,
  /**
   * Name AND message are each one long mixed-case token – the bot's shape even when
   * the gibberish test misses one or both of them. Suspect alone; spam with one gibberish hit.
   */
  singleTokenFields: 3,
  /** Per field (phone / location / eventType), capped by `otherFieldsCap`. */
  otherFieldGibberish: 2,
  otherFieldsCap: 4,
  /** Phone field with letters but no digits at all. */
  phoneWithoutDigits: 1,
  /** gmail local part with ≥4 dots or ≥4 single-character segments. */
  gmailDotsHeavy: 2,
  /** gmail local part with 3 dots (e.g. "j.p.k.laine" – real people do this). */
  gmailDotsLight: 1,
  linkMarkup: 3,
  urlInName: 3,
  manyUrls: 2,
  /** Per distinct marketing phrase, capped by `spamPhraseCap`. */
  spamPhrase: 1,
  spamPhraseCap: 2,
} as const;

/** Submissions faster than this (from render) are treated as automated. */
const FAST_SUBMIT_MS = 3000;
const MIN_GIBBERISH_TOKEN_LENGTH = 8;
/** Share of letters that must be irregular capitals for multi-word random-case text. */
const RANDOM_TEXT_MIN_IRREGULAR_RATIO = 0.15;
const MANY_URLS = 3;

interface Signal {
  weight: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Gibberish detection
// ---------------------------------------------------------------------------

const TOKEN_RE = /^[\p{L}\p{M}\p{N}]+$/u;
const LETTER_RE = /\p{L}/u;
const DIGIT_RE = /\p{N}/u;
const UPPER_RE = /\p{Lu}/u;
const LOWER_RE = /\p{Ll}/u;
/** Base Latin letters (after stripping diacritics) the vowel heuristic understands. */
const LATIN_BASE_RE = /^[a-zßæøœłđþ]$/;
const LATIN_VOWELS = new Set(["a", "e", "i", "o", "u", "y", "æ", "ø", "œ"]);

const isUpper = (ch: string | undefined): boolean =>
  ch !== undefined && UPPER_RE.test(ch);
const isLower = (ch: string | undefined): boolean =>
  ch !== undefined && LOWER_RE.test(ch);

interface LatinShape {
  vowelRatio: number;
  maxConsonantRun: number;
}

/**
 * Vowel ratio and longest consonant run of a Latin-script word, or null when the
 * word contains non-Latin letters (the heuristic means nothing for other scripts).
 */
function latinShape(letters: string[]): LatinShape | null {
  const base = letters.map((ch) =>
    ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  );
  if (base.length === 0 || !base.every((ch) => LATIN_BASE_RE.test(ch))) {
    return null;
  }

  let vowels = 0;
  let run = 0;
  let maxConsonantRun = 0;
  for (const ch of base) {
    if (LATIN_VOWELS.has(ch)) {
      vowels++;
      run = 0;
    } else {
      run++;
      maxConsonantRun = Math.max(maxConsonantRun, run);
    }
  }
  return { vowelRatio: vowels / base.length, maxConsonantRun };
}

interface CaseStats {
  letters: number;
  upper: number;
  /** Lowercase letter followed by a capital. */
  lowerToUpper: number;
  /** Inner capital NOT followed by two lowercase letters. */
  irregularUpper: number;
}

const NO_FLIPS: CaseStats = { letters: 0, upper: 0, lowerToUpper: 0, irregularUpper: 0 };

/**
 * All-caps runs at the edges of a word are words, not noise: a leading acronym of 2+
 * letters before a capitalised word is dropped ("JPK|Laine", "KP|DeLaCruz",
 * "NV|Škrjanc") and a trailing all-caps word of 3+ letters shrinks to its first
 * capital ("EsaPekka|VIRTANEN", "Heidi|FANS"). Words without lowercase are unchanged.
 */
function trimCapsEdges(word: string[]): string[] {
  let start = 0;
  while (isUpper(word[start]) && isUpper(word[start + 1])) start++;
  const letters = start >= 2 && isLower(word[start + 1]) ? word.slice(start) : word;

  let end = letters.length;
  while (end > 0 && isUpper(letters[end - 1])) end--;
  return end > 0 && letters.length - end >= 3 ? letters.slice(0, end + 1) : letters;
}

/**
 * Case transitions of one word (letters only), after `trimCapsEdges`.
 *
 * An inner capital is "regular" when two lowercase letters follow it — the shape of
 * every camel-case word start ("McDonald", "DeAndre", "VanDerBerg", "KeikkaPalvelu",
 * "YouTube"). Random strings have many irregular ones (followed by another capital,
 * a single lowercase letter, or the end). All-caps words have no flips at all.
 */
function caseStats(word: string[]): CaseStats {
  if (!word.some(isLower)) return { ...NO_FLIPS, letters: word.length, upper: word.length };

  const letters = trimCapsEdges(word);
  const stats: CaseStats = {
    ...NO_FLIPS,
    letters: letters.length,
    upper: isUpper(letters[0]) ? 1 : 0,
  };
  for (let i = 1; i < letters.length; i++) {
    if (!isUpper(letters[i])) continue;
    stats.upper++;
    if (isLower(letters[i - 1])) stats.lowerToUpper++;
    if (!(isLower(letters[i + 1]) && isLower(letters[i + 2]))) stats.irregularUpper++;
  }
  return stats;
}

/** Case keeps flipping back and forth with irregular capitals. */
const flipsCaseOften = (s: CaseStats): boolean =>
  s.lowerToUpper >= 2 && s.irregularUpper >= 3;

/** Swap upper and lower case. */
const invertCase = (letters: string[]): string[] =>
  letters.map((ch) => (isUpper(ch) ? ch.toLowerCase() : ch.toUpperCase()));

const hasLatinVowel = (letters: string[]): boolean => {
  const shape = latinShape(letters);
  return shape === null || shape.vowelRatio > 0;
};

/**
 * Words typed with caps lock on ("mATTIvIRTANEN", "pRIYAmCdONALD", "hEI"): they start
 * lowercase, never have two lowercase letters in a row, and swapping the case gives
 * ordinary camel case ("PriyaMcDonald") made of real words – parts of 3+ letters that
 * all have vowels. That keeps the bot's "sMFXjOECFaCAQTQxBTLYD" (→ "Smfx|Joecf|…")
 * and short random words ("zXcV" → "Zx|Cv") random.
 */
function isCapsLockTyped(word: string[]): boolean {
  if (!isLower(word[0]) || word.some((ch, i) => isLower(ch) && isLower(word[i + 1]))) {
    return false;
  }
  const swapped = invertCase(word);
  if (flipsCaseOften(caseStats(swapped))) return false;

  const parts: string[][] = [];
  for (const ch of swapped) {
    if (isUpper(ch) || parts.length === 0) parts.push([]);
    parts[parts.length - 1].push(ch);
  }
  const words = parts.filter((part) => part.length >= 3);
  return words.length > 0 && words.every(hasLatinVowel);
}

/** Random mixed case in one word, e.g. "DZiZYBAuexMthkZAU" / "sMFXjOECFaCAQTQxBTLYD". */
function hasRandomCasing(letters: string[]): boolean {
  // All-caps ("PIKKUJOULUT") and caseless scripts are never random casing.
  if (!letters.some(isLower) || isCapsLockTyped(letters)) return false;

  const stats = caseStats(letters);
  if (flipsCaseOften(stats)) return true;

  // Mixed case that also isn't pronounceable ("RcKwTnpLmxQv", "KdiJgjahRMst").
  const shape = latinShape(trimCapsEdges(letters));
  return (
    stats.lowerToUpper >= 2 &&
    stats.upper / stats.letters >= 0.25 &&
    shape !== null &&
    shape.vowelRatio < 0.3 &&
    shape.maxConsonantRun >= 4
  );
}

/** URLs, e-mail addresses, @handles and domains carry random IDs – not words. */
const LINK_LIKE_TOKEN_RE = /[/@]|\p{L}\.\p{L}{2,}/u;
const LETTER_RUN_RE = /\p{L}+/gu;

/**
 * Several short words whose case flips at random, i.e. the bot string with spaces
 * inserted ("fGhJk LqWeRt", "zXcV bNmQ wErT yUiO"). Flips are summed over the field;
 * caps-lock words, all-caps words, acronyms ("YLE:n") and 1–2 letter words ("xD") add
 * nothing, and the flips must be dense so the odd "MaRiA" in a sentence never adds up.
 */
function isRandomCaseText(value: string): boolean {
  const words = value
    .normalize("NFC")
    .split(/\s+/)
    .filter((token) => !LINK_LIKE_TOKEN_RE.test(token))
    .flatMap((token) => token.match(LETTER_RUN_RE) ?? [])
    .map((word) => Array.from(word));
  if (words.length < 2) return false;

  const total = words
    .map((word) =>
      word.length < 3 || isCapsLockTyped(word)
        ? { ...NO_FLIPS, letters: word.length }
        : caseStats(word)
    )
    .reduce((sum, s) => ({
      letters: sum.letters + s.letters,
      upper: sum.upper + s.upper,
      lowerToUpper: sum.lowerToUpper + s.lowerToUpper,
      irregularUpper: sum.irregularUpper + s.irregularUpper,
    }));
  return (
    total.letters >= MIN_GIBBERISH_TOKEN_LENGTH &&
    flipsCaseOften(total) &&
    total.irregularUpper / total.letters >= RANDOM_TEXT_MIN_IRREGULAR_RATIO
  );
}

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"] as const;

/** Humans mash one keyboard row ("asdfghjkl", "sdfsdfsdf"); random bot strings don't. */
const isSingleKeyboardRow = (letters: string[]): boolean =>
  KEYBOARD_ROWS.some((row) => letters.every((ch) => row.includes(ch.toLowerCase())));

/**
 * Keyboard-mash consonant clusters in a Latin word ("xkcdqwrtzpvbnm"). Kept strict
 * so real names with heavy clusters ("Mkrtchyan", "Brzęczyszczykiewicz",
 * "Szczepański") stay clear.
 */
function isUnpronounceable(word: string[]): boolean {
  const letters = trimCapsEdges(word);
  if (letters.length < MIN_GIBBERISH_TOKEN_LENGTH || isSingleKeyboardRow(letters)) {
    return false;
  }
  const shape = latinShape(letters);
  return shape !== null && shape.vowelRatio < 0.12 && shape.maxConsonantRun >= 6;
}

/**
 * True when `token` is a single whitespace-free run of letters/digits (length ≥ 8)
 * that looks machine-generated: random mixed case or no pronounceable structure.
 */
export function isGibberishToken(token: string): boolean {
  const normalized = token.normalize("NFC");
  if (!TOKEN_RE.test(normalized)) return false;

  const chars = Array.from(normalized);
  if (chars.length < MIN_GIBBERISH_TOKEN_LENGTH) return false;

  const letters = chars.filter((ch) => LETTER_RE.test(ch));
  return hasRandomCasing(letters) || isUnpronounceable(letters);
}

/** One whitespace-free letters/digits token (length ≥ 8) with a capital after its first letter. */
function isMixedCaseToken(value: string): boolean {
  if (!TOKEN_RE.test(value) || Array.from(value).length < MIN_GIBBERISH_TOKEN_LENGTH) {
    return false;
  }
  const letters = Array.from(value).filter((ch) => LETTER_RE.test(ch));
  return letters.some(isLower) && letters.slice(1).some(isUpper);
}

/** Whole field is made of gibberish tokens only (usually a single token). */
function isGibberishField(value: string): boolean {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every(isGibberishToken);
}

// ---------------------------------------------------------------------------
// Other signals
// ---------------------------------------------------------------------------

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/**
 * Gmail ignores dots, so bots spray dot variants of one mailbox
 * ("m.o.r.e.co.p.exu.t32"). Real people use a few ("j.p.k.laine").
 */
function gmailDotSignal(email: string): Signal | null {
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!GMAIL_DOMAINS.has(domain)) return null;

  const segments = local.split(".");
  const dots = segments.length - 1;
  const singleCharSegments = segments.filter((s) => s.length === 1).length;

  if (dots >= 4 || singleCharSegments >= 4) {
    return {
      weight: SPAM_WEIGHTS.gmailDotsHeavy,
      reason: `gmail address with ${dots} dots / ${singleCharSegments} single-char segments`,
    };
  }
  if (dots === 3) {
    return {
      weight: SPAM_WEIGHTS.gmailDotsLight,
      reason: "gmail address with 3 dots",
    };
  }
  return null;
}

const URL_RE = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;
const NAME_URL_RE = /https?:\/\/|\bwww\.|\[url|<a\s/i;
const LINK_MARKUP_RE = /\[url[=\]]|\[link[=\]]|<a\s+[^>]*href/i;

/** English marketing / SEO / crypto pitches. Weak on their own by design. */
const SPAM_PHRASES: ReadonlyArray<{ label: string; re: RegExp }> = [
  { label: "SEO", re: /\bSEO\b/ },
  { label: "backlinks", re: /\bback-?links?\b/i },
  { label: "rank your website", re: /\brank(?:ing)? (?:your|ur) (?:web)?site\b/i },
  { label: "first page of google", re: /\b(?:first|1st|top) page (?:of|on) google\b/i },
  { label: "website traffic", re: /\b(?:website|web|site|organic) traffic\b/i },
  { label: "guest post", re: /\bguest[- ]?post(?:s|ing)?\b/i },
  { label: "digital marketing", re: /\bdigital marketing\b/i },
  { label: "lead generation", re: /\blead generation\b/i },
  { label: "crypto", re: /\bcrypto(?:currenc(?:y|ies))?\b/i },
  { label: "bitcoin", re: /\bbitcoins?\b/i },
  { label: "forex", re: /\bforex\b/i },
  { label: "casino", re: /\bcasinos?\b/i },
  { label: "viagra/cialis", re: /\b(?:viagra|cialis)\b/i },
  { label: "earn money", re: /\b(?:earn|make) (?:\$?\d+\S* )?money\b/i },
  { label: "investment opportunity", re: /\binvestment opportunit(?:y|ies)\b/i },
  { label: "click here", re: /\bclick here\b/i },
  { label: "unsubscribe", re: /\bunsubscribe\b/i },
];

function spamPhraseSignal(message: string): Signal | null {
  const hits = SPAM_PHRASES.filter(({ re }) => re.test(message)).map(
    ({ label }) => label
  );
  if (hits.length === 0) return null;
  return {
    weight: Math.min(hits.length * SPAM_WEIGHTS.spamPhrase, SPAM_WEIGHTS.spamPhraseCap),
    reason: `marketing phrases: ${hits.join(", ")}`,
  };
}

function otherFieldsSignal(input: SpamInput): Signal | null {
  const fields: Array<[label: string, value: string | undefined]> = [
    ["phone", input.phone],
    ["location", input.location],
    ["eventType", input.eventType],
  ];
  const gibberish = fields
    .filter(
      ([, value]) =>
        value !== undefined && (isGibberishField(value) || isRandomCaseText(value))
    )
    .map(([label]) => label);

  if (gibberish.length > 0) {
    return {
      weight: Math.min(
        gibberish.length * SPAM_WEIGHTS.otherFieldGibberish,
        SPAM_WEIGHTS.otherFieldsCap
      ),
      reason: `gibberish in ${gibberish.join(", ")}`,
    };
  }

  const phone = input.phone?.trim() ?? "";
  if (phone.length > 0 && !/\d/.test(phone) && /\p{L}/u.test(phone)) {
    return { weight: SPAM_WEIGHTS.phoneWithoutDigits, reason: "phone has no digits" };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

function collectSignals(input: SpamInput): Signal[] {
  const name = input.name ?? "";
  const message = input.message ?? "";
  const signals: Signal[] = [];
  const add = (signal: Signal | null): void => {
    if (signal) signals.push(signal);
  };

  if ((input.website ?? "").trim().length > 0) {
    add({ weight: SPAM_WEIGHTS.honeypot, reason: "honeypot field filled" });
  }

  const elapsed = input.elapsedMs;
  if (
    typeof elapsed === "number" &&
    Number.isFinite(elapsed) &&
    elapsed >= 0 &&
    elapsed < FAST_SUBMIT_MS
  ) {
    add({
      weight: SPAM_WEIGHTS.fastSubmit,
      reason: `submitted ${Math.round(elapsed)} ms after render (< ${FAST_SUBMIT_MS} ms)`,
    });
  }

  if (isGibberishField(name)) {
    add({ weight: SPAM_WEIGHTS.nameGibberish, reason: "name is gibberish" });
  } else if (isRandomCaseText(name)) {
    add({ weight: SPAM_WEIGHTS.spacedGibberish, reason: "name is random-case words" });
  }
  const messageHasDigits = DIGIT_RE.test(message);
  if (isGibberishField(message)) {
    add(
      messageHasDigits
        ? { weight: SPAM_WEIGHTS.messageCode, reason: "message is a random code" }
        : { weight: SPAM_WEIGHTS.messageGibberish, reason: "message is gibberish" }
    );
  } else if (isRandomCaseText(message)) {
    add({ weight: SPAM_WEIGHTS.spacedGibberish, reason: "message is random-case words" });
  }
  if (
    !messageHasDigits &&
    isMixedCaseToken(name.trim()) &&
    isMixedCaseToken(message.trim())
  ) {
    add({
      weight: SPAM_WEIGHTS.singleTokenFields,
      reason: "name and message are both single mixed-case tokens",
    });
  }

  add(otherFieldsSignal(input));
  add(gmailDotSignal(input.email ?? ""));

  if (NAME_URL_RE.test(name)) {
    add({ weight: SPAM_WEIGHTS.urlInName, reason: "URL in name field" });
  }
  if (LINK_MARKUP_RE.test(message)) {
    add({ weight: SPAM_WEIGHTS.linkMarkup, reason: "BBCode/HTML link markup in message" });
  }
  const urlCount = message.match(URL_RE)?.length ?? 0;
  if (urlCount >= MANY_URLS) {
    add({ weight: SPAM_WEIGHTS.manyUrls, reason: `${urlCount} URLs in message` });
  }

  add(spamPhraseSignal(message));

  return signals;
}

export function assessSpam(input: SpamInput): SpamAssessment {
  const signals = collectSignals(input);
  const score = signals.reduce((sum, s) => sum + s.weight, 0);
  const verdict: SpamVerdict =
    score >= SPAM_THRESHOLDS.spam
      ? "spam"
      : score >= SPAM_THRESHOLDS.suspect
        ? "suspect"
        : "ham";

  return {
    verdict,
    score,
    reasons: signals.map((s) => `${s.reason} (+${s.weight})`),
  };
}
