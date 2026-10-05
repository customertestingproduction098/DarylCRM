const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { validateJob } = require('../middleware/validation');
const { roleMiddleware } = require('../middleware/authorization');
const { uploadVideo } = require('../middleware/upload');
const {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
  getJobsByCustomer,
  completeJob,
  addJobNote,
  uploadJobMedia
} = require('../controllers/jobController');

router.use(authMiddleware);

router.post('/', validateJob, createJob);
router.get('/', getJobs);
router.get('/customer/:customerId', getJobsByCustomer);
router.get('/:id', getJobById);
router.put('/:id', updateJob);
router.patch('/:id/status', updateJobStatus);
router.patch('/:id/complete', completeJob);
router.post('/:id/notes', addJobNote);
router.post('/:id/media', uploadVideo.single('file'), uploadJobMedia);
router.delete('/:id', roleMiddleware(['admin', 'manager']), deleteJob);

module.exports = router;
