import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { message } from "@/db/schema";

const MIN_FRAGMENT = 20;

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// Sentences of a private note long enough to be a recognisable quote.
function fragments(text: string) {
  return text
    .split(/[.!?\n]+/)
    .map(normalize)
    .filter((fragment) => fragment.length >= MIN_FRAGMENT);
}

// Mechanical backstop for the "never quote private notes" rule: rejects a
// public Master message that repeats a sentence of a participant's private
// note. It catches careless copying, not paraphrases.
export async function findPrivateQuote(spaceId: string, text: string) {
  const notes = await db
    .select({ content: message.content })
    .from(message)
    .where(
      and(
        eq(message.spaceId, spaceId),
        eq(message.visibility, "private"),
        isNotNull(message.authorParticipantId),
      ),
    );
  const haystack = normalize(text);
  for (const note of notes) {
    const quoted = fragments(note.content).find((fragment) => haystack.includes(fragment));
    if (quoted) return quoted;
  }
  return null;
}
