import { describe, expect, it } from 'vitest';

import { atomStyles } from './styles';

/**
 * `atomStyles` is pure CSS (no behavior of its own), so the only thing worth
 * guarding at this layer is that each class an atom is built from is still
 * declared in the sheet — a cheap trip wire against a typo or an accidental
 * deletion while editing it, and against a second atom drifting into the name
 * space of one that already exists. Real rendering is verified in the browser
 * via the sample catalog (see `lp/index.html`).
 */
describe('atomStyles', () => {
  const css = atomStyles.cssText;

  it('keeps the earlier atoms (tree, overview list row)', () => {
    expect(css).toContain('.dpk-tree');
    expect(css).toContain('.dpk-tree-row');
    expect(css).toContain('.dpk-list-row-name');
    expect(css).toContain('.dpk-list-row-swatch');
    expect(css).toContain('.dpk-list-row-icon');
    expect(css).toContain('.dpk-list-row-meta');
    expect(css).toContain('.dpk-list-row-tools');
  });

  it('declares the menu atom and its rows', () => {
    expect(css).toContain('.dpk-menu)');
    expect(css).toContain('.dpk-menu[popover]');
    expect(css).toContain('.dpk-menu[popover]:popover-open');
    expect(css).toContain('.dpk-menu-item');
    expect(css).toContain('.dpk-menu-heading');
    expect(css).toContain('.dpk-menu-separator');
    expect(css).toContain('.dpk-menu-shortcut');
    expect(css).toContain('.dpk-menu-check');
    expect(css).toContain('.dpk-menu-text');
    expect(css).toContain('.dpk-menu-label');
    expect(css).toContain('.dpk-menu-hint');
    expect(css).toContain(".dpk-menu-item[data-tone='danger']");
  });

  it('declares the comment and copy trigger buttons and their states', () => {
    expect(css).toContain('.dpk-comment-btn');
    expect(css).toContain(".dpk-comment-btn[aria-expanded='true']");
    expect(css).toContain('.dpk-comment-btn[data-reveal]');
    expect(css).toContain('.dpk-hover-host):is(:hover, :focus-within) :where(.dpk-comment-btn[data-reveal])');
    expect(css).toContain('.dpk-copy-btn');
    expect(css).toContain(".dpk-copy-btn[data-variant='outline']");
    expect(css).toContain(".dpk-copy-btn):is([data-state='copied'], [data-copied='true'])");
    expect(css).toContain(".dpk-copy-btn):is([data-state='failed'], [data-status='failed'])");
    expect(css).toContain('.dpk-copy-btn):disabled');
  });

  it('declares the timeline, the milestone parts and the add variant', () => {
    expect(css).toContain('ol.dpk-timeline');
    expect(css).toContain('.dpk-timeline-entry');
    expect(css).toContain('.dpk-timeline-when');
    expect(css).toContain('.dpk-timeline-date');
    expect(css).toContain('.dpk-timeline-rail');
    expect(css).toContain('.dpk-timeline-node');
    expect(css).toContain('.dpk-timeline-body');
    expect(css).toContain(".dpk-timeline-entry[data-variant='add']");
    expect(css).toContain('.dpk-timeline-title');
    expect(css).toContain('.dpk-timeline-text');
    expect(css).toContain('dl.dpk-timeline-facts');
    expect(css).toContain('.dpk-timeline-entry[data-at]');
    expect(css).toContain('.dpk-timeline-text[data-empty]');
  });

  it('declares the status mark, its progress ring and the segmented bar', () => {
    expect(css).toContain('.dpk-status-mark');
    expect(css).toContain(".dpk-status-mark[data-size='lg']");
    expect(css).toContain('.dpk-status-mark[data-progress])::before');
    expect(css).toContain('conic-gradient(');
    expect(css).toContain('--dpk-progress');
    expect(css).toContain('.dpk-status-segments');
    expect(css).toContain('.dpk-status-segment');
    expect(css).toContain('.dpk-status-segment[data-empty]');
    expect(css).toContain('--dpk-value, 1');
  });

  it('declares the weight bar and its scale, positioned by --dpk-at', () => {
    expect(css).toContain('.dpk-weight-bar');
    expect(css).toContain('.dpk-weight-track');
    expect(css).toContain('.dpk-weight-part');
    expect(css).toContain('.dpk-weight-name');
    expect(css).toContain('.dpk-weight-value');
    expect(css).toContain('.dpk-weight-end');
    expect(css).toContain('.dpk-weight-scale');
    expect(css).toContain('left: calc(var(--dpk-at, 0) * 1%)');
    expect(css).toContain('.dpk-weight-tick)::before');
  });

  it('declares the link chip with an icon slot and a truncating label', () => {
    expect(css).toContain('.dpk-link-chip)');
    expect(css).toContain('.dpk-link-chip) > :where(svg)');
    expect(css).toContain('.dpk-link-chip) > :where(span)');
    expect(css).toContain('text-overflow: ellipsis');
  });

  it('declares the chart and its drawn parts', () => {
    expect(css).toContain('.dpk-chart)');
    expect(css).toContain('.dpk-chart-head');
    expect(css).toContain('.dpk-chart-title');
    expect(css).toContain('.dpk-chart-value');
    expect(css).toContain('.dpk-chart-plot');
    expect(css).toContain('.dpk-chart-grid');
    expect(css).toContain('.dpk-chart-axis');
    expect(css).toContain('.dpk-chart-tick');
    expect(css).toContain('.dpk-chart-line');
    expect(css).toContain('.dpk-chart-area');
    expect(css).toContain('.dpk-chart-point');
    expect(css).toContain('.dpk-chart-ideal');
    expect(css).toContain('.dpk-chart-mark');
    expect(css).toContain('.dpk-chart-mark-label');
  });

  it('wraps the new atoms in :where(), so a page can still style over them', () => {
    expect(css).toContain(':where(.dpk-menu) {');
    expect(css).toContain(':where(.dpk-comment-btn) {');
    expect(css).toContain(':where(.dpk-copy-btn) {');
    expect(css).toContain(':where(ol.dpk-timeline) {');
    expect(css).toContain(':where(.dpk-status-mark) {');
    expect(css).toContain(':where(.dpk-weight-bar) {');
    expect(css).toContain(':where(.dpk-link-chip) {');
    expect(css).toContain(':where(.dpk-chart) {');
  });
});
