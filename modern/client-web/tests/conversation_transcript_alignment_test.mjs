import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const TRANSCRIPT_PATH = path.join(ROOT, "..", "legacy", "transcript reference", "Transcript_U6.txt");

function mustReadTranscript() {
  assert.ok(fs.existsSync(TRANSCRIPT_PATH), `missing transcript reference: ${TRANSCRIPT_PATH}`);
  return fs.readFileSync(TRANSCRIPT_PATH, "utf8");
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function assertTranscriptContainsAll(text, expected) {
  const hay = normalize(text);
  for (const line of expected) {
    assert.ok(
      hay.includes(normalize(line)),
      `Transcript missing expected canonical line fragment: ${line}`
    );
  }
}

const transcript = mustReadTranscript();

assertTranscriptContainsAll(transcript, [
  "5. Lord British",
  "You see the noble ruler of Britannia.",
  "I am Lord British, as thou knowest well.",
  "Thanks to thee, I sit once more upon the throne of Britannia.",
  "I cannot help thee with that."
]);

assertTranscriptContainsAll(transcript, [
  "2. Dupre",
  "You see a ruggedly handsome man, wearing a gleaming suit of armor.",
  "It's Dupre - sounds like dew pray, remember?",
  "Why, questing, of course!"
]);

assertTranscriptContainsAll(transcript, [
  "6. Nystul",
  "You see a concerned looking mage.",
  "Hail to thee $2, and well met."
]);

console.log("conversation_transcript_alignment_test: ok");
