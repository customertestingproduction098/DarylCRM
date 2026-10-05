const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const createUploader = (maxMB, isAllowed) =>
  multer({
    storage,
    limits: { fileSize: maxMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (isAllowed(file)) return cb(null, true);
      cb(new Error('File type not allowed'));
    }
  });

// Before/after job videos
const uploadVideo = createUploader(200, (file) =>
  Boolean(file.mimetype && file.mimetype.startsWith('video/'))
);

// Digital invoice copies (PDF or scanned image)
const uploadDocument = createUploader(25, (file) =>
  ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ||
  /\.(pdf|jpe?g|png|webp)$/i.test(file.originalname || '')
);

module.exports = { uploadVideo, uploadDocument };
