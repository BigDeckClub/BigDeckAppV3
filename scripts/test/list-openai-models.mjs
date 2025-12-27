import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const models = await openai.models.list();
const gptModels = models.data.filter(m => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3'));
gptModels.sort((a, b) => a.id.localeCompare(b.id));
console.log('=== Your Available GPT Models ===\n');
gptModels.forEach(m => console.log(`  - ${m.id}`));
