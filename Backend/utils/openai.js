import "dotenv/config";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
const GROQ_MAX_TOKENS = parseInt(process.env.GROQ_MAX_TOKENS || "800", 10);

const getGroqApiKeys = () => {
    const keys = [process.env.GROQ_API_KEY, process.env.OPENAI_API_KEY];
    const extra = [
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3,
        process.env.GROQ_API_KEY_4,
        process.env.GROQ_API_KEY_5
    ].filter(Boolean);

    return [...new Set([...keys, ...extra].filter(Boolean))];
};

const tryKey = async (messages, apiKey) => {
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            max_tokens: GROQ_MAX_TOKENS
        })
    };

    let response;
    try {
        response = await fetch(GROQ_URL, options);
    } catch (err) {
        throw new Error(`Unable to reach the API: ${err.message}`);
    }

    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error(`API returned a non-JSON response (status ${response.status})`);
    }

    if (!response.ok || data.error) {
        throw new Error(data.error?.message || `API error (status ${response.status})`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
        throw new Error("The API returned an empty response");
    }

    return content;
};

//messages: an ordered array of { role, content } — the recent conversation
//history to answer within. The API key never leaves this file.
const getOpenAIAPIResponse = async (messages) => {
    const keys = getGroqApiKeys();
    if (keys.length === 0) {
        const err = new Error("Missing GROQ_API_KEY in Backend/.env");
        err.upstream = true; //misconfiguration, not a client mistake
        throw err;
    }

    if (!Array.isArray(messages) || messages.length === 0) {
        const err = new Error("getOpenAIAPIResponse requires a non-empty messages array");
        err.upstream = false;
        throw err;
    }

    let lastError = null;
    for (let i = 0; i < keys.length; i++) {
        try {
            const content = await tryKey(messages, keys[i]);
            console.log(`Groq ok: key #${i + 1} of ${keys.length}`);
            return content;
        } catch (err) {
            lastError = err;
            console.log(`Groq API key #${i + 1} failed:`, err.message);
        }
    }

    const err = new Error(`All Groq API keys failed — last error: ${lastError?.message || "unknown"}`);
    err.upstream = true; //lets routes answer 502 instead of a generic 500
    throw err;
}
export default getOpenAIAPIResponse;