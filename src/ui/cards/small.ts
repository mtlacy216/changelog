import { NormalizedItem } from '../../data/normalize';

export function createSmallCard(item: NormalizedItem): HTMLElement {
  const el = document.createElement('article');
  el.className = 'card card-small';
  el.dataset.size = 'small';
  el.innerHTML = `
    <header><h4>${item.title ?? ''}</h4></header>
  `;
  return el;
}
