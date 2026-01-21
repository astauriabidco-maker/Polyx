import { createHash } from 'crypto';

export class IntegrityService {
    /**
     * Generates a SHA-256 hash of the provided content.
     * Used for 'document probant' verification (Qualiopi).
     */
    static generateHash(content: string | Buffer): string {
        return createHash('sha256').update(content).digest('hex');
    }

    /**
     * Verifies if the content matches the provided hash.
     */
    static verify(content: string | Buffer, hash: string): boolean {
        const computedHash = this.generateHash(content);
        return computedHash === hash;
    }

    /**
     * Creates a hash chain link.
     * user for immutable logs.
     */
    static generateLedgerHash(previousHash: string, entryData: string): string {
        return this.generateHash(`${previousHash}:${entryData}`);
    }
}
