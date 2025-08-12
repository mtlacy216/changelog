import { NormalizedItem } from '../../data/normalize';

export function createMediumCard(item: NormalizedItem): HTMLElement {
  const el = document.createElement('article');
  el.className = 'card card-medium';
  el.dataset.size = 'medium';
  el.innerHTML = `
    <header><h3>${item.title ?? ''}</h3></header>
    ${item.image ? `<img src="${item.image}" alt="" />` : ''}
    <p>${item.summary?.slice(0, 100) ?? ''}</p>
  `;
  return el;
}
