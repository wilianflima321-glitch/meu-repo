"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiIdeBrandingContribution = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const ai_ide_branding_widget_1 = require("./ai-ide-branding-widget");
let AiIdeBrandingContribution = class AiIdeBrandingContribution {
    constructor(widget) {
        this.widget = widget;
    }
    async onStart(app) {
        // Ensure the branding bar is attached once the shell is ready.
        if (!this.widget.isAttached) {
            app.shell.addWidget(this.widget, { area: 'top' });
        }
    }
};
exports.AiIdeBrandingContribution = AiIdeBrandingContribution;
exports.AiIdeBrandingContribution = AiIdeBrandingContribution = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(ai_ide_branding_widget_1.AiIdeBrandingWidget)),
    __metadata("design:paramtypes", [ai_ide_branding_widget_1.AiIdeBrandingWidget])
], AiIdeBrandingContribution);
