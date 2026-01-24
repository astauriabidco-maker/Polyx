import { OpenAI } from 'openai';

export class TTSService {
    private static _client: OpenAI | null = null;

    // Lazy initialization to avoid crash when OPENAI_API_KEY is not set
    private static getClient(): OpenAI {
        if (!this._client) {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                throw new Error('OPENAI_API_KEY environment variable is not set. Please configure it in Settings → Integrations.');
            }
            this._client = new OpenAI({ apiKey });
        }
        return this._client;
    }

    static async generateSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy'): Promise<Buffer> {
        try {
            const mp3 = await this.getClient().audio.speech.create({
                model: "tts-1",
                voice: voice,
                input: text,
            });

            const buffer = Buffer.from(await mp3.arrayBuffer());
            return buffer;
        } catch (error) {
            console.error("TTS Generation Error:", error);
            throw new Error("Failed to generate speech");
        }
    }
}

