const nodemailer = require('nodemailer');

// Department email mapping - using Ethereal test emails
const departmentEmails = {
    pothole: 'tanushriraj2005@gmail.com',
    streetlight: 'saranyavenkatachalam2005@gmail.com',
    garbage: 'sharmilakannusamy09@gmail.com',
    water_leak: 'waterboard.ethereal@example.com',
    road_damage: 'publicworks.ethereal@example.com',
    drainage: 'engineering.ethereal@example.com',
    other: 'admin.ethereal@example.com'
};

const getDepartmentName = (category) => {
    const departments = {
        pothole: 'Public Works Department (Road Maintenance)',
        streetlight: 'Electricity Department',
        garbage: 'Sanitation Department',
        water_leak: 'Water Board',
        road_damage: 'Public Works Department',
        drainage: 'Engineering Department',
        other: 'Administration Department'
    };
    return departments[category] || 'Administration Department';
};

// Ethereal Email Transporter
let etherealTransporter = null;
let etherealAccount = null;

// Create Ethereal test account and transporter
const createEtherealTransporter = async () => {
    try {
        console.log('🔄 Creating Ethereal test email account...');
        
        // Create a test account on Ethereal
        etherealAccount = await nodemailer.createTestAccount();
        
        console.log('✅ Ethereal Test Account Created!');
        console.log('📧 Email:', etherealAccount.user);
        console.log('🔑 Password:', etherealAccount.pass);
        console.log('🌐 View emails at: https://ethereal.email/login');
        console.log('💡 Use these credentials to login and see your test emails!');

        // Create transporter with Ethereal credentials
        etherealTransporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: etherealAccount.user,
                pass: etherealAccount.pass
            }
        });

        // Verify the connection
        await etherealTransporter.verify();
        console.log('✅ Ethereal email transporter is ready!');
        return true;
        
    } catch (error) {
        console.error('❌ Failed to create Ethereal transporter:', error.message);
        return false;
    }
};

// Initialize Ethereal on startup
let etherealEnabled = false;
createEtherealTransporter().then(result => {
    etherealEnabled = result;
});

// Main function to send department notifications via Ethereal
const sendDepartmentNotification = async (issueDetails) => {
    try {
        const departmentName = getDepartmentName(issueDetails.category);
        
        console.log(`\n📧 Attempting to send email to: ${departmentName}`);

        if (!etherealEnabled || !etherealTransporter) {
            console.log('❌ Ethereal not available, using console alert instead');
            return await sendDepartmentAlert(issueDetails);
        }

        // Use the Ethereal test account email as "from" address
        const fromEmail = etherealAccount ? etherealAccount.user : 'noreply@tirupurmunicipal.com';

        const mailOptions = {
            from: `"Tirupur Civic Issues" <${fromEmail}>`,
            to: departmentEmails[issueDetails.category] || departmentEmails.other,
            subject: `🚨 NEW ISSUE: ${issueDetails.title} - ${departmentName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f8f9fa; padding: 20px; }
                        .issue-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #007bff; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
                        .button { background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🚨 New Civic Issue Reported</h1>
                        <p>Department: ${departmentName}</p>
                    </div>
                    
                    <div class="content">
                        <h2>Issue Details</h2>
                        <div class="issue-details">
                            <p><strong>Title:</strong> ${issueDetails.title}</p>
                            <p><strong>Category:</strong> ${issueDetails.category}</p>
                            <p><strong>Location:</strong> ${issueDetails.location?.address || 'Not specified'}</p>
                            <p><strong>Reported By:</strong> ${issueDetails.reportedBy?.name || 'Citizen'}</p>
                            <p><strong>Priority:</strong> ${issueDetails.priority || 'Medium'}</p>
                            <p><strong>Description:</strong><br>${issueDetails.description}</p>
                            <p><strong>Issue ID:</strong> ${issueDetails._id}</p>
                        </div>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/issue/${issueDetails._id}" 
                               class="button">📋 View Issue Details</a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated notification from Tirupur Civic Issues Tracking System</p>
                        <p><strong>⚠️ This is a TEST email via Ethereal</strong></p>
                    </div>
                </body>
                </html>
            `,
            text: `
NEW CIVIC ISSUE - ${departmentName}

Title: ${issueDetails.title}
Category: ${issueDetails.category}
Location: ${issueDetails.location?.address}
Reported By: ${issueDetails.reportedBy?.name || 'Citizen'}
Priority: ${issueDetails.priority || 'Medium'}
Description: ${issueDetails.description}
Issue ID: ${issueDetails._id}

Please review this issue and take appropriate action.

-- Tirupur Civic Issues System (TEST EMAIL)
            `
        };

        console.log('📨 Sending email via Ethereal...');
        const result = await etherealTransporter.sendMail(mailOptions);
        
        // Get the preview URL to view the email
        const previewUrl = nodemailer.getTestMessageUrl(result);
        
        console.log('✅ REAL EMAIL SENT via Ethereal!');
        console.log('📩 Message ID:', result.messageId);
        console.log('👀 Preview URL:', previewUrl);
        console.log('💡 Click the preview URL to view the actual email in your browser!');

        return { 
            success: true, 
            mode: 'ethereal', 
            messageId: result.messageId,
            previewUrl: previewUrl,
            department: departmentName
        };

    } catch (error) {
        console.error('❌ Ethereal email sending failed:', error.message);
        console.log('🔄 Falling back to console alert...');
        return await sendDepartmentAlert(issueDetails);
    }
};

// Enhanced console alerts for departments (fallback)
const sendDepartmentAlert = async (issueDetails) => {
    const departmentName = getDepartmentName(issueDetails.category);
    const departmentEmail = departmentEmails[issueDetails.category] || departmentEmails.other;
    
    console.log('\n' + '='.repeat(80));
    console.log('🚨 DEPARTMENT ALERT - ACTION REQUIRED');
    console.log('='.repeat(80));
    console.log(`📋 Issue Title: ${issueDetails.title}`);
    console.log(`🏢 Department: ${departmentName}`);
    console.log(`📧 Email: ${departmentEmail}`);
    console.log(`📍 Location: ${issueDetails.location?.address}`);
    console.log(`👤 Reported By: ${issueDetails.reportedBy?.name}`);
    console.log(`📝 Description: ${issueDetails.description}`);
    console.log(`🆔 Issue ID: ${issueDetails._id}`);
    console.log(`⏰ Reported: ${new Date(issueDetails.createdAt).toLocaleString()}`);
    console.log('='.repeat(80));
    console.log('💡 In production, this would send an actual email to the department');
    console.log('='.repeat(80) + '\n');
    
    return { 
        success: true, 
        mode: 'console',
        department: departmentName,
        email: departmentEmail
    };
};

// Test function to verify Ethereal setup
const testEtherealEmail = async () => {
    try {
        if (!etherealTransporter) {
            return { success: false, error: 'Ethereal transporter not initialized' };
        }

        const testResult = await etherealTransporter.sendMail({
            from: etherealAccount.user,
            to: 'test@example.com',
            subject: '✅ Ethereal Email Test - Tirupur Civic Issues',
            text: 'This is a test email from your Tirupur Civic Issues system via Ethereal!',
            html: '<h1>✅ Ethereal Test Successful!</h1><p>Your email system is working correctly.</p>'
        });

        const previewUrl = nodemailer.getTestMessageUrl(testResult);
        
        return {
            success: true,
            message: 'Ethereal test email sent successfully',
            previewUrl: previewUrl,
            messageId: testResult.messageId
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Mock functions for other email types (citizen notifications)
const sendStatusUpdateToCitizen = async (userEmail, issueDetails, oldStatus, newStatus, departmentName) => {
    console.log('📧 [MOCK] Status update to citizen:', userEmail);
    return { success: true, mode: 'mock' };
};

const sendIssueReportedEmail = async (userEmail, issueDetails) => {
    console.log('📧 [MOCK] Issue reported confirmation to:', userEmail);
    return { success: true, mode: 'mock' };
};

const sendStatusUpdateEmail = async (userEmail, issueDetails, oldStatus, newStatus) => {
    console.log('📧 [MOCK] Status update to:', userEmail);
    return { success: true, mode: 'mock' };
};

const sendCommentNotificationEmail = async (userEmail, issueDetails, comment) => {
    console.log('📧 [MOCK] Comment notification to:', userEmail);
    return { success: true, mode: 'mock' };
};

module.exports = {
    sendDepartmentNotification,
    sendStatusUpdateToCitizen,
    sendIssueReportedEmail,
    sendStatusUpdateEmail,
    sendCommentNotificationEmail,
    testEtherealEmail,  // Export test function
    departmentEmails,
    getDepartmentName
};