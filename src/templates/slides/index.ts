export { DpkTemplateSlides, defineSlidesElement } from './element';
export { slidesDefinitionFor, slidesHasTarget } from './definition';
export { slideKeyStep, stepSlide } from './interactions';
export type { SlideKey, SlideStep } from './interactions';
export { slidesMessages } from './messages';
export type { SlidesMessages } from './messages';
export {
  describeSlidesAction,
  resolveSlidesNavigation,
  serializeSlidesAction,
  slidePosition,
  slidesCommentTargets,
  slidesCurrentTarget,
  slidesTargetLabel,
  slidesTitle,
} from './present';
export type { SlidePosition } from './present';
export { SLIDE_LAYOUTS, emptySlidesBase, findSlide, findSlideIndex, parseSlidesBase, slidesBaseSchema } from './model';
export type { Slide, SlideLayout, SlidesState } from './model';
