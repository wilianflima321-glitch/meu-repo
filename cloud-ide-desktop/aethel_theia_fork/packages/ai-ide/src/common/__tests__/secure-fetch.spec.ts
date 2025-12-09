import { expect } from 'chai';
import { SecureFetch } from '../data/secure-fetch';

describe('SecureFetch', () => {
    let secureFetch: SecureFetch;

    beforeEach(() => {
        secureFetch = new SecureFetch();
    });

    it('should validate URLs', () => {
        expect(() => secureFetch.validateUrl('https://example.com')).to.not.throw();
        expect(() => secureFetch.validateUrl('http://localhost')).to.throw();
        expect(() => secureFetch.validateUrl('file:///etc/passwd')).to.throw();
    });

    it('should sanitize headers', () => {
        const headers = secureFetch.sanitizeHeaders({
            'Authorization': 'Bearer token',
            'X-Custom': 'value',
        });
        expect(headers).to.have.property('Authorization');
        expect(headers).to.have.property('X-Custom');
    });

    it('should enforce rate limits', async () => {
        const requests = Array.from({ length: 10 }, () => 
            secureFetch.fetch('https://api.example.com/data')
        );
        
        const results = await Promise.allSettled(requests);
        const rejected = results.filter(r => r.status === 'rejected');
        expect(rejected.length).to.be.greaterThan(0);
    });

    it('should handle timeouts', async () => {
        try {
            await secureFetch.fetch('https://httpstat.us/200?sleep=10000', {
                timeout: 1000,
            });
            expect.fail('Should have timed out');
        } catch (error) {
            expect(error.message).to.include('timeout');
        }
    });
});
