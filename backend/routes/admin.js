const express = require('express');
const Issue = require('../models/Issue');
const auth = require('../middleware/auth');
const { getCategoriesForDepartment } = require('../config/departments'); // ADD THIS

const router = express.Router();

// Get all issues with filters (Admin only) - UPDATED FOR DEPARTMENT FILTERING
router.get('/issues', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'department_staff') {
            return res.status(403).json({ message: 'Access denied. Admin rights required.' });
        }

        const { status, category, priority, page = 1, limit = 50 } = req.query;
        const filter = {};
        
        // Apply department filtering for department staff
        if (req.user.role === 'department_staff' && req.user.department) {
            const departmentCategories = getCategoriesForDepartment(req.user.department);
            filter.category = { $in: departmentCategories };
            console.log(`🔧 Filtering issues for ${req.user.department} department:`, departmentCategories);
        }
        
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (priority) filter.priority = priority;

        const issues = await Issue.find(filter)
            .populate('reportedBy', 'name email phone')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Issue.countDocuments(filter);

        // Calculate statistics based on filtered issues
        // Update the stats calculation in the /issues route
const stats = {
    total: await Issue.countDocuments(filter),
    reported: await Issue.countDocuments({ ...filter, status: 'reported' }),
    under_review: await Issue.countDocuments({ ...filter, status: 'under_review' }),
    approved: await Issue.countDocuments({ ...filter, status: 'approved' }),
    in_progress: await Issue.countDocuments({ ...filter, status: 'in_progress' }),
    resolved: await Issue.countDocuments({ ...filter, status: 'resolved' }),
    rejected: await Issue.countDocuments({ ...filter, status: 'rejected' })
};

        res.json({
            issues,
            stats,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total,
            userDepartment: req.user.department // Send department info to frontend
        });
    } catch (error) {
        console.error('Admin issues error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update issue status - ADD DEPARTMENT VALIDATION
router.patch('/issues/:id/status', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'department_staff') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const { status } = req.body;
        const validStatuses = ['reported', 'under_review', 'approved', 'in_progress', 'resolved', 'rejected'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const issue = await Issue.findById(req.params.id);
        if (!issue) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        // Department validation: Department staff can only update issues from their department
        if (req.user.role === 'department_staff') {
            const userCategories = getCategoriesForDepartment(req.user.department);
            if (!userCategories.includes(issue.category)) {
                return res.status(403).json({ 
                    message: `Access denied. You can only update ${req.user.department} department issues.` 
                });
            }
        }

        // Add to comments/history
        issue.comments.push({
            user: req.user._id,
            text: `Status changed from ${issue.status} to ${status} by ${req.user.name}`,
            isInternal: true
        });

        issue.status = status;
        
        // Set resolved date if status is resolved
        if (status === 'resolved') {
            issue.resolutionDetails = {
                resolvedAt: new Date(),
                resolvedBy: req.user._id,
                resolutionNotes: req.body.notes || `Resolved by ${req.user.name}`
            };
        }

        await issue.save();
        await issue.populate('reportedBy', 'name email');
        await issue.populate('assignedTo', 'name email');

        res.json({
            message: 'Status updated successfully',
            issue
        });
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update issue priority - ADD DEPARTMENT VALIDATION
router.patch('/issues/:id/priority', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'department_staff') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const { priority } = req.body;
        const validPriorities = ['low', 'medium', 'high', 'critical'];
        
        if (!validPriorities.includes(priority)) {
            return res.status(400).json({ message: 'Invalid priority' });
        }

        const issue = await Issue.findById(req.params.id);
        if (!issue) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        // Department validation
        if (req.user.role === 'department_staff') {
            const userCategories = getCategoriesForDepartment(req.user.department);
            if (!userCategories.includes(issue.category)) {
                return res.status(403).json({ 
                    message: `Access denied. You can only update ${req.user.department} department issues.` 
                });
            }
        }

        const updatedIssue = await Issue.findByIdAndUpdate(
            req.params.id,
            { priority },
            { new: true }
        ).populate('reportedBy', 'name email')
         .populate('assignedTo', 'name email');

        res.json({
            message: 'Priority updated successfully',
            issue: updatedIssue
        });
    } catch (error) {
        console.error('Priority update error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;