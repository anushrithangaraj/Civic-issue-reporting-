const express = require('express');
const multer = require('multer');
const router = express.Router();

// Configure multer for image upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Basic image analysis function
const analyzeImageWithAI = async (imageBuffer) => {
    try {
        // Simple analysis - you can enhance this with real AI services later
        return await basicImageAnalysis(imageBuffer);
    } catch (error) {
        console.error('AI analysis error:', error);
        return basicImageAnalysis(imageBuffer);
    }
};

// Basic image analysis fallback
const basicImageAnalysis = async (imageBuffer) => {
    // Simple placeholder analysis
    return {
        detectedIssues: [],
        suggestedCategory: 'other',
        confidence: 0.3,
        message: 'Image analysis: Please categorize manually for accurate results',
        suggestedTitle: 'Surface issue detected',
        analysisType: 'basic'
    };
};

// AI Analysis endpoint
router.post('/analyze-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        console.log('Analyzing image with AI...');
        const analysisResult = await analyzeImageWithAI(req.file.buffer);

        res.json({
            success: true,
            ...analysisResult
        });

    } catch (error) {
        console.error('AI analysis failed:', error);
        res.status(500).json({
            success: false,
            message: 'AI analysis service temporarily unavailable',
            suggestedCategory: 'other',
            confidence: 0.1,
            analysisType: 'error'
        });
    }
});

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ message: 'AI routes are working!' });
});

module.exports = router;