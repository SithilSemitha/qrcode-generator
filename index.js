const express = require('express');
const ejs = require('ejs');
const qrcode = require('qrcode');
const path = require('path');
const app = express();

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "view"));

app.get('/', (req, res, next) => {
    const defaults = {
        text: req.query.text || '',
        size: 320,
        margin: 4,
        level: 'M',
        dark: '#0b1220',
        light: '#ffffff'
    };

    res.render('index', { ...defaults, qr_code: null, error: null });
});

app.post('/scan', (req, res, next) => {
    const text = (req.body.text || '').toString().trim();

    const size = clampInt(req.body.size, 64, 1024, 320);
    const margin = clampInt(req.body.margin, 0, 20, 4);
    const level = normalizeLevel(req.body.level);
    const dark = normalizeHexColor(req.body.dark, '#0b1220');
    const light = normalizeHexColor(req.body.light, '#ffffff');

    if (!text) {
        return res.status(400).render('index', {
            text,
            size,
            margin,
            level,
            dark,
            light,
            qr_code: null,
            error: 'Please enter a URL or text.'
        });
    }

    qrcode.toDataURL(
        text,
        {
            width: size,
            margin,
            errorCorrectionLevel: level,
            color: { dark, light }
        },
        (err, src) => {
            if (err) {
                return res.status(500).render('index', {
                    text,
                    size,
                    margin,
                    level,
                    dark,
                    light,
                    qr_code: null,
                    error: 'Failed to generate QR code. Please try again.'
                });
            }

            res.render('index', {
                text,
                size,
                margin,
                level,
                dark,
                light,
                qr_code: src,
                error: null
            });
        }
    );
});

app.post('/api/qr', async (req, res) => {
    try {
        const text = (req.body.text || '').toString().trim();
        const size = clampInt(req.body.size, 64, 1024, 320);
        const margin = clampInt(req.body.margin, 0, 20, 4);
        const level = normalizeLevel(req.body.level);
        const dark = normalizeHexColor(req.body.dark, '#0b1220');
        const light = normalizeHexColor(req.body.light, '#ffffff');

        if (!text) {
            return res.status(400).json({ error: 'Please enter a URL or text.' });
        }

        const dataUrl = await qrcode.toDataURL(text, {
            width: size,
            margin,
            errorCorrectionLevel: level,
            color: { dark, light }
        });

        return res.json({ dataUrl });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to generate QR code.' });
    }
});

app.listen(port,() => {
    console.log(`Server is running on port ${port}`);
});

function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function normalizeLevel(value) {
    const v = (value || '').toString().toUpperCase();
    if (v === 'L' || v === 'M' || v === 'Q' || v === 'H') return v;
    return 'M';
}

function normalizeHexColor(value, fallback) {
    const v = (value || '').toString().trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
    return fallback;
}