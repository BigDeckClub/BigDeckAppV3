import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function testGemini() {
    console.log('Testing Gemini Direct Generation (gemini-2.5-flash)...');
    console.log('API Key present:', !!process.env.GEMINI_API_KEY);

    try {
        const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = 'Extract the Commander name from this prompt: "Atraxa deck please"';
        console.log('Sending prompt:', prompt);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('✓ Success! Response:', text);
    } catch (error) {
        console.error('✗ Error:', error);
        if (error.response) console.error('API Response:', error.response);
    }
}

testGemini();
