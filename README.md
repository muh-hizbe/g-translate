# g-translate

![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)
![React](https://img.shields.io/badge/React-19-%2361DAFB.svg?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-%233178C6.svg?style=flat&logo=typescript&logoColor=white)
![Google Translate](https://img.shields.io/badge/google--translate--api--x-10.x-blue?style=flat&logo=google-translate)
![License](https://img.shields.io/badge/license-MIT-green?style=flat)

Aplikasi web terjemahan berbasis **Bun + React** yang menggunakan [`google-translate-api-x`](https://www.npmjs.com/package/google-translate-api-x) sebagai engine terjemahan. Mendukung tiga mode terjemahan, text-to-speech, dan CORS yang dapat dikonfigurasi.

---

## Fitur

- **Translate Single** — terjemahkan satu teks dengan panel input/output berdampingan
- **Translate Batch** — terjemahkan banyak teks sekaligus; input manual per baris atau paste sebagai JSON array
- **Translate Map** — terjemahkan object key-value; input manual atau paste sebagai JSON object; hasil bisa disalin sebagai JSON
- **Pilih Bahasa** — dropdown with search untuk memilih bahasa sumber dan tujuan dari 130+ bahasa; tombol ⇄ untuk swap
- **Text-to-Speech (TTS)** — putar audio hasil terjemahan dan teks asli langsung di browser tanpa menyimpan file
- **Salin Teks** — tombol copy per item hasil terjemahan
- **CORS Configurable** — atur allowed origins via environment variable
- **Hot Module Reloading** — perubahan kode langsung terlihat di browser saat development

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Runtime & Server | [Bun](https://bun.sh) |
| Frontend | [React 19](https://react.dev) + TypeScript |
| Terjemahan & TTS | [google-translate-api-x](https://www.npmjs.com/package/google-translate-api-x) |
| Styling | Vanilla CSS |
| Build | Bun bundler (target browser) |

---

## Instalasi

```bash
# Clone repo
git clone <repo-url>
cd g-translate

# Install dependencies
bun install
```

---

## Menjalankan Aplikasi

### Development

```bash
bun run dev
```

Server berjalan di `http://localhost:3000` dengan HMR aktif.

### Production

```bash
bun run start
```

### Build Statis

```bash
bun run build
# Output di folder dist/
```

---

## Konfigurasi CORS

Buat file `.env` di root project (lihat `.env.example`):

```env
# Izinkan semua origin (default jika tidak diset)
ALLOWED_ORIGINS=*

# Atau daftar origin spesifik, pisahkan dengan koma
ALLOWED_ORIGINS=https://myapp.com,https://staging.myapp.com

# Method yang diizinkan (opsional)
ALLOWED_METHODS=GET,POST,PUT,OPTIONS

# Header yang diizinkan (opsional)
ALLOWED_HEADERS=Content-Type,Authorization
```

> **Catatan:** File `.env` tidak di-commit (sudah ada di `.gitignore`). Gunakan `.env.example` sebagai template.

---

## API Endpoints

Semua endpoint menerima dan mengembalikan JSON. CORS headers ditambahkan otomatis sesuai konfigurasi. Setiap endpoint mendukung preflight `OPTIONS`.

### `POST /api/translate`

Terjemahkan satu teks.

**Request body:**
```json
{
  "text": "Halo dunia",
  "from": "id",
  "to": "ja"
}
```

**Response:**
```json
{
  "original": "Halo dunia",
  "translated": "こんにちは世界",
  "from": "id",
  "to": "ja"
}
```

---

### `POST /api/translate/batch`

Terjemahkan array of strings sekaligus.

**Request body:**
```json
{
  "texts": ["Halo", "Apa kabar", "Selamat pagi"],
  "from": "id",
  "to": "ja"
}
```

**Response:**
```json
[
  { "original": "Halo", "translated": "こんにちは" },
  { "original": "Apa kabar", "translated": "お元気ですか" },
  { "original": "Selamat pagi", "translated": "おはようございます" }
]
```

---

### `POST /api/translate/map`

Terjemahkan object key-value; key dipertahankan.

**Request body:**
```json
{
  "map": {
    "greeting": "Halo",
    "farewell": "Selamat tinggal"
  },
  "from": "id",
  "to": "ja"
}
```

**Response:**
```json
{
  "greeting": { "original": "Halo", "translated": "こんにちは" },
  "farewell": { "original": "Selamat tinggal", "translated": "さようなら" }
}
```

---

### `POST /api/speak`

Hasilkan audio TTS sebagai Base64 MP3.

**Request body:**
```json
{
  "text": "こんにちは世界",
  "lang": "ja"
}
```

**Response:**
```json
{
  "audio": "<base64-encoded-mp3>",
  "lang": "ja"
}
```

> Maksimal 200 karakter per request (batasan Google Translate TTS).

---

## Struktur Proyek

```
g-translate/
├── src/
│   ├── index.ts          # Bun server + semua API endpoints
│   ├── index.html        # HTML entry point
│   ├── frontend.tsx      # React entry point (mount ke DOM)
│   ├── App.tsx           # Root component + tab navigator
│   ├── Translator.tsx    # Mode: single translate
│   ├── TranslateBatch.tsx# Mode: batch translate
│   ├── TranslateMap.tsx  # Mode: map translate
│   ├── LanguageSelector.tsx # Dropdown bahasa dengan search
│   ├── TtsButton.tsx     # Tombol play TTS
│   ├── CopyButton.tsx    # Tombol salin teks
│   ├── useAudioPlayer.ts # Hook: Base64 MP3 → Blob → Audio.play()
│   ├── languages.ts      # Daftar 130+ bahasa yang didukung
│   └── index.css         # Global styles
├── .env.example          # Template konfigurasi environment
├── .gitignore
├── bunfig.toml
├── package.json
└── tsconfig.json
```

---

## Penggunaan Kode Bahasa

Parameter `from` dan `to` menggunakan kode ISO 639-1 yang didukung Google Translate. Gunakan `"auto"` untuk deteksi bahasa otomatis pada `from`.

Contoh kode umum: `id` (Indonesia), `en` (English), `ja` (Japanese), `ko` (Korean), `zh-CN` (Chinese Simplified), `ar` (Arabic).

Lihat daftar lengkap di [`src/languages.ts`](src/languages.ts).

---

## Lisensi

MIT
