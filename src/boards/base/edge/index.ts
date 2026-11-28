/**
 * The shared diagram edge vocabulary: glyphs, a line's drawing spec, the Lit
 * body and the styles. A board builds its ends from `END_MARKERS` (or its own
 * `EndMarker`), hands `edgeSteps` a routed polyline, and draws `edgeBody`.
 */
export {
  END_MARKERS,
  arrow,
  circle,
  diamond,
  hollowArrow,
  markerZone,
  openArrow,
  slash,
  type EndMarker,
  type GlyphPaint,
  type GlyphShape,
} from './glyphs';
export { edgeReach, edgeSteps, type EdgeSpec, type EdgeStepsOptions, type FlowStyle, type LineStyle } from './spec';
export {
  EDGE_PATHS,
  edgeBody,
  edgeTextLabel,
  lineStyleClass,
  type EdgeBodyView,
  type EdgeEndView,
  type EdgeTextLabelView,
} from './render';
export { edgeStyles } from './styles';
