import { NormalizedItem } from '../../data/normalize';

export function createLargeCard(item: NormalizedItem): HTMLElement {
  const el = document.createElement('article');
  el.className = 'card card-large';
  el.dataset.size = 'large';
  el.innerHTML = `
    <header><h2>${item.title ?? ''}</h2></header>
    ${item.image ? `<img src="${item.image}" alt="" />` : ''}
    <p>${item.summary ?? ''}</p>
  `;
  return el;
}
