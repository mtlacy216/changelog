export type CardSize = 'large' | 'medium' | 'small';

export interface RawItem {
  themes?: string[];
  engagement?: number;
  date?: string | number | Date;
  [key: string]: any;
}

export interface NormalizedItem extends RawItem {
  cardSize: CardSize;
}

/**
 * Normalize raw items and assign a card size based on heuristics.
 *
 * cardSize is determined by:
 *  - number of themes attached to the item
 *  - engagement level
 *  - how recent the item is
 *  - 10% chance promotion to the next larger size
 */
export function normalize(item: RawItem): NormalizedItem {
  const themesCount = item.themes?.length ?? 0;
  const engagement = item.engagement ?? 0;
  const timestamp = new Date(item.date ?? Date.now()).getTime();
  const recencyDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);

  let cardSize: CardSize = 'small';

  // Basic heuristic for assigning size
  if (themesCount > 5 || engagement > 5000 || recencyDays < 2) {
    cardSize = 'large';
  } else if (themesCount > 2 || engagement > 1000 || recencyDays < 7) {
    cardSize = 'medium';
  }

  // 10% random promotion to the next size up
  if (Math.random() < 0.1) {
    cardSize = cardSize === 'large' ? 'large' : cardSize === 'medium' ? 'large' : 'medium';
  }

  return { ...item, cardSize };
}
