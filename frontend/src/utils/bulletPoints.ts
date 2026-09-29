/**
 * Converts any AI response paragraph, list, or text into discrete pointwise bullet strings.
 */
export function formatToPoints(text?: string): string[] {
  if (!text || !text.trim()) return [];

  const cleaned = text
    .replace(/\$O\(\\sqrt\{N\}\)\$/g, 'O(√N)')
    .replace(/\$O\(\\sqrt\{n\}\)\$/g, 'O(√n)')
    .replace(/\$O\(N\)\$/g, 'O(N)')
    .replace(/\$O\(1\)\$/g, 'O(1)')
    .replace(/\$/g, '')
    .trim();

  // 1. If explicit newlines exist (e.g. from markdown bullets or numbered items)
  if (cleaned.includes('\n')) {
    const rawLines = cleaned.split('\n');
    const items = rawLines
      .map(l => l.replace(/^[-*•\d\.\)\s]+/, '').trim())
      .filter(l => l.length > 3);
    if (items.length > 1) return items;
  }

  // 2. If bullet symbols exist inline (e.g. '•' or '-')
  if (cleaned.includes('•')) {
    const items = cleaned.split('•')
      .map(p => p.trim())
      .filter(p => p.length > 5);
    if (items.length > 1) return items;
  }

  // 3. Sentence boundary splitter: Splits paragraphs into distinct points
  const sentences = cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map(s => s.replace(/^[-*•\s]+/, '').trim())
    .filter(s => s.length > 6);

  if (sentences.length > 0) {
    return sentences;
  }

  return [cleaned];
}
