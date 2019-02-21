import Parser from "./remark/Parser";
import {defaultOptions} from './remark/models/SlideShow';

function parseSlides(markdownSource, options) {
  options = options || {}
  options = {
    ...defaultOptions,
    ...options
  };
  return Parser.parse(markdownSource, options);
}

export default parseSlides
