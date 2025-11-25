const express = require('express');
const multer = require('multer');
const path = require('path');
const Issue = require('../models/Issue');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { 
    sendDepartmentNotification, 
    sendStatusUpdateToCitizen,
    getDepartmentName 
} = require('../services/emailService');

// CORRECT IMPORT - Make sure this path is correct
const { sendNewIssueEmail } = require('../config/emailConfig');


// ... your existing code ...
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Issues route is working!' });
});

// Create new issue with department notification
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    console.log('📝 New issue submission received:');
    console.log('   Title:', req.body.title);
    console.log('   Category:', req.body.category);
    console.log('   User ID:', req.user.id);
    console.log('   Images count:', req.files ? req.files.length : 0);

    const { title, description, category, address, lat, lng } = req.body;

    const issue = new Issue({
      title,
      description,
      category,
      location: {
        address: address || 'Unknown location',
        coordinates: { 
          lat: lat ? parseFloat(lat) : 0, 
          lng: lng ? parseFloat(lng) : 0 
        }
      },
      reportedBy: req.user.id,
      images: req.files ? req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path
      })) : []
    });

    await issue.save();
    await issue.populate('reportedBy', 'name email');

    console.log('✅ Issue created in database:', issue._id);

    // Send email notification
    try {
      await sendNewIssueEmail(issue, req.user);
      console.log('✅ Email notification sent');
    } catch (emailError) {
      console.error('❌ Email failed:', emailError.message);
    }

    res.status(201).json({
      message: 'Issue reported successfully',
      issue: {
        id: issue._id,
        title: issue.title,
        category: issue.category,
        status: issue.status
      }
    });

  } catch (error) {
    console.error('❌ Error creating issue:', error);
    res.status(500).json({ 
      message: 'Error reporting issue: ' + error.message 
    });
  }
});
// Get all issues (with filters)
router.get('/', async (req, res) => {
    try {
        const { category, status, page = 1, limit = 100 } = req.query; // Increased limit to get more issues
        const filter = {};
        
        if (category && category !== 'all') filter.category = category;
        if (status && status !== 'all') filter.status = status;

        console.log('Fetching issues with filter:', filter);

        const issues = await Issue.find(filter)
            .populate('reportedBy', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Issue.countDocuments(filter);

        console.log(`Found ${issues.length} issues out of ${total} total`);

        res.json({
            issues,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error('Error fetching issues:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single issue
router.get('/:id', async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.id)
            .populate('reportedBy', 'name email')
            .populate('assignedTo', 'name email')
            .populate('comments.user', 'name role');

        if (!issue) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        res.json(issue);
    } catch (error) {
        console.error('Error fetching issue:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add comment to issue
router.post('/:id/comments', auth, async (req, res) => {
    try {
        const { text, isInternal = false } = req.body;
        const issue = await Issue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        issue.comments.push({
            user: req.user._id,
            text,
            isInternal
        });

        await issue.save();
        await issue.populate('comments.user', 'name role');

        res.json(issue);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update issue status and notify citizen
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status, notes } = req.body;
        const issue = await Issue.findById(req.params.id).populate('reportedBy', 'email name');

        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }

        const oldStatus = issue.status;
        issue.status = status;
        
        if (notes) {
            issue.comments.push({
                user: req.user._id,
                text: `Status updated to ${status}: ${notes}`,
                isInternal: false
            });
        }

        await issue.save();
        await issue.populate('reportedBy', 'email name');
        await issue.populate('comments.user', 'name role');

        // Notify citizen about status change
        if (issue.reportedBy && issue.reportedBy.email) {
            try {
                const departmentName = getDepartmentName(issue.category);
                await sendStatusUpdateToCitizen(
                    issue.reportedBy.email, 
                    issue, 
                    oldStatus, 
                    status, 
                    departmentName
                );
                console.log('Status update notification sent to citizen');
            } catch (emailError) {
                console.warn('Citizen notification email failed:', emailError.message);
            }
        }

        res.json({ 
            success: true, 
            message: 'Status updated successfully', 
            issue,
            department: getDepartmentName(issue.category)
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get issues reported by current user
router.get('/user/my-issues', auth, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const filter = { reportedBy: req.user._id };
        
        if (status && status !== 'all') filter.status = status;

        const issues = await Issue.find(filter)
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Issue.countDocuments(filter);

        res.json({
            issues,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error('Error fetching user issues:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get issues by category for departments
router.get('/department/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { status, page = 1, limit = 50 } = req.query;
        
        const filter = { category };
        if (status && status !== 'all') filter.status = status;

        const issues = await Issue.find(filter)
            .populate('reportedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Issue.countDocuments(filter);

        res.json({
            issues,
            total,
            department: getDepartmentName(category),
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Assign issue to staff member
router.patch('/:id/assign', auth, async (req, res) => {
    try {
        const { assignedTo } = req.body;
        const issue = await Issue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }

        issue.assignedTo = assignedTo;
        issue.status = 'in_progress';
        
        issue.comments.push({
            user: req.user._id,
            text: `Issue assigned to staff member`,
            isInternal: true
        });

        await issue.save();
        await issue.populate('assignedTo', 'name email');
        await issue.populate('reportedBy', 'name email');

        res.json({ 
            success: true, 
            message: 'Issue assigned successfully', 
            issue 
        });
    } catch (error) {
        console.error('Error assigning issue:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Test route for department emails (for development)
router.get('/test/department-email', async (req, res) => {
    try {
        const testIssue = {
            _id: 'test123',
            title: 'Test Issue - Large Pothole on Main Road',
            category: 'pothole',
            description: 'This is a test issue for email functionality. There is a large pothole causing traffic problems.',
            location: { address: 'Gandhi Road, Tirupur' },
            reportedBy: { name: 'Test User' },
            createdAt: new Date(),
            priority: 'high'
        };

        const result = await sendDepartmentNotification(testIssue);
        res.json({ 
            success: true,
            message: 'Test department email sent', 
            result,
            department: getDepartmentName('pothole')
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get issues statistics for dashboard
router.get('/stats/overview', async (req, res) => {
    try {
        const totalIssues = await Issue.countDocuments();
        const resolvedIssues = await Issue.countDocuments({ status: 'resolved' });
        const inProgressIssues = await Issue.countDocuments({ status: 'in_progress' });
        const reportedIssues = await Issue.countDocuments({ status: 'reported' });

        // Issues by category
        const issuesByCategory = await Issue.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Recent issues (last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const recentIssues = await Issue.countDocuments({
            createdAt: { $gte: oneWeekAgo }
        });

        res.json({
            total: totalIssues,
            resolved: resolvedIssues,
            inProgress: inProgressIssues,
            reported: reportedIssues,
            recent: recentIssues,
            byCategory: issuesByCategory
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ message: error.message });
    }
});

// Test real email sending
router.get('/test/real-email', async (req, res) => {
    try {
        const testIssue = {
            _id: 'test-real-123',
            title: 'TEST: Large Pothole on Gandhi Road',
            category: 'pothole',
            description: 'This is a test email to verify department notifications are working.',
            location: { address: 'Gandhi Road, Tirupur' },
            reportedBy: { name: 'Test User' },
            createdAt: new Date(),
            priority: 'high'
        };

        const result = await sendDepartmentNotification(testIssue);
        
        res.json({
            success: true,
            message: 'Email test completed',
            mode: result.mode,
            details: result
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Test Ethereal email functionality
router.get('/test/ethereal-email', async (req, res) => {
    try {
        const { testEtherealEmail } = require('../services/emailService');
        const result = await testEtherealEmail();
        
        res.json({
            success: result.success,
            message: result.message || result.error,
            previewUrl: result.previewUrl,
            messageId: result.messageId
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
module.exports = router; 