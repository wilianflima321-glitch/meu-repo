import { expect } from 'chai';
import { SecretsVault, getSecretsVault, resetSecretsVault } from '../secrets-vault';

describe('SecretsVault', () => {
    let vault: SecretsVault;

    beforeEach(() => {
        // Use a fixed master key for testing
        const testMasterKey = Buffer.from('a'.repeat(32)).toString('base64');
        vault = new SecretsVault(testMasterKey);
    });

    afterEach(() => {
        resetSecretsVault();
    });

    it('should encrypt and decrypt a string', () => {
        const plaintext = 'my-secret-api-key';
        const encrypted = vault.encrypt(plaintext);
        const decrypted = vault.decrypt(encrypted);

        expect(decrypted).to.equal(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
        const plaintext = 'my-secret';
        const encrypted1 = vault.encrypt(plaintext);
        const encrypted2 = vault.encrypt(plaintext);

        expect(encrypted1).to.not.equal(encrypted2);
        
        // But both should decrypt to same plaintext
        expect(vault.decrypt(encrypted1)).to.equal(plaintext);
        expect(vault.decrypt(encrypted2)).to.equal(plaintext);
    });

    it('should handle empty strings', () => {
        const plaintext = '';
        const encrypted = vault.encrypt(plaintext);
        const decrypted = vault.decrypt(encrypted);

        expect(decrypted).to.equal(plaintext);
    });

    it('should handle long strings', () => {
        const plaintext = 'a'.repeat(10000);
        const encrypted = vault.encrypt(plaintext);
        const decrypted = vault.decrypt(encrypted);

        expect(decrypted).to.equal(plaintext);
    });

    it('should handle special characters', () => {
        const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
        const encrypted = vault.encrypt(plaintext);
        const decrypted = vault.decrypt(encrypted);

        expect(decrypted).to.equal(plaintext);
    });

    it('should handle unicode characters', () => {
        const plaintext = '你好世界 🌍 مرحبا';
        const encrypted = vault.encrypt(plaintext);
        const decrypted = vault.decrypt(encrypted);

        expect(decrypted).to.equal(plaintext);
    });

    it('should throw error with wrong master key', () => {
        const plaintext = 'secret';
        const encrypted = vault.encrypt(plaintext);

        // Create new vault with different key
        const wrongKeyVault = new SecretsVault(Buffer.from('b'.repeat(32)).toString('base64'));

        expect(() => wrongKeyVault.decrypt(encrypted)).to.throw();
    });

    it('should throw error with tampered ciphertext', () => {
        const plaintext = 'secret';
        const encrypted = vault.encrypt(plaintext);

        // Tamper with the ciphertext
        const tampered = encrypted.replace('a', 'b');

        expect(() => vault.decrypt(tampered)).to.throw();
    });

    it('should return master key', () => {
        const masterKey = vault.getMasterKey();
        expect(masterKey).to.be.a('string');
        expect(masterKey.length).to.be.greaterThan(0);
    });

    describe('Singleton', () => {
        it('should return same instance', () => {
            const vault1 = getSecretsVault();
            const vault2 = getSecretsVault();

            expect(vault1).to.equal(vault2);
        });

        it('should reset instance', () => {
            const vault1 = getSecretsVault();
            resetSecretsVault();
            const vault2 = getSecretsVault();

            expect(vault1).to.not.equal(vault2);
        });

        it('should use provided master key', () => {
            const masterKey = Buffer.from('c'.repeat(32)).toString('base64');
            const vault = getSecretsVault(masterKey);

            const plaintext = 'test';
            const encrypted = vault.encrypt(plaintext);
            const decrypted = vault.decrypt(encrypted);

            expect(decrypted).to.equal(plaintext);
        });
    });

    describe('Encrypted format', () => {
        it('should produce valid JSON', () => {
            const plaintext = 'secret';
            const encrypted = vault.encrypt(plaintext);

            expect(() => JSON.parse(encrypted)).to.not.throw();
        });

        it('should contain required fields', () => {
            const plaintext = 'secret';
            const encrypted = vault.encrypt(plaintext);
            const parsed = JSON.parse(encrypted);

            expect(parsed).to.have.property('iv');
            expect(parsed).to.have.property('encrypted');
            expect(parsed).to.have.property('authTag');
        });

        it('should have hex-encoded fields', () => {
            const plaintext = 'secret';
            const encrypted = vault.encrypt(plaintext);
            const parsed = JSON.parse(encrypted);

            expect(parsed.iv).to.match(/^[0-9a-f]+$/);
            expect(parsed.encrypted).to.match(/^[0-9a-f]+$/);
            expect(parsed.authTag).to.match(/^[0-9a-f]+$/);
        });
    });
});
