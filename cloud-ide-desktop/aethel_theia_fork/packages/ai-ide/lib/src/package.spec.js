"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
describe('ai-ide package smoke', () => {
    it('runs basic mocha/chai environment', () => {
        (0, chai_1.expect)(true).to.equal(true);
    });
});
