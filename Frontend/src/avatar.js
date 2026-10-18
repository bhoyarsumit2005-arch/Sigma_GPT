//Profile photo helper: turns a picked file into a small square JPEG data URL
//the backend accepts. The server caps decoded images at 100KB (see
//Backend/routes/auth.js), so the canvas steps down in size/quality until the
//encoded string fits instead of letting the request fail with a 400.

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SOURCE_MAX_BYTES = 5 * 1024 * 1024;
//must match the server cap (100KB decoded, see Backend/routes/auth.js) while
//still being reachable: base64 is 3 bytes → 4 chars, plus the 22-char
//"data:image/jpeg;base64," prefix. floor() keeps the decoded size under the
//limit instead of a hair over it.
const SERVER_MAX_DECODED = 100 * 1024;
const JPEG_PREFIX_LENGTH = "data:image/jpeg;base64,".length;
const MAX_ENCODED_CHARS =
    Math.floor(SERVER_MAX_DECODED / 3) * 4 + JPEG_PREFIX_LENGTH;

//null when the file is usable, otherwise the message to show the user
export function avatarFileError(file) {
    if (!file) return "Choose an image first.";
    if (!ACCEPTED_TYPES.includes(file.type)) {
        return "Use a JPEG, PNG or WebP image.";
    }
    if (file.size > SOURCE_MAX_BYTES) {
        return "That image is larger than 5 MB.";
    }
    return null;
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("The image could not be read."));
        };

        image.src = url;
    });
}

//center-crops the source to a square (the same "cover" the CSS uses) and
//exports a JPEG. quality/size step down until the data URL fits the cap.
export async function fileToAvatarDataUrl(file) {
    const image = await loadImage(file);
    const side = Math.min(image.naturalWidth, image.naturalHeight);

    if (!side) {
        throw new Error("That image has no content.");
    }

    const sx = (image.naturalWidth - side) / 2;
    const sy = (image.naturalHeight - side) / 2;
    const attempts = [
        { size: 256, quality: 0.82 },
        { size: 192, quality: 0.7 },
        { size: 160, quality: 0.65 },
    ];

    let smallest = "";

    for (const { size, quality } of attempts) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        //JPEG has no alpha: paint a backdrop so transparent PNGs do not
        //turn black. The circular CSS mask hides the corners anyway.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);

        smallest = canvas.toDataURL("image/jpeg", quality);

        if (smallest.length <= MAX_ENCODED_CHARS) return smallest;
    }

    //nothing fits: fail here with a clear message rather than a 400 later
    throw new Error("That image is too detailed — try a smaller photo.");
}
