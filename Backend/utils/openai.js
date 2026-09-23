import "dotenv/config";

<<<<<<< HEAD
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

const tryKey = async (message, apiKey) => {
=======
const getOpenAIAPIResponse = async(message) => {
>>>>>>> 32886bdf96754e13bbb2c74c5f9ea3d9abed4a96
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
<<<<<<< HEAD
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: message }],
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

const getOpenAIAPIResponse = async (message) => {
    const keys = getGroqApiKeys();
    if (keys.length === 0) {
        throw new Error("Missing GROQ_API_KEY in Backend/.env");
    }

    let lastError = null;
    for (let i = 0; i < keys.length; i++) {
        try {
            const content = await tryKey(message, keys[i]);
            console.log(`Groq ok: key #${i + 1} of ${keys.length}`);
            return content;
        } catch (err) {
            lastError = err;
            console.log(`Groq API key #${i + 1} failed:`, err.message);
        }
    }

    throw new Error(`All Groq API keys failed — last error: ${lastError?.message || "unknown"}`);
}
=======
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [{
                role: "user",
                content: message
            }]
        })
    };

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", options);
        const data = await response.json();
        return data.choices[0].message.content;
    } catch(err) {
        console.log(err);
    }
}

>>>>>>> 32886bdf96754e13bbb2c74c5f9ea3d9abed4a96
export default getOpenAIAPIResponse;