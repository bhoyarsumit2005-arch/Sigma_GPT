//Theme preference helpers.
//
//The preference ("dark" | "light" | "system") is cached in localStorage so the
//correct theme can be painted before React boots (see the inline script in
//index.html). The account copy in MongoDB is the source of truth and overrides
//the cache once the user is known.

export const THEME_STORAGE_KEY = "sigma-theme";

export const THEME_OPTIONS = [
    {
        value: "dark",
        label: "Dark",
        description: "Always use the dark theme",
        icon: "fa-solid fa-moon",
    },
    {
        value: "light",
        label: "Light",
        description: "Always use the light theme",
        icon: "fa-solid fa-sun",
    },
    {
        value: "system",
        label: "System",
        description: "Match your device setting",
        icon: "fa-solid fa-display",
    },
];

export function getStoredTheme() {
    try {
        const value = localStorage.getItem(THEME_STORAGE_KEY);
        return value === "light" || value === "system" ? value : "dark";
    } catch {
        return "dark";
    }
}

export function resolveTheme(preference) {
    if (preference === "system") {
        try {
            return window.matchMedia("(prefers-color-scheme: light)").matches
                ? "light"
                : "dark";
        } catch {
            return "dark";
        }
    }

    return preference === "light" ? "light" : "dark";
}

//Applies the theme to <html data-theme> and caches the preference. Returns the
//resolved theme ("dark" | "light") currently in effect.
export function applyTheme(preference) {
    const safe =
        preference === "light" || preference === "system" ? preference : "dark";
    const resolved = resolveTheme(safe);

    document.documentElement.setAttribute("data-theme", resolved);

    try {
        localStorage.setItem(THEME_STORAGE_KEY, safe);
    } catch {
        //storage may be unavailable (private mode) — the live theme still works
    }

    return resolved;
}

//Avatar initials: up to two letters from the user's name.
export function getInitials(name) {
    const clean = String(name || "").trim();
    if (!clean) return "S";

    return (
        clean
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "S"
    );
}
