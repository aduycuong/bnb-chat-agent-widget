/** Định dạng tối thiểu cho tin trợ lý. Chỉ tạo text, strong, em, a, br, p, ul, ol, li. */

export function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.href;
  } catch {
    return null;
  }
}

export function renderAssistantContent(parent: HTMLElement, source: string): void {
  const lines = source.replace(/\r\n?/g, '\n').replace(/<br\s*\/?>/gi, '\n').split('\n');
  const frag = document.createDocumentFragment();
  let paragraph: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length === 0) return;
    const block = document.createElement('p');
    appendInline(block, paragraph.join('\n'));
    frag.append(block);
    paragraph = [];
  };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();

    if (line === '') {
      flushParagraph();
      index += 1;
      continue;
    }

    if (isFence(line)) {
      flushParagraph();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !isFence(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      if (code.length > 0) {
        const block = document.createElement('p');
        code.forEach((entry, entryIndex) => {
          if (entryIndex > 0) block.append(document.createElement('br'));
          block.append(document.createTextNode(entry));
        });
        frag.append(block);
      }
      continue;
    }

    if (isRule(line)) {
      flushParagraph();
      index += 1;
      continue;
    }

    const item = matchListItem(line);
    if (item) {
      flushParagraph();
      const list = item.ordered ? document.createElement('ol') : document.createElement('ul');
      if (list instanceof HTMLOListElement && item.index !== 1) list.start = item.index;
      while (index < lines.length) {
        const next = matchListItem(lines[index].trim());
        if (!next || next.ordered !== item.ordered) break;
        const row = document.createElement('li');
        appendInline(row, next.text);
        list.append(row);
        index += 1;
      }
      frag.append(list);
      continue;
    }

    const cells = matchTable(line);
    if (cells) {
      if (cells.length > 0) paragraph.push(cells.join(' · '));
      index += 1;
      continue;
    }

    const text = stripBlockMarker(line);
    if (text.trim() !== '') paragraph.push(text);
    index += 1;
  }

  flushParagraph();
  parent.append(frag);
}

function appendInline(parent: ParentNode, source: string): void {
  let index = 0;
  let buffer = '';

  const flush = (): void => {
    if (!buffer) return;
    parent.append(document.createTextNode(buffer));
    buffer = '';
  };

  while (index < source.length) {
    const rest = source.slice(index);

    if (source[index] === '\n') {
      flush();
      parent.append(document.createElement('br'));
      index += 1;
      continue;
    }

    if (source[index] === '\\' && '*_`[]()#!~'.includes(source[index + 1] ?? '')) {
      buffer += source[index + 1];
      index += 2;
      continue;
    }

    if (source[index] === '!' && source[index + 1] === '[') {
      const image = readLink(source, index + 1);
      if (image) {
        flush();
        if (image.label) parent.append(document.createTextNode(image.label));
        index = image.end;
        continue;
      }
    }

    if (source[index] === '[') {
      const link = readLink(source, index);
      if (link && link.label.trim() !== '') {
        flush();
        const href = safeHttpUrl(link.url);
        if (href && !(parent instanceof HTMLAnchorElement)) appendAnchor(parent, href, link.label);
        else appendInline(parent, link.label);
        index = link.end;
        continue;
      }
    }

    const angle = /^<(https?:\/\/[^>\s]+)>/i.exec(rest);
    if (angle && !(parent instanceof HTMLAnchorElement)) {
      flush();
      const href = safeHttpUrl(angle[1]);
      if (href) appendAnchor(parent, href, angle[1]);
      else buffer += angle[1];
      index += angle[0].length;
      continue;
    }

    const autolink = /^https?:\/\/[^\s<]+/i.exec(rest);
    if (autolink && !(parent instanceof HTMLAnchorElement)) {
      flush();
      const label = autolink[0].replace(/[.,;:!?)\]]+$/g, '');
      const href = safeHttpUrl(label);
      if (href) appendAnchor(parent, href, label);
      else buffer += label;
      buffer += autolink[0].slice(label.length);
      index += autolink[0].length;
      continue;
    }

    if (rest.startsWith('**') || rest.startsWith('__')) {
      const marker = rest.slice(0, 2);
      const end = source.indexOf(marker, index + 2);
      if (end !== -1) {
        if (end > index + 2) {
          flush();
          const strong = document.createElement('strong');
          appendInline(strong, source.slice(index + 2, end));
          parent.append(strong);
        }
        index = end + 2;
        continue;
      }
    }

    if (rest.startsWith('~~')) {
      const end = source.indexOf('~~', index + 2);
      if (end !== -1) {
        if (end > index + 2) {
          flush();
          appendInline(parent, source.slice(index + 2, end));
        }
        index = end + 2;
        continue;
      }
    }

    if (source[index] === '`') {
      const end = source.indexOf('`', index + 1);
      if (end !== -1) {
        if (end > index + 1) {
          flush();
          parent.append(document.createTextNode(source.slice(index + 1, end)));
        }
        index = end + 1;
        continue;
      }
    }

    if (source[index] === '*' && source[index + 1] !== '*') {
      const end = findClosingStar(source, index + 1);
      if (end !== -1) {
        if (end > index + 1) {
          flush();
          const em = document.createElement('em');
          appendInline(em, source.slice(index + 1, end));
          parent.append(em);
        }
        index = end + 1;
        continue;
      }
    }

    if (source[index] === '_' && source[index + 1] !== '_' && !isWordChar(source[index - 1])) {
      const end = findClosingUnderscore(source, index + 1);
      if (end !== -1) {
        if (end > index + 1) {
          flush();
          const em = document.createElement('em');
          appendInline(em, source.slice(index + 1, end));
          parent.append(em);
        }
        index = end + 1;
        continue;
      }
    }

    const comment = /^<!--[\s\S]*?-->/.exec(rest);
    if (comment) {
      index += comment[0].length;
      continue;
    }

    const tag = /^<\/?[A-Za-z][A-Za-z0-9]*(?:\s[^<>]*?)?>/.exec(rest);
    if (tag) {
      index += tag[0].length;
      continue;
    }

    buffer += source[index];
    index += 1;
  }

  flush();
}

function readLink(source: string, index: number): { label: string; url: string; end: number } | null {
  if (source[index] !== '[') return null;
  let labelEnd = index + 1;
  while (labelEnd < source.length && source[labelEnd] !== ']') {
    if (source[labelEnd] === '\\') labelEnd += 1;
    labelEnd += 1;
  }
  if (source[labelEnd] !== ']' || source[labelEnd + 1] !== '(') return null;
  const label = source.slice(index + 1, labelEnd);
  let cursor = labelEnd + 2;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
  const urlStart = cursor;
  let depth = 0;
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === '\\') {
      cursor += 2;
      continue;
    }
    if (/\s/.test(char) && depth === 0) break;
    if (char === '(') depth += 1;
    else if (char === ')') {
      if (depth === 0) break;
      depth -= 1;
    }
    cursor += 1;
  }
  const url = source.slice(urlStart, cursor);
  if (!url) return null;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
  if (source[cursor] === '"') {
    const titleEnd = source.indexOf('"', cursor + 1);
    if (titleEnd === -1) return null;
    cursor = titleEnd + 1;
    while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
  }
  if (source[cursor] !== ')') return null;
  return { label, url, end: cursor + 1 };
}

function appendAnchor(parent: ParentNode, href: string, label: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  appendInline(anchor, label);
  parent.append(anchor);
}

function findClosingStar(source: string, from: number): number {
  for (let index = from; index < source.length; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }
    if (source[index] !== '*') continue;
    if (source[index + 1] === '*') {
      index += 1;
      continue;
    }
    return index;
  }
  return -1;
}

function findClosingUnderscore(source: string, from: number): number {
  for (let index = from; index < source.length; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }
    if (source[index] === '_' && source[index + 1] !== '_' && !isWordChar(source[index + 1])) return index;
  }
  return -1;
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

function isFence(line: string): boolean {
  return /^`{3,}[^`]*$/.test(line);
}

function isRule(line: string): boolean {
  return /^([-*_])\1{2,}$/.test(line);
}

function matchListItem(line: string): { ordered: boolean; index: number; text: string } | null {
  const unordered = /^[-*+]\s+(.+)$/.exec(line);
  if (unordered) return { ordered: false, index: 1, text: unordered[1] };
  const ordered = /^(\d+)[.)]\s+(.+)$/.exec(line);
  if (!ordered) return null;
  return { ordered: true, index: Number(ordered[1]), text: ordered[2] };
}

function matchTable(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return null;
  if (!trimmed.startsWith('|') && !trimmed.endsWith('|')) return null;
  const cells = trimmed
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
  if (cells.length < 2) return null;
  if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) return [];
  return cells;
}

function stripBlockMarker(line: string): string {
  const heading = /^#{1,6}\s+(.+)$/.exec(line);
  if (heading) return heading[1];
  const quote = /^>\s?([\s\S]*)$/.exec(line);
  if (quote) return quote[1];
  return line;
}
