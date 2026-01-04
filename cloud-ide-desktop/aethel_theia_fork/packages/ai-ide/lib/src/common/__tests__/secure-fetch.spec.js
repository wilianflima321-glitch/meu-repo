"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const secure_fetch_1 = require("../data/secure-fetch");
describe('SecureFetch', () => {
    let secureFetch;
    beforeEach(() => {
        secureFetch = new secure_fetch_1.SecureFetch();
    });
    it('should mask PII', () => {
        const masked = secureFetch.maskPII('email a@b.com ssn 123-45-6789');
        (0, chai_1.expect)(masked).to.include('[EMAIL]');
        (0, chai_1.expect)(masked).to.include('[SSN]');
    });
    it('should block deny-listed domains before fetching', async () => {
        secureFetch.addToDenyList('example.com');
        try {
            await secureFetch.fetch({
                url: 'https://example.com/data',
                userId: 'u1',
                workspaceId: 'w1',
                purpose: 'test',
            });
            chai_1.expect.fail('Should have been blocked');
        }
        catch (error) {
            (0, chai_1.expect)(String(error?.message || error)).to.include('deny list');
        }
    });
});
