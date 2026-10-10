/**
 * Prepares AI-generated quiz text for JSON.parse.
 * Some chat interfaces escape Markdown punctuation (for example `quiz\_title`
 * and `\[`), even though those escapes are not valid in JSON object syntax.
 */
export function normalizeQuizJson(text: string): string {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/\\([_[\]{}])/g, '$1')
    .trim();
}
