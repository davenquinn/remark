import Navigation from './slideshow/Navigation';
import Events from './slideshow/Events';
import Slide from './Slide';
import Parser from '../Parser';
import Dom from "../Dom";

class SlideShow {
  constructor(events, options, callback) {
    this.events = events;
    this.options = options || {};
    this.state = {
      blackout: false,
      mirrored: false,
      pause: false
    };
    this.slides = [];
    this.links = {};
    this.slides.byName = {};
    this.slides.byNumber = {};
    this.clone = null;

    this.init = this.init.bind(this);
    this.updateState = this.updateState.bind(this);
    this.getState = this.getState.bind(this);
    this.setState = this.setState.bind(this);
    this.setOptions = this.setOptions.bind(this);
    this.getOptions = this.getOptions.bind(this);
    this.updateOptions = this.updateOptions.bind(this);

    this.createSlides = this.createSlides.bind(this);
    this.loadFromString = this.loadFromString.bind(this);
    this.loadFromSlides = this.loadFromSlides.bind(this);
    this.loadFromUrl = this.loadFromUrl.bind(this);
    this.update = this.update.bind(this);
    this.getLinks = this.getLinks.bind(this);
    this.getSlides = this.getSlides.bind(this);
    this.getSlideCount = this.getSlideCount.bind(this);
    this.getSlideByName = this.getSlideByName.bind(this);
    this.getSlidesByNumber = this.getSlidesByNumber.bind(this);

    this.togglePresenterMode = this.togglePresenterMode.bind(this);
    this.toggleHelp = this.toggleHelp.bind(this);
    this.toggleBlackout = this.toggleBlackout.bind(this);
    this.toggleMirrored = this.toggleMirrored.bind(this);
    this.toggleFullScreen = this.toggleFullScreen.bind(this);
    this.createClone = this.createClone.bind(this);

    this.resetTimer = this.resetTimer.bind(this);

    this.setOptions(options);
    this.init(callback);
  }

  init(callback) {
    this.events.on('toggleBlackout', (opts) => {
      if (opts && opts.propagate === false) {
        return;
      }

      if (this.clone && !this.clone.closed) {
        this.clone.postMessage('toggleBlackout', '*');
      }

      if (window.opener) {
        window.opener.postMessage('toggleBlackout', '*');
      }
    });

    /* Here is where we load the slideshow source
     * from a string, URL, or otherwise. We are changing
     * to add a function-based mode that is evaluated first
     * if provided */
    if (this.options.slides !== null) {
      this.loadFromSlides(this.options.slides);
    } else if (this.options.sourceUrl !== null) {
      this.loadFromUrl(this.options.sourceUrl, callback);
    } else {
      console.log(this.options.source);
      this.loadFromString(this.options.source);

      if (typeof callback === 'function') {
        callback(this);
      }
    }
  }

  updateState(state) {
    this.state = {
      ...this.state,
      ...state
    };
    this.events.emit('stateUpdated', this);
  }

  getState() {
    return this.state;
  }

  setState(state) {
    let modes = ['mirrored', 'blackout', 'pause'];

    modes.forEach((mode) => {
      if (state.hasOwnProperty(mode)) {
        this.events.emit('toggle' + mode.charAt(0).toUpperCase() + mode.slice(1), state[mode]);
      }
    });
  }

  setOptions(options) {
    const defaults = {
      sourceUrl: null,
      slides: null,
      ratio: '4:3',
      highlightStyle: 'default',
      highlightLines: false,
      highlightSpans: false,
      highlightInlineCode: false,
      highlightLanguage: '',
      slideNumberFormat: '%current% / %total%',
      cloneTarget: '_blank',
      excludedClasses: [],
      countIncrementalSlides: true,
      macros: {},
      transition: false,
      transitionSpeed: false,
      slideNumber: false,
      progressBar: false,
      controls: false,
      controlsTutorial: false,
      controlsLayout: 'bottom-right',
      controlsBackArrows: 'faded',
      folio: false,
      center: false,
      allowControl: true,
      navigation: {},
      translations: {},
      marked: {}
    };

    this.options = {
      ...defaults,
      ...options
    };
  }

  getOptions() {
    return this.options;
  }

  updateOptions(options) {
    this.setOptions({
      ...this.options,
      ...options
    });
    this.events.emit('slidesChanged');
  }

  createSlides(parsedSlides) {
    /* This is the crucial place where the slide markdown source
     * is parsed into individual "Slide" elements
     */
    let slides = [];
    let byName = {};
    let layoutSlide;

    slides.byName = {};
    slides.byNumber = {};

    let slideNumber = 0;

    parsedSlides.forEach((slide, i) => {
      let template;

      if (slide.properties.continued === 'true' && i > 0) {
        template = slides[slides.length - 1];
      } else if (byName[slide.properties.template]) {
        template = byName[slide.properties.template];
      } else if (slide.properties.layout === 'false') {
        layoutSlide = undefined;
      } else if (layoutSlide && slide.properties.layout !== 'true') {
        template = layoutSlide;
      }

      if (slide.properties.continued === 'true' &&
        this.options.countIncrementalSlides === false &&
        slide.properties.count === undefined) {
        slide.properties.count = 'false';
      }

      let slideClasses = (slide.properties['class'] || '').split(/[, ]/);
      let excludedClasses = this.options.excludedClasses;
      let slideIsIncluded = slideClasses.filter((slideClass) => {
        return excludedClasses.indexOf(slideClass) !== -1;
      }).length === 0;

      if (slideIsIncluded && slide.properties.layout !== 'true' && slide.properties.count !== 'false') {
        slideNumber++;
        slides.byNumber[slideNumber] = [];
      }

      let slideViewModel = new Slide(slides.length, slideNumber, slide, template);

      if (slide.properties.name) {
        byName[slide.properties.name] = slideViewModel;
      }

      if (slide.properties.layout === 'true') {
        layoutSlide = slideViewModel;
      } else {
        if (slideIsIncluded) {
          slides.push(slideViewModel);
          slides.byNumber[slideNumber].push(slideViewModel);
        }

        if (slide.properties.name) {
          slides.byName[slide.properties.name] = slideViewModel;
        }
      }
    });
    return slides;
  }

  loadFromString(source) {
    source = source || '';
    const parsedSlides = Parser.parse(source, this.options);
    this.loadFromSlides(parsedSlides);
  }

  loadFromSlides(slides) {
    /* Load from a list of slides already defined as objects
     * Slides should have either a "content"<string, Markdown>, "html"<string, HTML>, or "renderer"<function>
     * defined, as well as a properties and links object.
     * */
    slides = slides || [];

    this.slides = this.createSlides(slides);

    this.slides.forEach((slide) => {
      slide.expandVariables();
    });

    // Not necessarily sure yet which links we are extracting
    // here
    this.links = {};
    this.slides.forEach((slide) => {
      for (let id in slide.links) {
        if (slide.links.hasOwnProperty(id)) {
          this.links[id] = slide.links[id];
        }
      }
    });

    this.events.emit('slidesChanged');
  }

  loadFromUrl(url, callback) {
    let xhr = new Dom.XMLHttpRequest();
    xhr.open('GET', this.options.sourceUrl, true);
    xhr.onload = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.options.source = xhr.responseText.replace(/\r\n/g, '\n');
          this.loadFromString(this.options.source);

          if (typeof callback === 'function') {
            callback(this);
          }
        } else {
          throw Error(xhr.statusText);
        }
      }
    };
    xhr.onerror = () => {
      throw Error(xhr.statusText);
    };
    xhr.send(null);
    return xhr;
  }

  update() {
    this.events.emit('resize');
  }

  getLinks() {
    return this.links;
  }

  getSlides() {
    return this.slides.map((slide) => (slide));
  }

  getSlideCount() {
    return this.slides.length;
  }

  getSlideByName(name) {
    return this.slides.byName[name];
  }

  getSlidesByNumber(number) {
    return this.slides.byNumber[number];
  }

  togglePresenterMode() {
    this.events.emit('togglePresenterMode');
  }

  toggleHelp() {
    this.events.emit('toggleHelp');
  }

  toggleBlackout() {
    this.events.emit('toggleBlackout');
  }

  toggleMirrored() {
    this.events.emit('toggleMirrored');
  }

  toggleFullScreen() {
    this.events.emit('toggleFullScreen');
  }

  createClone() {
    this.events.emit('createClone');
  }

  resetTimer() {
    this.events.emit('resetTimer');
  }
}

export default Navigation(Events(SlideShow));
