import { OpenAI } from 'openai';

export class TTSService {
    private static client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    static async generateSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy'): Promise<Buffer> {
        try {
            const mp3 = await this.client.audio.speech.create({
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
