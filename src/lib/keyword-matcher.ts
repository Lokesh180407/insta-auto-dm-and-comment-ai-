/**
 * Keyword Matcher
 *
 * Matches comment text against a set of keywords with support for:
 * - Case-insensitive matching
 * - Whole-word or partial matching
 * - Multi-keyword OR logic (any match = true)
 * - Emoji and special character stripping
 */

export interface KeywordMatchResult {
  matched: boolean;
  matchedKeyword: string | null;
}

/** Strip emojis and special characters, keeping only alphanumeric + whitespace */
export function stripSpecialCharacters(text: string): string {
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu,
      ""
    )
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if a comment text matches any of the given keywords.
 * @param commentText - Raw comment text to check
 * @param keywords    - Array of keywords to match against
 * @param wholeWordMatch - If true, keyword must be a standalone word
 */
export function matchKeywords(
  commentText: string,
  keywords: string[],
  wholeWordMatch = true
): KeywordMatchResult {
  if (!commentText || keywords.length === 0) {
    return { matched: false, matchedKeyword: null };
  }

  const cleanedText = stripSpecialCharacters(commentText).toLowerCase();
  if (!cleanedText) return { matched: false, matchedKeyword: null };

  for (const keyword of keywords) {
    const cleanedKeyword = stripSpecialCharacters(keyword).toLowerCase();
    if (!cleanedKeyword) continue;

    if (wholeWordMatch) {
      const escaped = cleanedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(cleanedText)) {
        return { matched: true, matchedKeyword: keyword };
      }
    } else {
      if (cleanedText.includes(cleanedKeyword)) {
        return { matched: true, matchedKeyword: keyword };
      }
    }
  }

  return { matched: false, matchedKeyword: null };
}
