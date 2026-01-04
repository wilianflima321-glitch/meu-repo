import { expect } from 'chai';
import { SecureFetch } from '../data/secure-fetch';

describe('SecureFetch', () => {
    let secureFetch: SecureFetch;

    beforeEach(() => {
        secureFetch = new SecureFetch();
    });

    it('should mask PII', () => {
        const masked = secureFetch.maskPII('email a@b.com ssn 123-45-6789');
        expect(masked).to.include('[EMAIL]');
        expect(masked).to.include('[SSN]');
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
            expect.fail('Should have been blocked');
        } catch (error: any) {
            expect(String(error?.message || error)).to.include('deny list');
        }
    });
});
