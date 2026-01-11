import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface PublishResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
  contentId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      content,
      hashtags,
      platforms,
      visuals,
      publishOption,
      scheduledTime,
    } = body;

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
            text: content,
            hashtags: hashtags || [],
            mediaUrl: visual?.imageUrl || null,
            gammaUrl: visual?.gammaUrl || null,
            status,
            scheduledFor: scheduledTime ? new Date(scheduledTime) : null,
            source: 'wizard',
          },
        });

        // If publishing now, attempt to publish
        if (publishOption === 'now') {
          // TODO: Implement actual platform publishing
          // For now, simulate success
          const publishSuccess = true;
          
          if (publishSuccess) {
            await prisma.generatedContent.update({
              where: { id: generatedContent.id },
              data: {
                status: 'published',
                publishedAt: new Date(),
                // publishedUrl would be set from the platform's response
              },
            });

            results.push({
              platform,
              success: true,
              contentId: generatedContent.id,
              // url: publishedUrl would come from the platform
            });
          } else {
            await prisma.generatedContent.update({
              where: { id: generatedContent.id },
              data: { status: 'failed' },
            });

            results.push({
              platform,
              success: false,
              error: 'Publishing failed',
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
          error: 'Failed to save content',
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
      { error: 'Failed to publish content' },
      { status: 500 }
    );
  }
}
