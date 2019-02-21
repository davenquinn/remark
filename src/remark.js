import Api from './remark/Api';
import parseSlides from './parse';
import polyfills from './polyfills';
import './remark.scss';
import './hljs.scss';

// Apply polyfills as needed
polyfills.apply();

// Expose API as `remark`
let remark = new Api();

// Add functionality to parse slides to a list of slides
remark.parseSlides = parseSlides;
window.remark = remark;
