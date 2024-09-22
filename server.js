require('dotenv').config();
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');

// Inisialisasi Groq dengan API Key
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Membaca prompt dari file JSON
const prompts = JSON.parse(fs.readFileSync(path.join(__dirname, 'prompts.json'), 'utf-8'));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk menyajikan file statis dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Konfigurasi multer untuk menyimpan file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage: storage });

// Endpoint untuk menghitung jumlah file CV yang diupload
app.get('/count-roasted-cvs', (req, res) => {
    const uploadsPath = path.join(__dirname, 'uploads');
    fs.readdir(uploadsPath, (err, files) => {
        if (err) {
            return res.status(500).send('Error reading uploads directory');
        }
        // Hitung jumlah file PDF
        const cvCount = files.filter(file => path.extname(file) === '.pdf').length;
        res.json({ count: cvCount });
    });
});

// Endpoint untuk upload CV
app.post('/upload', upload.single('cv'), (req, res) => {
    const filePath = req.file.path;

    // Baca file PDF dan ekstrak teks
    fs.readFile(filePath, (err, data) => {
        if (err) {
            return res.status(500).send('Error reading PDF file.');
        }

        pdf(data).then((result) => {
            const extractedText = result.text;

            // Kirim teks ke API Groq AI untuk di-roast
            roastCV(extractedText)
                .then((roastedText) => {
                    res.json({ roastedText });
                })
                .catch((error) => {
                    res.status(500).send('Error with Groq AI API: ' + error.message);
                });
        });
    });
});

// Fungsi untuk mengirim teks ke API Groq AI dan mendapatkan hasil roasting
const roastCV = async (text) => {
    try {
        // Menggunakan prompt dari file JSON
        const prompt = prompts.roastPrompt.replace("{text}", text);

        // Memanggil API Groq menggunakan chat completions
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: "llama3-8b-8192", // Model Groq yang ingin digunakan
        });

        // Mengembalikan hasil dari Groq AI
        return chatCompletion.choices[0]?.message?.content || 'No response from Groq AI';
    } catch (error) {
        throw new Error(error.message);
    }
};

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
