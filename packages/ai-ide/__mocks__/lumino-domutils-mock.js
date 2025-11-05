// Minimal mock for @lumino/domutils to avoid relying on browser DOM APIs
// during Node-based unit tests. Exports a small set of helpers used by
// Theia/Monaco codepaths; functions are intentionally lightweight/no-op.

function isElement(obj) {
  return !!obj && (typeof obj.nodeType === 'number' || typeof obj.tagName === 'string');
}

function isHTMLElement(obj) {
  return isElement(obj);
}

const ElementExt = {
  // size/position helpers the real library may provide; return zeros/no-op
  resize: function () { /* no-op */ },
  restore: function () { /* no-op */ },
  getSize: function () { return { width: 0, height: 0 }; },
  boxSizing: function (hostNode) {
    // Return an object similar to what some consumers expect. Keep values zeroed
    const horizontal = { left: 0, right: 0 };
    const vertical = { top: 0, bottom: 0 };
    return {
      horizontal,
      vertical,
      horizontalSum: (horizontal.left || 0) + (horizontal.right || 0),
      verticalSum: (vertical.top || 0) + (vertical.bottom || 0)
    };
  }
};

function createElement(tagName) {
  // return a minimal faux element with basic layout properties used by
  // Monaco/Lumino (offsetWidth/offsetHeight/getBoundingClientRect/style)
  const el = {
    tagName: String(tagName).toUpperCase(),
    children: [],
    parentElement: null,
    appendChild(child) { this.children.push(child); child.parentElement = this; },
    remove() { /* no-op */ },
    setAttribute() { /* no-op */ },
    getAttribute() { return null; },
    // layout properties commonly accessed by editors
    offsetWidth: 100,
    offsetHeight: 20,
    clientWidth: 100,
    clientHeight: 20,
    getBoundingClientRect() { return { left: 0, top: 0, width: this.offsetWidth, height: this.offsetHeight, right: this.offsetWidth, bottom: this.offsetHeight }; },
    style: {},
    querySelector(selector) { return null; },
    addEventListener() {},
    removeEventListener() {}
  };
  return el;
}

module.exports = {
  isElement,
  isHTMLElement,
  ElementExt,
  createElement,
  // default export compat
  default: {
    isElement,
    isHTMLElement,
    ElementExt,
    createElement
  }
};
