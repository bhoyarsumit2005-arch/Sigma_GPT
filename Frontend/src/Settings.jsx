import { useContext, useEffect, useMemo, useState } from "react";

import "./Settings.css";
import { MyContext } from "./MyContext.jsx";
import { apiRequest } from "./api.js";
import { getInitials, THEME_OPTIONS, applyTheme } from "./theme.js";
import { avatarFileError, fileToAvatarDataUrl } from "./avatar.js";

const SECTIONS = [
    { id: "profile", label: "Profile", icon: "fa-solid fa-user" },
    { id: "appearance", label: "Appearance", icon: "fa-solid fa-palette" },
    { id: "security", label: "Security", icon: "fa-solid fa-shield-halved" },
    { id: "sessions", label: "Sessions", icon: "fa-solid fa-display" },
    {
        id: "danger",
        label: "Danger Zone",
        icon: "fa-solid fa-triangle-exclamation",
        danger: true,
    },
];

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];

function scorePassword(password) {
    if (!password) return 0;

    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    return Math.min(score, 4);
}

function formatDate(value) {
    try {
        return new Date(value).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        });
    } catch {
        return "Unknown time";
    }
}

function Status({ status }) {
    if (!status) return null;

    return (
        <div
            className={`settings-status ${status.type}`}
            role={status.type === "error" ? "alert" : "status"}
        >
            <i
                className={
                    status.type === "error"
                        ? "fa-solid fa-circle-exclamation"
                        : "fa-solid fa-circle-check"
                }
            ></i>
            {status.message}
        </div>
    );
}

/* ------------------------------- Profile ------------------------------- */
function ProfileSection() {
    const { user, updateUser, sessionExpired } = useContext(MyContext);
    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [status, setStatus] = useState(null);
    const [saving, setSaving] = useState(false);
    const [avatarBusy, setAvatarBusy] = useState(false);
    //local photo shown while its upload is in flight; cleared either way so a
    //failed upload falls back to the stored avatar (or initials)
    const [avatarPreview, setAvatarPreview] = useState("");

    useEffect(() => {
        setName(user?.name || "");
        setEmail(user?.email || "");
    }, [user?.name, user?.email]);

    const dirty =
        name !== (user?.name || "") || email !== (user?.email || "");

    async function handleSubmit(event) {
        event.preventDefault();
        if (saving || !dirty) return;

        setStatus(null);
        setSaving(true);

        try {
            const { response, data } = await apiRequest("/api/auth/profile", {
                method: "PATCH",
                body: { name: name.trim(), email: email.trim() },
            });

            if (response.status === 401) {
                sessionExpired();
                return;
            }

            if (!response.ok) {
                setStatus({
                    type: "error",
                    message: data?.error || "Could not save your changes.",
                });
                return;
            }

            updateUser(data.user);
            setStatus({ type: "success", message: "Profile updated." });
        } catch {
            setStatus({
                type: "error",
                message: "Network error. Please try again.",
            });
        } finally {
            setSaving(false);
        }
    }

    //sends one avatar value to the profile route; "" removes the photo
    async function pushAvatar(dataUrl) {
        setAvatarPreview(dataUrl || "");

        try {
            const { response, data } = await apiRequest("/api/auth/profile", {
                method: "PATCH",
                body: { avatar: dataUrl },
            });

            if (response.status === 401) {
                sessionExpired();
                return;
            }

            if (!response.ok) {
                setStatus({
                    type: "error",
                    message: data?.error || "Could not save your photo.",
                });
                return;
            }

            updateUser(data.user);
            setStatus({
                type: "success",
                message: dataUrl ? "Profile photo updated." : "Photo removed.",
            });
        } catch {
            setStatus({
                type: "error",
                message: "Network error. Please try again.",
            });
        } finally {
            //drop the preview: on success context now holds the new photo,
            //on failure the old one comes back
            setAvatarPreview("");
            setAvatarBusy(false);
        }
    }

    async function handleAvatarPick(event) {
        const file = event.target.files?.[0];
        //reset so picking the same file again still fires a change event
        event.target.value = "";

        if (!file || avatarBusy) return;

        const problem = avatarFileError(file);
        if (problem) {
            setStatus({ type: "error", message: problem });
            return;
        }

        setStatus(null);
        setAvatarBusy(true);

        try {
            const dataUrl = await fileToAvatarDataUrl(file);
            await pushAvatar(dataUrl);
        } catch (error) {
            setStatus({
                type: "error",
                message: error?.message || "Could not read that image.",
            });
            setAvatarBusy(false);
        }
    }

    function removeAvatar() {
        if (avatarBusy) return;
        setStatus(null);
        setAvatarBusy(true);
        pushAvatar("");
    }

    const shownAvatar = avatarPreview || user?.avatar || "";

    return (
        <section className="settings-panel" aria-labelledby="settings-profile">
            <div className="profile-head">
                <div className={`profile-avatar-lg ${avatarBusy ? "busy" : ""}`}>
                    {shownAvatar ? (
                        <img className="avatar-photo" src={shownAvatar} alt="" aria-hidden="true" />
                    ) : (
                        <span aria-hidden="true">{getInitials(name || user?.name)}</span>
                    )}

                    <label className="avatar-edit" title="Change profile photo">
                        <i className="fa-solid fa-camera" aria-hidden="true"></i>
                        <span className="avatar-edit-text">Change profile photo</span>
                        <input
                            className="avatar-file"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleAvatarPick}
                            disabled={avatarBusy}
                        />
                    </label>

                    {avatarBusy && (
                        <span className="avatar-busy" aria-hidden="true">
                            <i className="fa-solid fa-circle-notch fa-spin"></i>
                        </span>
                    )}
                </div>

                <div>
                    <h3 id="settings-profile">{name || "Your profile"}</h3>
                    <small>{email || "No email yet"}</small>
                    {user?.avatar && (
                        <button
                            type="button"
                            className="avatar-remove"
                            onClick={removeAvatar}
                            disabled={avatarBusy}
                        >
                            Remove photo
                        </button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <label className="settings-field">
                    <span>Full name</span>
                    <div className="settings-input">
                        <i className="fa-solid fa-user"></i>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your name"
                            maxLength={80}
                            autoComplete="name"
                            required
                        />
                    </div>
                </label>

                <label className="settings-field">
                    <span>Email address</span>
                    <div className="settings-input">
                        <i className="fa-solid fa-envelope"></i>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            maxLength={254}
                            autoComplete="email"
                            required
                        />
                    </div>
                </label>

                <div className="settings-actions">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving || !dirty}
                    >
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                </div>
            </form>

            <Status status={status} />
        </section>
    );
}

/* ------------------------------ Appearance ----------------------------- */
function AppearanceSection() {
    const { user, updateUser, sessionExpired } = useContext(MyContext);
    const [status, setStatus] = useState(null);
    const [saving, setSaving] = useState(false);

    const current = user?.theme || "dark";

    async function chooseTheme(value) {
        if (saving || value === current) return;

        setStatus(null);
        setSaving(true);

        //apply instantly; the preference is cached locally even if the save fails
        applyTheme(value);
        updateUser({ theme: value });

        try {
            const { response, data } = await apiRequest("/api/auth/profile", {
                method: "PATCH",
                body: { theme: value },
            });

            if (response.status === 401) {
                sessionExpired();
                return;
            }

            if (!response.ok) {
                setStatus({
                    type: "error",
                    message:
                        data?.error ||
                        "Theme applied on this device but could not be saved.",
                });
                return;
            }

            setStatus({ type: "success", message: "Appearance updated." });
        } catch {
            setStatus({
                type: "error",
                message: "Theme applied on this device but not saved to your account.",
            });
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="settings-panel" aria-labelledby="settings-appearance">
            <h3 id="settings-appearance">Appearance</h3>
            <p className="settings-hint">
                Choose how SigmaGPT looks. Your choice is saved to your account
                and applied on every device you sign in from.
            </p>

            <div className="theme-options" role="radiogroup" aria-label="Theme">
                {THEME_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={current === option.value}
                        className={`theme-option ${
                            current === option.value ? "selected" : ""
                        }`}
                        onClick={() => chooseTheme(option.value)}
                        disabled={saving}
                    >
                        <i className={option.icon}></i>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                    </button>
                ))}
            </div>

            <Status status={status} />
        </section>
    );
}

/* ------------------------------- Security ------------------------------ */
function SecuritySection() {
    const { sessionExpired } = useContext(MyContext);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [show, setShow] = useState({
        current: false,
        next: false,
        confirm: false,
    });
    const [status, setStatus] = useState(null);
    const [saving, setSaving] = useState(false);

    const score = useMemo(() => scorePassword(newPassword), [newPassword]);
    const strengthLabel = newPassword
        ? STRENGTH_LABELS[score]
        : "Enter a password";

    function toggle(field) {
        setShow((prev) => ({ ...prev, [field]: !prev[field] }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (saving) return;

        setStatus(null);

        if (newPassword !== confirmPassword) {
            setStatus({ type: "error", message: "New passwords do not match." });
            return;
        }

        if (newPassword.length < 8) {
            setStatus({
                type: "error",
                message: "Password must be at least 8 characters long.",
            });
            return;
        }

        setSaving(true);

        try {
            const { response, data } = await apiRequest(
                "/api/auth/change-password",
                {
                    method: "POST",
                    body: { currentPassword, newPassword },
                }
            );

            if (response.status === 401) {
                if (/password/i.test(data?.error || "")) {
                    setStatus({
                        type: "error",
                        message: data?.error || "Current password is incorrect.",
                    });
                    return;
                }
                sessionExpired();
                return;
            }

            if (!response.ok) {
                setStatus({
                    type: "error",
                    message: data?.error || "Could not change your password.",
                });
                return;
            }

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setStatus({
                type: "success",
                message: data?.message || "Password updated.",
            });
        } catch {
            setStatus({
                type: "error",
                message: "Network error. Please try again.",
            });
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="settings-panel" aria-labelledby="settings-security">
            <h3 id="settings-security">Change password</h3>
            <p className="settings-hint">
                Choose a strong password. Changing it signs out every other
                device but keeps you signed in here.
            </p>

            <form onSubmit={handleSubmit}>
                <div className="settings-field">
                    <label htmlFor="current-password">Current password</label>
                    <div className="settings-input">
                        <i className="fa-solid fa-lock"></i>
                        <input
                            id="current-password"
                            type={show.current ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            autoComplete="current-password"
                            required
                        />
                        <button
                            type="button"
                            className="settings-show"
                            onClick={() => toggle("current")}
                            aria-label={
                                show.current
                                    ? "Hide current password"
                                    : "Show current password"
                            }
                        >
                            {show.current ? "HIDE" : "SHOW"}
                        </button>
                    </div>
                </div>

                <div className="settings-field">
                    <label htmlFor="new-password">New password</label>
                    <div className="settings-input">
                        <i className="fa-solid fa-key"></i>
                        <input
                            id="new-password"
                            type={show.next ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={72}
                            required
                        />
                        <button
                            type="button"
                            className="settings-show"
                            onClick={() => toggle("next")}
                            aria-label={
                                show.next
                                    ? "Hide new password"
                                    : "Show new password"
                            }
                        >
                            {show.next ? "HIDE" : "SHOW"}
                        </button>
                    </div>
                </div>

                <div className="strength" aria-hidden="true">
                    <div className="strength-bars">
                        {[0, 1, 2, 3].map((index) => (
                            <span
                                key={index}
                                className={
                                    newPassword && index < score
                                        ? `filled-${score}`
                                        : ""
                                }
                            ></span>
                        ))}
                    </div>
                    <span className="strength-label">{strengthLabel}</span>
                </div>

                <div className="settings-field">
                    <label htmlFor="confirm-password">Confirm new password</label>
                    <div className="settings-input">
                        <i className="fa-solid fa-key"></i>
                        <input
                            id="confirm-password"
                            type={show.confirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={72}
                            required
                        />
                        <button
                            type="button"
                            className="settings-show"
                            onClick={() => toggle("confirm")}
                            aria-label={
                                show.confirm
                                    ? "Hide confirmation password"
                                    : "Show confirmation password"
                            }
                        >
                            {show.confirm ? "HIDE" : "SHOW"}
                        </button>
                    </div>
                </div>

                <div className="settings-actions">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={
                            saving || !currentPassword || !newPassword
                        }
                    >
                        {saving ? "Updating..." : "Update password"}
                    </button>
                </div>
            </form>

            <Status status={status} />
        </section>
    );
}

/* -------------------------------- Sessions ----------------------------- */
function SessionsSection() {
    const { logout, logoutAll, sessionExpired } = useContext(MyContext);
    const [sessions, setSessions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    async function loadSessions() {
        setLoading(true);
        setError(null);

        try {
            const { response, data } = await apiRequest("/api/auth/sessions");

            if (response.status === 401) {
                sessionExpired();
                return;
            }

            if (!response.ok) {
                setError(data?.error || "Could not load your sessions.");
                return;
            }

            setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleLogoutAll() {
        if (busy) return;
        setBusy(true);
        await logoutAll();
    }

    return (
        <section className="settings-panel" aria-labelledby="settings-sessions">
            <h3 id="settings-sessions">Active sessions</h3>
            <p className="settings-hint">
                These are the devices signed in to your account. Sign out of any
                session you do not recognise.
            </p>

            {loading && <div className="settings-loading">Loading sessions...</div>}

            {!loading && error && <Status status={{ type: "error", message: error }} />}

            {!loading && !error && sessions?.length === 0 && (
                <div className="settings-empty">No active sessions found.</div>
            )}

            {!loading && !error && sessions?.length > 0 && (
                <div className="session-list">
                    {sessions.map((session, index) => (
                        <div
                            key={index}
                            className={`session-item ${
                                session.current ? "current" : ""
                            }`}
                        >
                            <div className="session-icon">
                                <i
                                    className={
                                        /mobile|android|iphone|ipad/i.test(
                                            session.device
                                        )
                                            ? "fa-solid fa-mobile-screen"
                                            : "fa-solid fa-desktop"
                                    }
                                ></i>
                            </div>
                            <div className="session-info">
                                <strong>
                                    {session.device}
                                    {session.current && (
                                        <span className="session-tag">
                                            This device
                                        </span>
                                    )}
                                </strong>
                                <small>
                                    {session.ip
                                        ? `IP ${session.ip} | `
                                        : ""}
                                    Signed in {formatDate(session.createdAt)}
                                </small>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <hr className="settings-divider" />

            <div className="settings-actions">
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={loadSessions}
                    disabled={loading}
                >
                    <i className="fa-solid fa-rotate"></i>
                    Refresh
                </button>
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={logout}
                    disabled={busy}
                >
                    <i className="fa-solid fa-right-from-bracket"></i>
                    Log out this device
                </button>
                <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleLogoutAll}
                    disabled={busy}
                >
                    <i className="fa-solid fa-power-off"></i>
                    Log out of all devices
                </button>
            </div>
        </section>
    );
}

/* ------------------------------ Danger zone ---------------------------- */
function DangerSection() {
    const { handleAccountDeleted, sessionExpired } = useContext(MyContext);
    const [confirming, setConfirming] = useState(false);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    async function confirmDelete() {
        if (busy || !password) return;

        setBusy(true);
        setError(null);

        try {
            const { response, data } = await apiRequest("/api/auth/account", {
                method: "DELETE",
                body: { password },
            });

            if (response.status === 401 && !/password/i.test(data?.error || "")) {
                //not a password problem: the session itself expired
                sessionExpired();
                return;
            }

            if (!response.ok) {
                setError(data?.error || "Could not delete your account.");
                return;
            }

            //account is gone — clear all local user and chat state
            handleAccountDeleted();
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    function cancel() {
        setConfirming(false);
        setPassword("");
        setError(null);
    }

    return (
        <section className="settings-panel" aria-labelledby="settings-danger">
            <h3 id="settings-danger">Danger Zone</h3>
            <p className="settings-hint">
                These actions are permanent and cannot be undone.
            </p>

            <div className="danger-card">
                <h4>
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    Delete account
                </h4>
                <p>
                    Permanently delete your account and every conversation you
                    own. This cannot be undone.
                </p>

                {!confirming && (
                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setConfirming(true)}
                    >
                        <i className="fa-solid fa-trash-can"></i>
                        Delete my account
                    </button>
                )}
            </div>

            {confirming && (
                <div
                    className="confirm-inline"
                    role="alertdialog"
                    aria-labelledby="delete-confirm-title"
                    aria-describedby="delete-confirm-desc"
                >
                    <h4 id="delete-confirm-title">Confirm account deletion</h4>
                    <p id="delete-confirm-desc">
                        Re-enter your password to confirm. Your account and all
                        of your conversations will be deleted immediately.
                    </p>

                    <div className="settings-field">
                        <label htmlFor="delete-password">Password</label>
                        <div className="settings-input">
                            <i className="fa-solid fa-lock"></i>
                            <input
                                id="delete-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                autoFocus
                                required
                            />
                            <button
                                type="button"
                                className="settings-show"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >
                                {showPassword ? "HIDE" : "SHOW"}
                            </button>
                        </div>
                    </div>

                    <div className="settings-actions">
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={confirmDelete}
                            disabled={busy || !password}
                        >
                            {busy ? "Deleting..." : "Permanently delete"}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={cancel}
                            disabled={busy}
                        >
                            Cancel
                        </button>
                    </div>

                    <Status status={error ? { type: "error", message: error } : null} />
                </div>
            )}
        </section>
    );
}

/* --------------------------------- Modal ------------------------------- */
export default function Settings() {
    const { closeSettings, user } = useContext(MyContext);
    const [section, setSection] = useState("profile");

    useEffect(() => {
        function onKeyDown(event) {
            if (event.key === "Escape") closeSettings();
        }

        window.addEventListener("keydown", onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [closeSettings]);

    function handleOverlayMouseDown(event) {
        if (event.target === event.currentTarget) closeSettings();
    }

    return (
        <div className="settings-overlay" onMouseDown={handleOverlayMouseDown}>
            <div
                className="settings-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-title"
            >
                <header className="settings-header">
                    <div className="settings-title">
                        <span className="settings-badge">
                            <i className="fa-solid fa-gear"></i>
                        </span>
                        <div>
                            <h2 id="settings-title">Settings</h2>
                            <small>{user?.email || "Your account"}</small>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="settings-close"
                        onClick={closeSettings}
                        aria-label="Close settings"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </header>

                <div className="settings-body">
                    <nav className="settings-nav" aria-label="Settings sections">
                        {SECTIONS.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className={`${section === item.id ? "active" : ""} ${
                                    item.danger ? "danger" : ""
                                }`}
                                aria-current={section === item.id}
                                aria-label={item.label}
                                onClick={() => setSection(item.id)}
                            >
                                <i className={item.icon}></i>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="settings-content">
                        {section === "profile" && <ProfileSection />}
                        {section === "appearance" && <AppearanceSection />}
                        {section === "security" && <SecuritySection />}
                        {section === "sessions" && <SessionsSection />}
                        {section === "danger" && <DangerSection />}
                    </div>
                </div>
            </div>
        </div>
    );
}
