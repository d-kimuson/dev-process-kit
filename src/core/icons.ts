import { html, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleQuestionMark,
  Copy,
  Diamond,
  Focus,
  GripHorizontal,
  GripVertical,
  History,
  KeyRound,
  Link,
  ListChecks,
  Maximize2,
  MessageSquare,
  MessageSquareText,
  Minimize2,
  Minus,
  Moon,
  Move,
  Pencil,
  Plus,
  Redo2,
  Settings,
  Sun,
  Table2,
  Trash,
  Undo2,
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
/** A comment kept as part of the page's content, apart from a review comment for the agent. */
export const iconNote = lucide(MessageSquareText);
export const iconHistory = lucide(History);
export const iconQuestion = lucide(CircleQuestionMark);
export const iconSettings = lucide(Settings);
export const iconLink = lucide(Link);
export const iconCopy = lucide(Copy);
export const iconCheck = lucide(Check);
export const iconPlus = lucide(Plus);
export const iconMinus = lucide(Minus);
export const iconGrip = lucide(GripVertical);
export const iconGripHorizontal = lucide(GripHorizontal);
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
export const iconFocus = lucide(Focus);
export const iconSun = lucide(Sun);
export const iconMoon = lucide(Moon);
export const iconBell = lucide(Bell);
export const iconKey = lucide(KeyRound);
export const iconDiamond = lucide(Diamond);
export const iconTable = lucide(Table2);
export const iconSwitch = lucide(ArrowLeftRight);
export const iconUndo = lucide(Undo2);
export const iconRedo = lucide(Redo2);
export const iconChecklist = lucide(ListChecks);

/**
 * The dev-process-kit mark: one flat path traced from the approved brand artwork
 * (`assets/logo/mark-transparent-light.png`, identical pixels to the dark variant —
 * the mark does not change between schemes). Traced with potrace from a downscaled,
 * thresholded silhouette so the path stays a few hundred bytes; `assets/logo/` keeps
 * the source PNGs for anyone who needs to redo the trace.
 */
export const brandMark = (): TemplateResult => html`<svg viewBox="0 0 190 125" aria-hidden="true" focusable="false">
  <path
    fill="#7463fa"
    fill-rule="evenodd"
    d="M50 16.1c0 15-.1 16-1.7 15.4-1-.4-4.6-1.2-8.1-1.8C19 26-1.3 45 .3 66.8c1 13 10.4 25.7 22.3 30.1A36 36 0 0 0 57 91.3l3.9-3.5V125h20.9l-.1-13.7c-.2-15.6-1.3-14.2 9-12.3 8.3 1.5 16.9-.6 24.9-6l4.3-3v10h20l.2-13.5.3-13.6 11.4 13.6 11.4 13.5h13.4a48 48 0 0 0 13-.8l-16.1-19.3A245 245 0 0 1 158 60.4c0-.5 6-6.9 13.3-14l15.1-15.2 2-2.2h-26.7l-11 10.8-11 10.7.4-25 .4-25-10.2-.3L120 0v19c0 10.5-.2 19.1-.5 19.1s-2.3-1.3-4.7-2.9a34 34 0 0 0-37.8 0c-3.2 2.2-6 3.8-6 3.8-.2 0-.3-7.8-.1-17.2.2-9.5 0-18.3-.3-19.5C70 0 69.5 0 60 0H50zM31.4 49c-8 1.8-13 8.9-12.1 16.8.6 5 2.9 8.7 7.8 12 2.8 2 4.4 2.3 9 2C45.3 79 51 73.2 51 64.2c0-10.4-9.4-17.7-19.6-15.2m56.1 1.8c-4.1 2.6-6 5-7.5 9.5-2.2 7 1.2 14.7 8 18.2a18 18 0 0 0 16-.7c5.5-3.8 7.4-7.1 7.4-13q-.1-14.6-14.9-15.6c-4.6-.2-6.7.1-9 1.6"
  />
</svg>`;
