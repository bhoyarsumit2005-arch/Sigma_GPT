//Small fetch wrapper used by the Settings module. Existing components keep
//their inline fetch calls; new code shares this so credentials and JSON
//handling stay consistent.
export const API_BASE = "http://localhost:8080";

export async function apiRequest(path, { method = "GET", body } = {}) {
    const options = {
        method,
        credentials: "include",
    };

    if (body !== undefined) {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${path}`, options);

    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    return { response, data };
}
