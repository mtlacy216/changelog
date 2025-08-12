export interface CardPage {
  id: string;
  cards: unknown[];
}

const PAGE_CACHE = 'card_page_cache';

function loadPages(): Record<string, CardPage> {
  try {
    return JSON.parse(sessionStorage.getItem(PAGE_CACHE) || '{}');
  } catch {
    return {};
  }
}

function savePages(pages: Record<string, CardPage>): void {
  sessionStorage.setItem(PAGE_CACHE, JSON.stringify(pages));
}

export async function fetchCardPage(id: string): Promise<CardPage> {
  const pages = loadPages();
  if (pages[id]) {
    return pages[id];
  }
  const resp = await fetch(`/cards/${id}`);
  const data: CardPage = await resp.json();
  pages[id] = data;
  savePages(pages);
  return data;
}
