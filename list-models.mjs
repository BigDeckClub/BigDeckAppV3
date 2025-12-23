
// List available models
// List available models
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
console.log('Using API Key:', apiKey ? apiKey.substring(0, 5) + '...' : 'NONE');

// We have to use REST API since the SDK doesn't have listModels helper easily accessible in all versions or it might be simpler to debug this way.
// Actually, let's try a simple fetch to the models endpoint.
async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log('Available Models:');
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.displayName})`);
                console.log(`  Supported methods: ${m.supportedGenerationMethods}`);
            });
        } else {
            console.log('No models found or error structure:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Error fetching models:', error);
    }
}

listModels();
