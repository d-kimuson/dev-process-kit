import { html, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  Link,
  Maximize2,
  MessageSquare,
  Minimize2,
  Minus,
  Moon,
  Move,
  Pencil,
  Plus,
  Sun,
  Trash,
  X,
  type IconNode,
} from 'lucide';

const escapeAttribute = (value: string): string => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

/** The children of a Lucide icon, serialized once: Lit then sees the same string on every render. */
const markup = (node: IconNode): string =>
  node
    .map(
      ([tag, attrs]) =>
        `<${tag}${Object.entries(attrs)
          .map(([name, value]) => ` ${name}="${escapeAttribute(String(value))}"`)
          .join('')}></${tag}>`,
    )
    .join('');

/**
 * Turns a [Lucide](https://lucide.dev) icon into an inline SVG: it inherits `currentColor`, scales
 * with the control (the stylesheet sets its size) and stays crisp. Every icon is decorative — the
 * button carries the accessible name.
 */
export const lucide = (node: IconNode): (() => TemplateResult) => {
  const children = markup(node);
  return () =>
    html`<svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      ${unsafeSVG(children)}
    </svg>`;
};

export const iconClose = lucide(X);
export const iconTrash = lucide(Trash);
export const iconPencil = lucide(Pencil);
export const iconComment = lucide(MessageSquare);
export const iconLink = lucide(Link);
export const iconCopy = lucide(Copy);
export const iconCheck = lucide(Check);
export const iconPlus = lucide(Plus);
export const iconMinus = lucide(Minus);
export const iconGrip = lucide(GripVertical);
export const iconMove = lucide(Move);
export const iconArrowUp = lucide(ArrowUp);
export const iconArrowDown = lucide(ArrowDown);
export const iconArrowLeft = lucide(ArrowLeft);
export const iconArrowRight = lucide(ArrowRight);
export const iconChevronLeft = lucide(ChevronLeft);
export const iconChevronRight = lucide(ChevronRight);
export const iconChevronDown = lucide(ChevronDown);
export const iconMaximize = lucide(Maximize2);
export const iconMinimize = lucide(Minimize2);
export const iconSun = lucide(Sun);
export const iconMoon = lucide(Moon);
