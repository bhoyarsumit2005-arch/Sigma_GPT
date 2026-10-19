import "dotenv/config";

const GROQ_MAX_TOKENS = parseInt(process.env.GROQ_MAX_TOKENS || "800", 10);
const OPENROUTER_MAX_TOKENS = parseInt(process.env.OPENROUTER_MAX_TOKENS || "", 10);

//Providers are tried in the order they are listed. Within a provider each
//configured key is tried in turn, so a single exhausted/revoked key never
//takes the whole app down. Groq stays first (primary); OpenRouter is only
//reached when every Groq key has failed.
const buildProviders = () => {
    const providers = [];

    const groqKeys = [...new Set([
        process.env.GROQ_API_KEY,
        process.env.OPENAI_API_KEY,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3,
        process.env.GROQ_API_KEY_4,
        process.env.GROQ_API_KEY_5
    ].filter(Boolean))];

    if (groqKeys.length > 0) {
        providers.push({
            name: "Groq",
            url: "https://api.groq.com/openai/v1/chat/completions",
            model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
            maxTokens: GROQ_MAX_TOKENS,
            keys: groqKeys,
            headers: {}
        });
    }

    if (process.env.OPENROUTER_API_KEY) {
        providers.push({
            name: "OpenRouter",
            url: "https://openrouter.ai/api/v1/chat/completions",
            model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
            maxTokens:
                Number.isFinite(OPENROUTER_MAX_TOKENS) && OPENROUTER_MAX_TOKENS > 0
                    ? OPENROUTER_MAX_TOKENS
                    : GROQ_MAX_TOKENS,
            keys: [process.env.OPENROUTER_API_KEY],
            //OpenRouter uses these optional headers for app attribution
            headers: {
                "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
                "X-Title": "SigmaGPT"
            }
        });
    }

    return providers;
};

const tryKey = async (messages, provider, apiKey) => {
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            ...provider.headers
        },
        body: JSON.stringify({
            model: provider.model,
            messages,
            max_tokens: provider.maxTokens
        })
    };

    let response;
    try {
        response = await fetch(provider.url, options);
    } catch (err) {
        throw new Error(`Unable to reach ${provider.name}: ${err.message}`);
    }

    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error(`${provider.name} returned a non-JSON response (status ${response.status})`);
    }

    if (!response.ok || data.error) {
        throw new Error(data.error?.message || `${provider.name} error (status ${response.status})`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
        throw new Error(`${provider.name} returned an empty response`);
    }

    return content;
};

//messages: an ordered array of { role, content } — the recent conversation
//history to answer within. API keys never leave this file.
const getOpenAIAPIResponse = async (messages) => {
    const providers = buildProviders();
    if (providers.length === 0) {
        const err = new Error(
            "No AI provider configured. Add GROQ_API_KEY or OPENROUTER_API_KEY to Backend/.env"
        );
        err.upstream = true; //misconfiguration, not a client mistake
        throw err;
    }

    if (!Array.isArray(messages) || messages.length === 0) {
        const err = new Error("getOpenAIAPIResponse requires a non-empty messages array");
        err.upstream = false;
        throw err;
    }

    let lastError = null;
    let attempt = 0;
    const totalKeys = providers.reduce((sum, p) => sum + p.keys.length, 0);

    for (const provider of providers) {
        for (let i = 0; i < provider.keys.length; i++) {
            attempt++;
            try {
                const content = await tryKey(messages, provider, provider.keys[i]);
                console.log(
                    `${provider.name} ok: key #${i + 1} of ${provider.keys.length} ` +
                    `(attempt ${attempt}/${totalKeys}, model ${provider.model})`
                );
                return content;
            } catch (err) {
                lastError = err;
                console.log(`${provider.name} key #${i + 1} failed:`, err.message);
            }
        }
    }

    const err = new Error(`All AI providers failed — last error: ${lastError?.message || "unknown"}`);
    err.upstream = true; //lets routes answer 502 instead of a generic 500
    throw err;
};

export default getOpenAIAPIResponse;
