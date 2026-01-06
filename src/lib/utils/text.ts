/**
 * Text utilities for content processing
 */

/**
 * Platform character limits
 */
export const PLATFORM_LIMITS: Record<string, { charLimit: number; hashtagLimit: number }> = {
  twitter: { charLimit: 280, hashtagLimit: 3 },
  facebook: { charLimit: 63206, hashtagLimit: 5 },
  instagram_feed: { charLimit: 2200, hashtagLimit: 30 },
  instagram_story: { charLimit: 2200, hashtagLimit: 30 },
  linkedin: { charLimit: 3000, hashtagLimit: 5 },
  tiktok: { charLimit: 2200, hashtagLimit: 5 },
};

/**
 * Smart truncate text to fit within character limit
 * Tries to cut at natural break points (sentences, then words)
 */
export function smartTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Reserve space for ellipsis
  const targetLength = maxLength - 3;

  // Try to cut at sentence boundary (. ! ?)
  const sentenceBreaks = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
  let lastSentenceEnd = -1;

  for (const breakChar of sentenceBreaks) {
    let pos = 0;
    while ((pos = text.indexOf(breakChar, pos + 1)) !== -1 && pos < targetLength) {
      lastSentenceEnd = pos + 1; // Include the punctuation
    }
  }

  // If we found a sentence break that leaves us with at least 100 chars, use it
  if (lastSentenceEnd > 100 && lastSentenceEnd <= targetLength) {
    return text.substring(0, lastSentenceEnd).trim();
  }

  // Try to cut at line break
  const lastLineBreak = text.lastIndexOf('\n', targetLength);
  if (lastLineBreak > 100) {
    return text.substring(0, lastLineBreak).trim() + "...";
  }

  // Try to cut at word boundary
  const lastSpace = text.lastIndexOf(' ', targetLength);
  if (lastSpace > 50) {
    return text.substring(0, lastSpace).trim() + "...";
  }

  // Fall back to hard cut
  return text.substring(0, targetLength) + "...";
}

/**
 * Format text for Twitter (280 char limit)
 * Intelligently fits hashtags if there's room
 */
export function formatForTwitter(text: string, hashtags: string[]): string {
  const limit = PLATFORM_LIMITS.twitter.charLimit;
  
  // First, smart truncate the main text if needed
  let tweetText = smartTruncate(text, limit);
  
  // Try to add hashtags if there's room
  if (hashtags && hashtags.length > 0) {
    const hashtagString = hashtags
      .slice(0, PLATFORM_LIMITS.twitter.hashtagLimit)
      .map(t => t.startsWith('#') ? t : `#${t}`)
      .join(" ");
    
    // Check if we can fit hashtags on a new line
    const withHashtags = `${tweetText}\n\n${hashtagString}`;
    
    if (withHashtags.length <= limit) {
      return withHashtags;
    }
    
    // Try with just one hashtag
    const oneHashtag = hashtags[0].startsWith('#') ? hashtags[0] : `#${hashtags[0]}`;
    const withOneHashtag = `${tweetText}\n\n${oneHashtag}`;
    
    if (withOneHashtag.length <= limit) {
      return withOneHashtag;
    }
    
    // Need to truncate text further to fit even one hashtag
    const neededSpace = oneHashtag.length + 3; // +3 for \n\n
    tweetText = smartTruncate(text, limit - neededSpace);
    return `${tweetText}\n\n${oneHashtag}`;
  }
  
  return tweetText;
}

/**
 * Get character count status for UI display
 */
export function getCharacterStatus(
  text: string, 
  platform: string, 
  hashtags: string[] = []
): {
  count: number;
  limit: number;
  isOverLimit: boolean;
  status: 'good' | 'warning' | 'error';
  message: string;
} {
  const platformConfig = PLATFORM_LIMITS[platform] || PLATFORM_LIMITS.twitter;
  const limit = platformConfig.charLimit;
  
  // Calculate full text with hashtags
  let fullText = text;
  if (hashtags.length > 0) {
    const hashtagStr = hashtags
      .slice(0, platformConfig.hashtagLimit)
      .map(t => t.startsWith('#') ? t : `#${t}`)
      .join(" ");
    fullText = `${text}\n\n${hashtagStr}`;
  }
  
  const count = fullText.length;
  const isOverLimit = count > limit;
  
  let status: 'good' | 'warning' | 'error' = 'good';
  let message = `${count}/${limit}`;
  
  if (isOverLimit) {
    status = 'error';
    message = `${count}/${limit} - ${count - limit} over limit`;
  } else if (count > limit * 0.9) {
    status = 'warning';
    message = `${count}/${limit} - Getting close to limit`;
  }
  
  return { count, limit, isOverLimit, status, message };
}




