import { expect } from 'chai';
import { ContextStore } from '../context/context-store';

describe('ContextStore', () => {
    let store: ContextStore;

    beforeEach(() => {
        store = new ContextStore();
    });

    it('should store and retrieve context', () => {
        store.set('test-key', { data: 'value' });
        const result = store.get('test-key');
        expect(result).to.deep.equal({ data: 'value' });
    });

    it('should return undefined for missing keys', () => {
        const result = store.get('non-existent');
        expect(result).to.be.undefined;
    });

    it('should delete context', () => {
        store.set('test-key', { data: 'value' });
        store.delete('test-key');
        expect(store.get('test-key')).to.be.undefined;
    });

    it('should clear all context', () => {
        store.set('key1', { data: '1' });
        store.set('key2', { data: '2' });
        store.clear();
        expect(store.get('key1')).to.be.undefined;
        expect(store.get('key2')).to.be.undefined;
    });

    it('should check if key exists', () => {
        store.set('test-key', { data: 'value' });
        expect(store.has('test-key')).to.be.true;
        expect(store.has('non-existent')).to.be.false;
    });
});
