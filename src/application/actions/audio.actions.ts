'use server';

import { TTSService } from '@/application/services/tts.service';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function generateQuestionAudioAction(questionId: string, orgId: string) {
    try {
        const question = await prisma.question.findUnique({
            where: { id: questionId }
        });

        if (!question || !question.audioScript) {
            return { success: false, error: 'Question not found or no script' };
        }

        // Generate Audio Buffer
        // Note: For dialogues, ideally we'd split text and use different voices, 
        // but for V1 we'll read the whole script with one neutral voice (alloy).
        const audioBuffer = await TTSService.generateSpeech(question.audioScript, 'alloy');

        // Save to File System (Public directory)
        const fileName = `audio_${questionId}_${Date.now()}.mp3`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'audio');

        // Ensure dir exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, audioBuffer);

        // Update Question with URL relative to public
        const publicUrl = `/uploads/audio/${fileName}`;

        await prisma.question.update({
            where: { id: questionId },
            data: { audioUrl: publicUrl }
        });

        return { success: true, url: publicUrl };
    } catch (error) {
        console.error('Audio Generation Error:', error);
        return { success: false, error: 'Failed to generate audio' };
    }
}
