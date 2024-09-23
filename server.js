require('dotenv').config();
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');
const { v2: cloudinary } = require('cloudinary');

// Inisialisasi Groq dengan API Key
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Konfigurasi Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Membaca prompt dari file JSON
const prompts = JSON.parse(fs.readFileSync(path.join(__dirname, 'prompts.json'), 'utf-8'));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk menyajikan file statis dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Konfigurasi multer tanpa menyimpan file ke disk lokal
const storage = multer.memoryStorage(); // Menggunakan memory storage, bukan disk storage
const upload = multer({ storage: storage });

// Endpoint untuk upload CV
app.post('/upload', upload.single('cv'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or file is not a PDF.' });
    }

    // Upload file ke Cloudinary
    cloudinary.uploader.upload_stream({ resource_type: 'raw' }, (error, result) => {
        if (error) {
            return res.status(500).json({ error: 'Error uploading file to Cloudinary: ' + error.message });
        }

        // Baca file PDF dari URL yang sudah diupload ke Cloudinary
        pdf(req.file.buffer).then((resultPDF) => {
            const extractedText = resultPDF.text;

            // Kirim teks ke API Groq AI untuk di-roast
            roastCV(extractedText)
                .then((roastedText) => {
                    res.json({
                        roastedText,
                        cloudinaryUrl: result.secure_url // URL file yang diupload ke Cloudinary
                    });
                })
                .catch((error) => {
                    res.status(500).json({ error: 'Error with Groq AI API: ' + error.message });
                });
        });
    }).end(req.file.buffer);
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

// Endpoint untuk menghitung jumlah CV yang telah di-roast
app.get('/count-roasted-cvs', async (req, res) => {
    try {
        const result = await cloudinary.api.resources({
            resource_type: 'raw',
            type: 'upload',
            prefix: '', // Prefix jika ada folder khusus
            max_results: 500 // Limit hasil jika ada banyak file
        });

        // Mengirimkan jumlah file ke front-end
        res.json({ count: result.resources.length });
    } catch (error) {
        console.error('Error fetching file count from Cloudinary:', error);
        res.status(500).send('Error fetching file count.');
    }
});


// Jalankan server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
