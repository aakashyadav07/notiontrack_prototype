import { Client } from '@notionhq/client';
import { getEnv } from '../config/env';
import { prisma } from '../config/database';

const env = getEnv();

const notion = new Client({
  auth: env.NOTION_API_KEY,
});

export interface NotionTimetablePage {
  id: string;
  url: string;
}

export interface NotionConfig {
  databaseId: string;
  apiKey: string;
}

export class NotionService {
  private client: Client;
  private databaseId: string;

  constructor(config?: NotionConfig) {
    this.client = config ? new Client({ auth: config.apiKey }) : notion;
    this.databaseId = config?.databaseId || env.NOTION_DATABASE_ID || '';
  }

  async createTimetableReviewPage(timetableId: string): Promise<NotionTimetablePage> {
    const timetable = await prisma.timetable.findUnique({
      where: { id: timetableId },
      include: {
        entries: {
          include: {
            exam: { include: { subject: true } },
            room: true,
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
        conflicts: true,
      },
    });

    if (!timetable) {
      throw new Error('Timetable not found');
    }

    const conflicts = timetable.conflicts.filter(c => !c.isResolved);

    const response = await this.client.pages.create({
      parent: { database_id: this.databaseId },
      properties: {
        'Name': {
          title: [{ text: { content: `Timetable Review: ${timetable.name}` } }],
        },
        'Timetable ID': {
          rich_text: [{ text: { content: timetableId } }],
        },
        'Status': {
          select: { name: 'Pending Review' },
        },
        'Period': {
          date: {
            start: timetable.startDate.toISOString().split('T')[0],
            end: timetable.endDate.toISOString().split('T')[0],
          },
        },
        'Total Exams': {
          number: timetable.entries.length,
        },
        'Unresolved Conflicts': {
          number: conflicts.length,
        },
        'Generated At': {
          date: { start: new Date().toISOString() },
        },
      },
      children: this.buildPageChildren(timetable, conflicts),
    }) as any;

    const pageId = response.id;
    const pageUrl = response.url || `https://notion.so/${pageId.replace(/-/g, '')}`;

    await prisma.timetable.update({
      where: { id: timetableId },
      data: {
        metadata: {
          notionPageId: pageId,
          notionPageUrl: pageUrl,
        },
      },
    });

    return { id: pageId, url: pageUrl };
  }

  private buildPageChildren(timetable: any, conflicts: any[]) {
    const children: any[] = [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Timetable Entries' } }],
        },
      },
      {
        object: 'block',
        type: 'table',
        table: {
          table_width: 6,
          has_column_header: true,
          has_row_header: false,
          children: [
            {
              object: 'block',
              type: 'table_row',
              table_row: {
                cells: [
                  [{ type: 'text', text: { content: 'Date' } }],
                  [{ type: 'text', text: { content: 'Session' } }],
                  [{ type: 'text', text: { content: 'Time' } }],
                  [{ type: 'text', text: { content: 'Exam' } }],
                  [{ type: 'text', text: { content: 'Subject' } }],
                  [{ type: 'text', text: { content: 'Room' } }],
                ],
              },
            },
            ...timetable.entries.map((entry: any) => ({
              object: 'block',
              type: 'table_row',
              table_row: {
                cells: [
                  [{ type: 'text', text: { content: entry.date.toISOString().split('T')[0] } }],
                  [{ type: 'text', text: { content: entry.sessionType } }],
                  [{ type: 'text', text: { content: `${entry.startTime.toISOString().split('T')[1].slice(0,5)}-${entry.endTime.toISOString().split('T')[1].slice(0,5)}` } }],
                  [{ type: 'text', text: { content: entry.exam.subject.name } }],
                  [{ type: 'text', text: { content: entry.exam.subject.code } }],
                  [{ type: 'text', text: { content: entry.room.code } }],
                ],
              },
            })),
          ],
        },
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Conflicts' } }],
        },
      },
    ];

    if (conflicts.length > 0) {
      children.push({
        object: 'block',
        type: 'table',
        table: {
          table_width: 5,
          has_column_header: true,
          has_row_header: false,
          children: [
            {
              object: 'block',
              type: 'table_row',
              table_row: {
                cells: [
                  [{ type: 'text', text: { content: 'Type' } }],
                  [{ type: 'text', text: { content: 'Severity' } }],
                  [{ type: 'text', text: { content: 'Description' } }],
                  [{ type: 'text', text: { content: 'Entity' } }],
                  [{ type: 'text', text: { content: 'Action' } }],
                ],
              },
            },
            ...conflicts.map((conflict: any) => ({
              object: 'block',
              type: 'table_row',
              table_row: {
                cells: [
                  [{ type: 'text', text: { content: conflict.type.replace(/_/g, ' ') } }],
                  [{ type: 'text', text: { content: conflict.severity } }],
                  [{ type: 'text', text: { content: conflict.description } }],
                  [{ type: 'text', text: { content: `${conflict.entityType}: ${conflict.entityId}` } }],
                  [{ type: 'text', text: { content: 'Review Required' } }],
                ],
              },
            })),
          ],
        },
      });
    } else {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'No unresolved conflicts detected.' } }],
        },
      });
    }

    children.push(
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Actions' } }],
        },
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: 'Review the timetable entries and conflicts above' } }],
        },
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: 'Change Status to "Approved" to publish this timetable' } }],
        },
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: 'Change Status to "Needs Changes" to request modifications' } }],
        },
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: 'Add comments in the "Notes" property for specific override instructions' } }],
        },
      }
    );

    return children;
  }

  async updateTimetableReviewStatus(timetableId: string, status: 'Approved' | 'Needs Changes' | 'Published', notes?: string): Promise<void> {
    const timetable = await prisma.timetable.findUnique({
      where: { id: timetableId },
      select: { metadata: true },
    });

    if (!timetable?.metadata || typeof timetable.metadata !== 'object' || !('notionPageId' in timetable.metadata)) {
      throw new Error('No Notion page associated with this timetable');
    }

    const metadata = timetable.metadata as { notionPageId: string };
    const pageId = metadata.notionPageId;

    await this.client.pages.update({
      page_id: pageId,
      properties: {
        'Status': {
          select: { name: status },
        },
        'Reviewed At': {
          date: { start: new Date().toISOString() },
        },
      },
    });

    if (notes) {
      await this.client.blocks.children.append({
        block_id: pageId,
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: 'Review Notes' } }],
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: notes } }],
            },
          },
        ],
      });
    }
  }

  async getTimetableReviewStatus(timetableId: string): Promise<{ status: string; notes?: string } | null> {
    const timetable = await prisma.timetable.findUnique({
      where: { id: timetableId },
      select: { metadata: true },
    });

    if (!timetable?.metadata || typeof timetable.metadata !== 'object' || !('notionPageId' in timetable.metadata)) {
      return null;
    }

    const metadata = timetable.metadata as { notionPageId: string };
    const pageId = metadata.notionPageId;

    const page = await this.client.pages.retrieve({ page_id: pageId }) as any;
    
    const statusProp = page.properties?.Status;
    let status = 'Pending Review';
    if (statusProp && statusProp.type === 'select' && statusProp.select) {
      status = statusProp.select.name;
    }

    let notes: string | undefined;
    const blocks = await this.client.blocks.children.list({ block_id: pageId });
    for (const block of blocks.results) {
      if ((block as any).type === 'heading_2' && (block as any).heading_2?.rich_text?.[0]?.text?.content === 'Review Notes') {
        const nextBlock = blocks.results[blocks.results.indexOf(block) + 1];
        if (nextBlock && (nextBlock as any).type === 'paragraph') {
          notes = (nextBlock as any).paragraph?.rich_text?.map((t: any) => t.text?.content || '').join('') || '';
        }
        break;
      }
    }

    return { status, notes };
  }

  async syncTimetableFromNotion(timetableId: string): Promise<void> {
    const review = await this.getTimetableReviewStatus(timetableId);
    if (!review) {
      throw new Error('No Notion review found for this timetable');
    }

    await prisma.timetable.update({
      where: { id: timetableId },
      data: {
        metadata: {
          notionStatus: review.status,
          notionNotes: review.notes,
        },
      },
    });
  }
}

export const notionService = new NotionService();