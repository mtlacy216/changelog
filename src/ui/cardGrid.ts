import { NormalizedItem } from '../data/normalize';
import { createLargeCard } from './cards/large';
import { createMediumCard } from './cards/medium';
import { createSmallCard } from './cards/small';

interface Span {
  col: number;
  row: number;
}

function getSpan(size: NormalizedItem['cardSize']): Span {
  switch (size) {
    case 'large':
      return { col: 2, row: 2 };
    case 'medium':
      return { col: 2, row: 1 };
    default:
      return { col: 1, row: 1 };
  }
}

export function renderCardGrid(container: HTMLElement, items: NormalizedItem[]): void {
  container.classList.add('card-grid');

  items.forEach((item) => {
    let card: HTMLElement;
    switch (item.cardSize) {
      case 'large':
        card = createLargeCard(item);
        break;
      case 'medium':
        card = createMediumCard(item);
        break;
      default:
        card = createSmallCard(item);
    }

    const span = getSpan(item.cardSize);
    card.style.gridColumn = `span ${span.col}`;
    card.style.gridRow = `span ${span.row}`;
    card.dataset.size = item.cardSize;

    container.appendChild(card);
  });
}
