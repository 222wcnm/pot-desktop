import { Ollama } from 'ollama/browser';

export async function recognize(base64, language, options = {}) {
    const { config } = options;

    let { requestPath, model, prompt } = config;

    if (!/https?:\/\/.+/.test(requestPath)) {
        requestPath = `https://${requestPath}`;
    }
    if (requestPath.endsWith('/')) {
        requestPath = requestPath.slice(0, -1);
    }

    const ollama = new Ollama({ host: requestPath });

    const response = await ollama.chat({
        model,
        messages: [
            {
                role: 'user',
                content: prompt,
                images: [base64],
            },
        ],
        stream: false,
    });

    if (response.message && response.message.content) {
        return response.message.content.trim();
    } else {
        throw 'No response from Ollama';
    }
}

export * from './Config';
export * from './info';
