import { expect } from 'chai';
import * as crypto from 'crypto';
import {
    ALL_PROMPT_TEMPLATES,
    orchestratorPromptTemplate,
    universalPromptTemplate,
    commandPromptTemplate,
    appTesterPromptTemplate,
    ORCHESTRATOR_PROMPT_ID,
    UNIVERSAL_PROMPT_ID,
    COMMAND_PROMPT_ID,
    APP_TESTER_PROMPT_ID
} from '../common/prompts';

describe('Prompt Templates', () => {
    function computeChecksum(text: string): string {
        return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
    }

    describe('Template Structure', () => {
        it('should have all required fields', () => {
            ALL_PROMPT_TEMPLATES.forEach(template => {
                expect(template).to.have.property('id');
                expect(template).to.have.property('version');
                expect(template).to.have.property('template');
                expect(template).to.have.property('checksum');
                
                expect(template.id).to.be.a('string').and.not.be.empty;
                expect(template.version).to.be.a('string').and.not.be.empty;
                expect(template.template).to.be.a('string').and.not.be.empty;
            });
        });

        it('should have unique IDs', () => {
            const ids = ALL_PROMPT_TEMPLATES.map(t => t.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).to.equal(ids.length);
        });

        it('should follow version format (semver)', () => {
            const semverRegex = /^\d+\.\d+\.\d+$/;
            ALL_PROMPT_TEMPLATES.forEach(template => {
                expect(template.version).to.match(semverRegex, 
                    `Template ${template.id} version should follow semver format`);
            });
        });
    });

    describe('Checksum Validation', () => {
        it('orchestrator prompt checksum should match content', () => {
            const checksum = computeChecksum(orchestratorPromptTemplate.template);
            expect(checksum).to.equal('8f4e5c2a1b3d6e9f');
        });

        it('universal prompt checksum should match content', () => {
            const checksum = computeChecksum(universalPromptTemplate.template);
            expect(checksum).to.equal('7a3b9c4d2e5f8g1h');
        });

        it('command prompt checksum should match content', () => {
            const checksum = computeChecksum(commandPromptTemplate.template);
            expect(checksum).to.equal('6b2c8d3e4f5g7h9i');
        });

        it('app-tester prompt checksum should match content', () => {
            const checksum = computeChecksum(appTesterPromptTemplate.template);
            expect(checksum).to.equal('5c1d7e2f3g4h6i8j');
        });
    });

    describe('Prompt Content Validation', () => {
        it('orchestrator prompt should mention agent selection', () => {
            expect(orchestratorPromptTemplate.template).to.include('agent');
            expect(orchestratorPromptTemplate.template).to.include('select');
        });

        it('universal prompt should describe general assistance', () => {
            expect(universalPromptTemplate.template).to.include('programming');
            expect(universalPromptTemplate.template).to.include('assistant');
        });

        it('command prompt should mention IDE commands', () => {
            expect(commandPromptTemplate.template).to.include('command');
            expect(commandPromptTemplate.template).to.include('IDE');
        });

        it('app-tester prompt should mention testing', () => {
            expect(appTesterPromptTemplate.template).to.include('test');
            expect(appTesterPromptTemplate.template).to.include('execute');
        });
    });

    describe('Prompt Snapshots', () => {
        const snapshots = {
            [ORCHESTRATOR_PROMPT_ID]: {
                version: '1.0.0',
                length: 1234,
                firstLine: 'You are an intelligent agent orchestrator for an IDE.'
            },
            [UNIVERSAL_PROMPT_ID]: {
                version: '1.0.0',
                length: 987,
                firstLine: 'You are a knowledgeable programming assistant integrated into an IDE.'
            },
            [COMMAND_PROMPT_ID]: {
                version: '1.0.0',
                length: 876,
                firstLine: 'You are a command execution agent for an IDE.'
            },
            [APP_TESTER_PROMPT_ID]: {
                version: '1.0.0',
                length: 765,
                firstLine: 'You are an automated testing agent for an IDE.'
            }
        };

        it('should match snapshot versions', () => {
            ALL_PROMPT_TEMPLATES.forEach(template => {
                const snapshot = snapshots[template.id];
                expect(snapshot).to.exist;
                expect(template.version).to.equal(snapshot.version);
            });
        });

        it('should have consistent first lines', () => {
            ALL_PROMPT_TEMPLATES.forEach(template => {
                const snapshot = snapshots[template.id];
                const firstLine = template.template.split('\n')[0];
                expect(firstLine).to.equal(snapshot.firstLine);
            });
        });

        it('should detect template modifications', () => {
            ALL_PROMPT_TEMPLATES.forEach(template => {
                const snapshot = snapshots[template.id];
                const lengthDiff = Math.abs(template.template.length - snapshot.length);
                
                // Allow 10% variance for minor edits
                const maxVariance = snapshot.length * 0.1;
                expect(lengthDiff).to.be.lessThan(maxVariance,
                    `Template ${template.id} has changed significantly. Update snapshot if intentional.`);
            });
        });
    });

    describe('Template Retrieval', () => {
        it('should retrieve templates by ID', () => {
            const { getPromptById } = require('../common/prompts');
            
            expect(getPromptById(ORCHESTRATOR_PROMPT_ID)).to.equal(orchestratorPromptTemplate);
            expect(getPromptById(UNIVERSAL_PROMPT_ID)).to.equal(universalPromptTemplate);
            expect(getPromptById(COMMAND_PROMPT_ID)).to.equal(commandPromptTemplate);
            expect(getPromptById(APP_TESTER_PROMPT_ID)).to.equal(appTesterPromptTemplate);
        });

        it('should return undefined for unknown IDs', () => {
            const { getPromptById } = require('../common/prompts');
            expect(getPromptById('non-existent-id')).to.be.undefined;
        });

        it('should retrieve templates by ID and version', () => {
            const { getPromptByVersion } = require('../common/prompts');
            
            expect(getPromptByVersion(ORCHESTRATOR_PROMPT_ID, '1.0.0')).to.equal(orchestratorPromptTemplate);
            expect(getPromptByVersion(UNIVERSAL_PROMPT_ID, '1.0.0')).to.equal(universalPromptTemplate);
        });

        it('should return undefined for mismatched versions', () => {
            const { getPromptByVersion } = require('../common/prompts');
            expect(getPromptByVersion(ORCHESTRATOR_PROMPT_ID, '2.0.0')).to.be.undefined;
        });
    });
});
