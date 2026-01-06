#!/usr/bin/env node

const fs = require('fs');
const vm = require('vm');

class GraphicsStub {
  beginFill() {
    return this;
  }
  beginStroke() {
    return this;
  }
  setStrokeStyle() {
    return this;
  }
  drawRect() {
    return this;
  }
  clear() {
    return this;
  }
  f() {
    return this;
  }
  s() {
    return this;
  }
  p() {
    return this;
  }
}

class TweenStub {
  to() {
    return this;
  }
  wait() {
    return this;
  }
  call() {
    return this;
  }
}

function createStubbedContext() {
  const createjs = {
    MovieClip: function MovieClip() {},
    Bitmap: function Bitmap() {},
    Shape: function Shape() {
      this.graphics = new GraphicsStub();
    },
    Text: function Text() {},
    Rectangle: function Rectangle() {},
    Tween: {
      get() {
        return new TweenStub();
      }
    },
    Sound: {
      play() {
        return { volume: 0, loop: 0 };
      },
      stop() {}
    },
    Ticker: {
      on() {},
      off() {},
      addEventListener() {},
      removeAllEventListeners() {},
      init() {}
    },
    Stage: function Stage() {},
    Touch: {
      enable() {}
    },
    extend(subclass, superclass) {
      subclass.prototype = Object.create(superclass.prototype);
      subclass.prototype.constructor = subclass;
      return subclass.prototype;
    },
    promote(subclass) {
      return subclass;
    }
  };

  const window = {
    addEventListener() {},
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 1
  };

  const document = {
    cookie: '',
    body: {
      clientWidth: 800,
      clientHeight: 600
    }
  };

  const location = { href: '' };

  return {
    console,
    createjs,
    AdobeAn: {},
    window,
    document,
    location
  };
}

function runSmokeTest(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const context = createStubbedContext();
  vm.createContext(context);
  vm.runInContext(code, context, { filename: filePath });
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('Usage: smoke_test.js <file.js> [more files...]');
  process.exit(1);
}

let failed = false;
for (const target of targets) {
  try {
    runSmokeTest(target);
    console.log(`OK: ${target}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL: ${target}`);
    console.error(error);
  }
}

if (failed) {
  process.exit(1);
}
