import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { postTweet, postThread, uploadMedia, isConfigured as isTwitterConfigured } from '@/lib/social/twitter';
import { postToLinkedIn, postWithImage as postLinkedInWithImage, isConfigured as isLinkedInConfigured } from '@/lib/social/linkedin';
import { postToInstagram, isConfigured as isMetaConfigured } from '@/lib/social/meta';
import { findProductInText } from '@/lib/products/catalog';

interface PublishResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
  contentId?: string;
}

// X/Twitter character limit for paid accounts (Premium/Premium+)
const TWITTER_PAID_LIMIT = 25000;

/**
 * Add product store link to post text if a product is mentioned
 */
function addProductLink(text: string): string {
  const product = findProductInText(text);
  if (product) {
    // Add store link at the end
    return `${text}\n\n🛒 ${product.url}`;
  }
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      content,
      hashtags: topLevelHashtags,
      platforms: topLevelPlatforms,
      visuals,
      publishOption,
      scheduledTime,
    } = body;

    // Handle both formats:
    // 1. Frontend wizard: content is a string, hashtags/platforms at top level
    // 2. Alternative: content is an object with text, hashtags, platforms nested
    const text = typeof content === 'string' ? content : (content?.text || '');
    const hashtags = topLevelHashtags || content?.hashtags || [];
    const platforms = topLevelPlatforms || content?.platforms || [];

    console.log('[Publish] Received request:', {
      textLength: text.length,
      platformCount: platforms.length,
      platforms,
      publishOption
    });

    const results: PublishResult[] = [];

    // Create generated content records for each platform
    for (const platform of platforms) {
      try {
        // Find visual for this platform
        const visual = visuals?.find((v: { platform: string }) => v.platform === platform);

        // Determine status based on publish option
        let status = 'draft';
        if (publishOption === 'now') {
          status = 'publishing';
        } else if (publishOption === 'schedule') {
          status = 'scheduled';
        } else if (publishOption === 'queue') {
          status = 'queued';
        }

        // Create generated content record
        const generatedContent = await prisma.generatedContent.create({
          data: {
            platform,
            text,
            hashtags,
            mediaUrl: visual?.imageUrl || visual?.gammaUrl || null,
            gammaUrl: visual?.gammaUrl || null,
            status,
            scheduledFor: scheduledTime ? new Date(scheduledTime) : null,
            source: 'wizard',
          },
        });

        // If publishing now, attempt to publish
        if (publishOption === 'now') {
          let publishedUrl: string | undefined;
          let publishSuccess = false;
          let publishError: string | undefined;

          if (platform === 'twitter') {
            // Publish to Twitter/X
            if (!isTwitterConfigured()) {
              publishError = 'Twitter not configured';
            } else {
              try {
                // Build the full post text with product link and hashtags
                const textWithProductLink = addProductLink(text);
                const hashtagString = hashtags.length > 0
                  ? '\n\n' + hashtags.map((tag: string) => `#${tag}`).join(' ')
                  : '';
                const fullText = textWithProductLink + hashtagString;

                // Upload image if we have one
                let mediaIds: string[] | undefined;
                const imageUrl = visual?.imageUrl || visual?.gammaUrl;
                if (imageUrl && !imageUrl.includes('gamma.app')) {
                  try {
                    console.log('[Publish] Uploading image to Twitter:', imageUrl);
                    const mediaId = await uploadMedia(imageUrl);
                    mediaIds = [mediaId];
                    console.log('[Publish] Media uploaded, ID:', mediaId);
                  } catch (mediaError) {
                    console.error('[Publish] Media upload failed:', mediaError);
                    // Continue without image
                  }
                }

                // Check if we need a thread (over limit)
                if (fullText.length > TWITTER_PAID_LIMIT) {
                  // Split into thread - this shouldn't happen often with 25k limit
                  const tweets = splitIntoThread(fullText);
                  console.log(`[Publish] Creating thread with ${tweets.length} tweets`);
                  const threadResults = await postThread(tweets);
                  publishedUrl = threadResults[0].url;
                  publishSuccess = true;
                } else {
                  // Single tweet
                  console.log('[Publish] Posting tweet, length:', fullText.length);
                  const result = await postTweet({
                    text: fullText,
                    mediaIds
                  });
                  publishedUrl = result.url;
                  publishSuccess = true;
                  console.log('[Publish] Tweet posted:', result.url);
                }
              } catch (twitterError) {
                console.error('[Publish] Twitter error:', twitterError);
                publishError = twitterError instanceof Error ? twitterError.message : 'Twitter publishing failed';
              }
            }
          } else if (platform === 'facebook') {
            // SKIP Facebook API publishing entirely - posts via API (even with native scheduling)
            // show "Published by Content Refinery" or "Scheduled by Content Refinery" attribution
            // which results in ZERO algorithmic reach.
            // Instead, mark for manual posting - user will use "Post to Facebook" button
            // which opens Facebook with pre-filled content for native posting.

            // Build the full post text for manual posting
            const textWithProductLink = addProductLink(text);
            const hashtagString = hashtags.length > 0
              ? '\n\n' + hashtags.map((tag: string) => `#${tag}`).join(' ')
              : '';
            const fullText = textWithProductLink + hashtagString;

            console.log('[Publish] Facebook post saved for manual posting (API posts get zero reach)');

            // Update status to ready_for_manual instead of publishing
            await prisma.generatedContent.update({
              where: { id: generatedContent.id },
              data: {
                status: 'ready_for_manual',
                text: fullText, // Save the full text with hashtags for easy copy
              },
            });

            results.push({
              platform,
              success: true,
              contentId: generatedContent.id,
            });

            // Skip the rest of the publish logic for Facebook
            continue;
          } else if (platform === 'linkedin') {
            // Publish to LinkedIn
            if (!isLinkedInConfigured()) {
              publishError = 'LinkedIn not configured';
            } else {
              try {
                // Build the full post text with product link and hashtags
                const textWithProductLink = addProductLink(text);
                const hashtagString = hashtags.length > 0
                  ? '\n\n' + hashtags.map((tag: string) => `#${tag}`).join(' ')
                  : '';
                const fullText = textWithProductLink + hashtagString;

                // Check if we have an image
                const imageUrl = visual?.imageUrl || visual?.gammaUrl;

                let result;
                if (imageUrl && !imageUrl.includes('gamma.app')) {
                  console.log('[Publish] Posting to LinkedIn with image:', imageUrl);
                  result = await postLinkedInWithImage({
                    text: fullText,
                    imageUrl,
                  });
                } else {
                  console.log('[Publish] Posting to LinkedIn, length:', fullText.length);
                  result = await postToLinkedIn({ text: fullText });
                }

                publishedUrl = result.url;
                publishSuccess = true;
                console.log('[Publish] LinkedIn posted:', result.url);
              } catch (linkedinError) {
                console.error('[Publish] LinkedIn error:', linkedinError);
                publishError = linkedinError instanceof Error ? linkedinError.message : 'LinkedIn publishing failed';
              }
            }
          } else if (platform === 'instagram') {
            // Publish to Instagram
            const metaConfig = isMetaConfigured();
            if (!metaConfig.instagram) {
              publishError = 'Instagram not configured';
            } else {
              try {
                // Build the full post text with product link and hashtags
                const textWithProductLink = addProductLink(text);
                const hashtagString = hashtags.length > 0
                  ? '\n\n' + hashtags.map((tag: string) => `#${tag}`).join(' ')
                  : '';
                const fullText = textWithProductLink + hashtagString;

                // Instagram REQUIRES an image
                const imageUrl = visual?.imageUrl || visual?.gammaUrl;
                if (!imageUrl || imageUrl.includes('gamma.app')) {
                  publishError = 'Instagram requires an image. Please generate a visual first.';
                } else {
                  console.log('[Publish] Posting to Instagram with image:', imageUrl);
                  const result = await postToInstagram({
                    caption: fullText,
                    imageUrl,
                  });

                  publishedUrl = result.url;
                  publishSuccess = true;
                  console.log('[Publish] Instagram posted:', result.url);
                }
              } catch (instagramError) {
                console.error('[Publish] Instagram error:', instagramError);
                publishError = instagramError instanceof Error ? instagramError.message : 'Instagram publishing failed';
              }
            }
          } else {
            // Other platforms not yet implemented
            publishError = `Publishing to ${platform} not yet implemented`;
          }

          if (publishSuccess) {
            await prisma.generatedContent.update({
              where: { id: generatedContent.id },
              data: {
                status: 'published',
                publishedAt: new Date(),
                platformPostUrl: publishedUrl,
              },
            });

            results.push({
              platform,
              success: true,
              url: publishedUrl,
              contentId: generatedContent.id,
            });
          } else {
            await prisma.generatedContent.update({
              where: { id: generatedContent.id },
              data: { status: 'failed' },
            });

            results.push({
              platform,
              success: false,
              error: publishError || 'Publishing failed',
              contentId: generatedContent.id,
            });
          }
        } else {
          // For scheduled, queued, or draft - just save
          results.push({
            platform,
            success: true,
            contentId: generatedContent.id,
          });
        }
      } catch (platformError) {
        console.error(`Failed to process ${platform}:`, platformError);
        results.push({
          platform,
          success: false,
          error: platformError instanceof Error ? platformError.message : 'Failed to save content',
        });
      }
    }

    return NextResponse.json({
      success: results.some((r) => r.success),
      results,
    });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish content' },
      { status: 500 }
    );
  }
}

/**
 * Split long text into thread-friendly chunks
 */
function splitIntoThread(text: string, maxLength = 280): string[] {
  const tweets: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length <= maxLength - 10) { // Leave room for thread indicator
      current = (current + ' ' + sentence).trim();
    } else {
      if (current) tweets.push(current);
      current = sentence;
    }
  }
  if (current) tweets.push(current);

  // Add thread indicators
  return tweets.map((tweet, i) =>
    tweets.length > 1 ? `${tweet} (${i + 1}/${tweets.length})` : tweet
  );
}
