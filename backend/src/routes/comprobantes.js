const express  = require('express');
const multer   = require('multer');
const router   = express.Router();
const supabase = require('../utils/supabaseClient');

const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Tipo no permitido. Solo imágenes (JPEG, PNG, GIF, WEBP, HEIC) y PDF.'));
  },
});

// POST /api/comprobantes
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el límite de 10 MB.'
        : err.message;
      return res.status(400).json({ error: msg });
    }
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

    try {
      const ext      = (req.file.originalname.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, req.file.buffer, {
          contentType:  req.file.mimetype,
          cacheControl: '3600',
          upsert:       false,
        });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('comprobantes').getPublicUrl(fileName);
      res.json({ url: data.publicUrl });
    } catch (e) {
      next(e);
    }
  });
});

module.exports = router;
