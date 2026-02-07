import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface ShowNotesSegment {
  id: string;
  order: number;
  title: string;
  talkingPoints: string[];
  suggestedTransition: string;
  sourceItemIds: string[];
  statsToMention?: string[];
  estimatedMinutes?: number;
  type: string;
}

interface ShowNotesOutline {
  segments: ShowNotesSegment[];
  connectionMap: Array<{
    fromSourceId: string;
    toSourceId: string;
    connectionType: string;
    description: string;
  }>;
  estimatedDuration?: string;
}

interface PublicShowNotes {
  title: string;
  description: string;
  topicsList: string[];
  keyTakeaways: string[];
  productMentions: string[];
  links: Array<{ label: string; url: string }>;
}

const SHOW_DISPLAY_NAMES: Record<string, string> = {
  tbb: 'Trucking Business & Beyond',
  destination_health: 'Destination Health',
  power_hour: 'Power Hour',
};

function formatAsMarkdown(
  showNotes: {
    showName: string;
    customShowName?: string | null;
    episodeTitle?: string | null;
    outline: unknown;
    publicNotes: unknown;
    teaserText?: string | null;
    showDate?: Date | null;
  }
): string {
  const showDisplayName = showNotes.customShowName
    || SHOW_DISPLAY_NAMES[showNotes.showName]
    || showNotes.showName;

  const lines: string[] = [];

  // Header
  lines.push(`# ${showDisplayName}`);
  if (showNotes.episodeTitle) {
    lines.push(`## ${showNotes.episodeTitle}`);
  }
  if (showNotes.showDate) {
    lines.push(`**Date:** ${new Date(showNotes.showDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  }
  lines.push('');

  // Outline / Show Prep
  const outline = showNotes.outline as ShowNotesOutline | null;
  if (outline?.segments && outline.segments.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Show Outline');
    if (outline.estimatedDuration) {
      lines.push(`**Estimated Duration:** ${outline.estimatedDuration}`);
    }
    lines.push('');

    const sortedSegments = [...outline.segments].sort((a, b) => a.order - b.order);
    for (const segment of sortedSegments) {
      const typeLabel = segment.type ? ` [${segment.type}]` : '';
      const durationLabel = segment.estimatedMinutes ? ` (~${segment.estimatedMinutes} min)` : '';
      lines.push(`### ${segment.title}${typeLabel}${durationLabel}`);
      lines.push('');

      if (segment.talkingPoints.length > 0) {
        for (const point of segment.talkingPoints) {
          lines.push(`- ${point}`);
        }
        lines.push('');
      }

      if (segment.statsToMention && segment.statsToMention.length > 0) {
        lines.push('**Stats to mention:**');
        for (const stat of segment.statsToMention) {
          lines.push(`- ${stat}`);
        }
        lines.push('');
      }

      if (segment.suggestedTransition) {
        lines.push(`> **Transition:** ${segment.suggestedTransition}`);
        lines.push('');
      }
    }
  }

  // Public Show Notes
  const publicNotes = showNotes.publicNotes as PublicShowNotes | null;
  if (publicNotes) {
    lines.push('---');
    lines.push('');
    lines.push('## Public Show Notes');
    lines.push('');

    if (publicNotes.title) {
      lines.push(`**Title:** ${publicNotes.title}`);
      lines.push('');
    }

    if (publicNotes.description) {
      lines.push(publicNotes.description);
      lines.push('');
    }

    if (publicNotes.topicsList.length > 0) {
      lines.push('### Topics Covered');
      for (const topic of publicNotes.topicsList) {
        lines.push(`- ${topic}`);
      }
      lines.push('');
    }

    if (publicNotes.keyTakeaways.length > 0) {
      lines.push('### Key Takeaways');
      for (const takeaway of publicNotes.keyTakeaways) {
        lines.push(`- ${takeaway}`);
      }
      lines.push('');
    }

    if (publicNotes.productMentions.length > 0) {
      lines.push('### Products Mentioned');
      for (const product of publicNotes.productMentions) {
        lines.push(`- ${product}`);
      }
      lines.push('');
    }

    if (publicNotes.links.length > 0) {
      lines.push('### Links');
      for (const link of publicNotes.links) {
        lines.push(`- [${link.label}](${link.url})`);
      }
      lines.push('');
    }
  }

  // Teaser
  if (showNotes.teaserText) {
    lines.push('---');
    lines.push('');
    lines.push('## Social Media Teaser');
    lines.push('');
    lines.push(showNotes.teaserText);
    lines.push('');
  }

  return lines.join('\n');
}

function formatAsText(
  showNotes: {
    showName: string;
    customShowName?: string | null;
    episodeTitle?: string | null;
    outline: unknown;
    publicNotes: unknown;
    teaserText?: string | null;
    showDate?: Date | null;
  }
): string {
  const showDisplayName = showNotes.customShowName
    || SHOW_DISPLAY_NAMES[showNotes.showName]
    || showNotes.showName;

  const lines: string[] = [];

  // Header
  lines.push(showDisplayName.toUpperCase());
  lines.push('='.repeat(showDisplayName.length));
  if (showNotes.episodeTitle) {
    lines.push(showNotes.episodeTitle);
  }
  if (showNotes.showDate) {
    lines.push(`Date: ${new Date(showNotes.showDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  }
  lines.push('');

  // Outline
  const outline = showNotes.outline as ShowNotesOutline | null;
  if (outline?.segments && outline.segments.length > 0) {
    lines.push('SHOW OUTLINE');
    lines.push('-'.repeat(40));
    if (outline.estimatedDuration) {
      lines.push(`Estimated Duration: ${outline.estimatedDuration}`);
    }
    lines.push('');

    const sortedSegments = [...outline.segments].sort((a, b) => a.order - b.order);
    for (const segment of sortedSegments) {
      const durationLabel = segment.estimatedMinutes ? ` (~${segment.estimatedMinutes} min)` : '';
      lines.push(`[${segment.type?.toUpperCase() || 'SEGMENT'}] ${segment.title}${durationLabel}`);

      if (segment.talkingPoints.length > 0) {
        for (const point of segment.talkingPoints) {
          lines.push(`  * ${point}`);
        }
      }

      if (segment.statsToMention && segment.statsToMention.length > 0) {
        lines.push('  Stats:');
        for (const stat of segment.statsToMention) {
          lines.push(`    - ${stat}`);
        }
      }

      if (segment.suggestedTransition) {
        lines.push(`  >> Transition: ${segment.suggestedTransition}`);
      }
      lines.push('');
    }
  }

  // Public Notes
  const publicNotes = showNotes.publicNotes as PublicShowNotes | null;
  if (publicNotes) {
    lines.push('PUBLIC SHOW NOTES');
    lines.push('-'.repeat(40));
    lines.push('');

    if (publicNotes.title) {
      lines.push(`Title: ${publicNotes.title}`);
      lines.push('');
    }

    if (publicNotes.description) {
      lines.push(publicNotes.description);
      lines.push('');
    }

    if (publicNotes.topicsList.length > 0) {
      lines.push('Topics Covered:');
      for (const topic of publicNotes.topicsList) {
        lines.push(`  - ${topic}`);
      }
      lines.push('');
    }

    if (publicNotes.keyTakeaways.length > 0) {
      lines.push('Key Takeaways:');
      for (const takeaway of publicNotes.keyTakeaways) {
        lines.push(`  - ${takeaway}`);
      }
      lines.push('');
    }

    if (publicNotes.productMentions.length > 0) {
      lines.push('Products Mentioned:');
      for (const product of publicNotes.productMentions) {
        lines.push(`  - ${product}`);
      }
      lines.push('');
    }

    if (publicNotes.links.length > 0) {
      lines.push('Links:');
      for (const link of publicNotes.links) {
        lines.push(`  - ${link.label}: ${link.url}`);
      }
      lines.push('');
    }
  }

  // Teaser
  if (showNotes.teaserText) {
    lines.push('SOCIAL MEDIA TEASER');
    lines.push('-'.repeat(40));
    lines.push(showNotes.teaserText);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * POST /api/show-notes/export
 * Export show notes in markdown or plain text format.
 *
 * Body:
 *   - id: string (show notes ID)
 *   - format: 'markdown' | 'text'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, format } = body as { id: string; format: 'markdown' | 'text' };

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    if (!format || !['markdown', 'text'].includes(format)) {
      return NextResponse.json(
        { error: 'format must be "markdown" or "text"' },
        { status: 400 }
      );
    }

    const showNotes = await prisma.showNotes.findUnique({
      where: { id },
    });

    if (!showNotes) {
      return NextResponse.json(
        { error: 'Show notes not found' },
        { status: 404 }
      );
    }

    const content = format === 'markdown'
      ? formatAsMarkdown(showNotes)
      : formatAsText(showNotes);

    return NextResponse.json({ content, format });
  } catch (error) {
    console.error('[Show Notes Export] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export show notes' },
      { status: 500 }
    );
  }
}
