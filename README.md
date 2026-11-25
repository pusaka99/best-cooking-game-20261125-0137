# Warung Rush

Game masak 2D yang berjalan offline di browser desktop, dibuat untuk kompetisi
make.fun best-cooking-game-20261125-0137.

## Cara main

Kamu juru masak di sebuah warung. Pelanggan datang dengan pesanan di papan
order — masak hidangannya sebelum kesabaran mereka habis.

1. **Klik bahan** di counter kiri (atau tombol 1–8).
2. **Potong** ayam/sayur di talenan, **masak** nasi/mie/telur/sate di wajan.
   Teh dan es langsung dituang ke piring.
3. **Rakit di piring** — klik piring untuk menambah bahan yang sudah siap.
4. **Klik pesanan pelanggan** untuk mengantar hidangan yang cocok.

- Makanan yang kelamaan di wajan akan hangus — klik wajan untuk membuangnya.
- Pelanggan yang kehabisan sabar pergi dan kamu kehilangan satu hati (3 hati).
- Shift berlangsung 2,5 menit; tiap 30 detik naik level dan pesanan datang
  makin cepat. Sate Ayam baru muncul dari level 2.
- Antar cepat dapat tip; antar berturut-turut tanpa kesalahan menaikkan combo.

Tombol: Spasi mulai · P jeda · S antar piring jadi · T buang · M suara.

## Menu

- **Nasi Goreng** — nasi (masak) + telur (masak) + sayur (potong) — 30 koin
- **Mie Goreng** — mie (masak) + ayam (potong) + sayur (potong) — 30 koin
- **Sate Ayam** — sate (masak) + nasi (masak) + sayur (potong) — 40 koin
- **Es Teh** — teh (tuang) + es (tuang) — 15 koin

## Struktur kode

- `game/src/config.js` — semua angka, warna, resep dan layout
- `game/src/kitchen.js` — aturan main: tangan, talenan, wajan, piring, skor
- `game/src/orders.js` — menu dan antrean pesanan pelanggan
- `game/src/render.js` — semua gambar (canvas, tanpa file gambar)
- `game/src/input.js` — mouse dan keyboard
- `game/src/audio.js` — efek suara synth WebAudio, tanpa file audio
- `game/src/shots.js` — adegan screenshot (bot yang memainkan game sungguhan)
- `game/src/main.js` — loop utama dan layar title/jeda/game over
- `main.ts` — menyerahkan game + screenshot ke /output beserta dossier.json

## Screenshot

`screenshots/` berisi 4 render asli dari kode game (`?shot=cover|play|serve|rush`),
diambil dengan headless Chrome. Jalankan sendiri dengan serve.ts dari kit lalu
buka `http://localhost:8080/?shot=play&seed=7`.
