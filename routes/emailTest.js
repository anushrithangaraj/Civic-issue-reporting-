const express = require('express');
const { sendNewIssueEmail, departmentEmails, categoryToDepartment } = require('../config/emailConfig');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Email test route is working!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Test email configuration
router.get('/config', (req, res) => {
    res.json({
        emailUser: process.env.EMAIL_USER,
        hasPassword: !!process.env.EMAIL_PASSWORD,
        departmentEmails: departmentEmails,
        categoryMapping: categoryToDepartment
    });
});

// Test email route
router.get('/test-email', async (req, res) => {
    try {
        console.log('📧 Test email endpoint called');
        
        // Test with different categories to see department routing
        const testCategories = ['pothole', 'streetlight', 'garbage', 'water_leak'];
        const testCategory = testCategories[Math.floor(Math.random() * testCategories.length)];
        
        const testIssue = {
            title: `Test ${testCategory} Issue - Urgent Attention Needed`,
            description: 'This is a test issue to verify email functionality. Large issue requiring immediate attention from the department.',
            category: testCategory,
            priority: 'high',
            location: { 
                address: '123 Main Street, Test City, TC 12345' 
            },
            createdAt: new Date()
        };

        const testUser = {
            name: 'Test Citizen',
            email: 'citizen@example.com'
        };

        console.log(`🧪 Testing with category: ${testCategory}`);
        console.log(`📋 Department: ${categoryToDepartment[testCategory]}`);
        console.log(`📨 Recipient: ${departmentEmails[categoryToDepartment[testCategory]]}`);

        const result = await sendNewIssueEmail(testIssue, testUser);
        
        res.json({ 
            success: true,
            message: 'Test email sent successfully!',
            details: {
                category: testCategory,
                department: categoryToDepartment[testCategory],
                recipient: departmentEmails[categoryToDepartment[testCategory]],
                sender: process.env.EMAIL_USER
            }
        });
        
    } catch (error) {
        console.error('❌ Test email failed:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to send test email',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Simple email test without complex template
router.get('/simple-email', async (req, res) => {
    try {
        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        // Verify connection
        await transporter.verify();
        console.log('✅ SMTP connection verified');

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'tanushriraj2005@gmail.com',
            subject: 'Simple Test Email from Civic System',
            text: 'This is a simple test email to verify SMTP configuration.',
            html: '<p>This is a <b>simple test email</b> to verify SMTP configuration.</p>'
        };

        const result = await transporter.sendMail(mailOptions);
        
        res.json({ 
            success: true,
            message: 'Simple test email sent successfully!',
            messageId: result.messageId
        });
        
    } catch (error) {
        console.error('❌ Simple email test failed:', error);
        res.status(500).json({ 
            success: false,
            message: 'Simple email test failed',
            error: error.message
        });
    }
});

module.exports = router;