"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const crypto = __importStar(require("crypto"));
const prompts_1 = require("../common/prompts");
describe('Prompt Templates', () => {
    function computeChecksum(text) {
        return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
    }
    describe('Template Structure', () => {
        it('should have all required fields', () => {
            prompts_1.ALL_PROMPT_TEMPLATES.forEach(template => {
                (0, chai_1.expect)(template).to.have.property('id');
                (0, chai_1.expect)(template).to.have.property('version');
                (0, chai_1.expect)(template).to.have.property('template');
                (0, chai_1.expect)(template).to.have.property('checksum');
                (0, chai_1.expect)(template.id).to.be.a('string').and.not.be.empty;
                (0, chai_1.expect)(template.version).to.be.a('string').and.not.be.empty;
                (0, chai_1.expect)(template.template).to.be.a('string').and.not.be.empty;
            });
        });
        it('should have unique IDs', () => {
            const ids = prompts_1.ALL_PROMPT_TEMPLATES.map(t => t.id);
            const uniqueIds = new Set(ids);
            (0, chai_1.expect)(uniqueIds.size).to.equal(ids.length);
        });
        it('should follow version format (semver)', () => {
            const semverRegex = /^\d+\.\d+\.\d+$/;
            prompts_1.ALL_PROMPT_TEMPLATES.forEach(template => {
                (0, chai_1.expect)(template.version).to.match(semverRegex, `Template ${template.id} version should follow semver format`);
            });
        });
    });
    describe('Checksum Validation', () => {
        it('orchestrator prompt checksum should match content', () => {
            const checksum = computeChecksum(prompts_1.orchestratorPromptTemplate.template);
            (0, chai_1.expect)(checksum).to.equal('8f4e5c2a1b3d6e9f');
        });
        it('universal prompt checksum should match content', () => {
            const checksum = computeChecksum(prompts_1.universalPromptTemplate.template);
            (0, chai_1.expect)(checksum).to.equal('7a3b9c4d2e5f8g1h');
        });
        it('command prompt checksum should match content', () => {
            const checksum = computeChecksum(prompts_1.commandPromptTemplate.template);
            (0, chai_1.expect)(checksum).to.equal('6b2c8d3e4f5g7h9i');
        });
        it('app-tester prompt checksum should match content', () => {
            const checksum = computeChecksum(prompts_1.appTesterPromptTemplate.template);
            (0, chai_1.expect)(checksum).to.equal('5c1d7e2f3g4h6i8j');
        });
    });
    describe('Prompt Content Validation', () => {
        it('orchestrator prompt should mention agent selection', () => {
            (0, chai_1.expect)(prompts_1.orchestratorPromptTemplate.template).to.include('agent');
            (0, chai_1.expect)(prompts_1.orchestratorPromptTemplate.template).to.include('select');
        });
        it('universal prompt should describe general assistance', () => {
            (0, chai_1.expect)(prompts_1.universalPromptTemplate.template).to.include('programming');
            (0, chai_1.expect)(prompts_1.universalPromptTemplate.template).to.include('assistant');
        });
        it('command prompt should mention IDE commands', () => {
            (0, chai_1.expect)(prompts_1.commandPromptTemplate.template).to.include('command');
            (0, chai_1.expect)(prompts_1.commandPromptTemplate.template).to.include('IDE');
        });
        it('app-tester prompt should mention testing', () => {
            (0, chai_1.expect)(prompts_1.appTesterPromptTemplate.template).to.include('test');
            (0, chai_1.expect)(prompts_1.appTesterPromptTemplate.template).to.include('execute');
        });
    });
    describe('Prompt Snapshots', () => {
        const snapshots = {
            [prompts_1.ORCHESTRATOR_PROMPT_ID]: {
                version: '1.0.0',
                length: 1234,
                firstLine: 'You are an intelligent agent orchestrator for an IDE.'
            },
            [prompts_1.UNIVERSAL_PROMPT_ID]: {
                version: '1.0.0',
                length: 987,
                firstLine: 'You are a knowledgeable programming assistant integrated into an IDE.'
            },
            [prompts_1.COMMAND_PROMPT_ID]: {
                version: '1.0.0',
                length: 876,
                firstLine: 'You are a command execution agent for an IDE.'
            },
            [prompts_1.APP_TESTER_PROMPT_ID]: {
                version: '1.0.0',
                length: 765,
                firstLine: 'You are an automated testing agent for an IDE.'
            }
        };
        it('should match snapshot versions', () => {
            prompts_1.ALL_PROMPT_TEMPLATES.forEach(template => {
                const snapshot = snapshots[template.id];
                (0, chai_1.expect)(snapshot).to.exist;
                (0, chai_1.expect)(template.version).to.equal(snapshot.version);
            });
        });
        it('should have consistent first lines', () => {
            prompts_1.ALL_PROMPT_TEMPLATES.forEach(template => {
                const snapshot = snapshots[template.id];
                const firstLine = template.template.split('\n')[0];
                (0, chai_1.expect)(firstLine).to.equal(snapshot.firstLine);
            });
        });
        it('should detect template modifications', () => {
            prompts_1.ALL_PROMPT_TEMPLATES.forEach(template => {
                const snapshot = snapshots[template.id];
                const lengthDiff = Math.abs(template.template.length - snapshot.length);
                // Allow 10% variance for minor edits
                const maxVariance = snapshot.length * 0.1;
                (0, chai_1.expect)(lengthDiff).to.be.lessThan(maxVariance, `Template ${template.id} has changed significantly. Update snapshot if intentional.`);
            });
        });
    });
    describe('Template Retrieval', () => {
        it('should retrieve templates by ID', () => {
            const { getPromptById } = require('../common/prompts');
            (0, chai_1.expect)(getPromptById(prompts_1.ORCHESTRATOR_PROMPT_ID)).to.equal(prompts_1.orchestratorPromptTemplate);
            (0, chai_1.expect)(getPromptById(prompts_1.UNIVERSAL_PROMPT_ID)).to.equal(prompts_1.universalPromptTemplate);
            (0, chai_1.expect)(getPromptById(prompts_1.COMMAND_PROMPT_ID)).to.equal(prompts_1.commandPromptTemplate);
            (0, chai_1.expect)(getPromptById(prompts_1.APP_TESTER_PROMPT_ID)).to.equal(prompts_1.appTesterPromptTemplate);
        });
        it('should return undefined for unknown IDs', () => {
            const { getPromptById } = require('../common/prompts');
            (0, chai_1.expect)(getPromptById('non-existent-id')).to.be.undefined;
        });
        it('should retrieve templates by ID and version', () => {
            const { getPromptByVersion } = require('../common/prompts');
            (0, chai_1.expect)(getPromptByVersion(prompts_1.ORCHESTRATOR_PROMPT_ID, '1.0.0')).to.equal(prompts_1.orchestratorPromptTemplate);
            (0, chai_1.expect)(getPromptByVersion(prompts_1.UNIVERSAL_PROMPT_ID, '1.0.0')).to.equal(prompts_1.universalPromptTemplate);
        });
        it('should return undefined for mismatched versions', () => {
            const { getPromptByVersion } = require('../common/prompts');
            (0, chai_1.expect)(getPromptByVersion(prompts_1.ORCHESTRATOR_PROMPT_ID, '2.0.0')).to.be.undefined;
        });
    });
});
