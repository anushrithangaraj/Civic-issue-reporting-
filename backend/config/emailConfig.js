const nodemailer = require('nodemailer');

// Department email mapping
const departmentEmails = {
    'public_works': process.env.PUBLIC_WORKS_EMAIL || 'tanushriraj2005@gmail.com',
    'electrical': process.env.ELECTRICAL_EMAIL || 'saranyavenkatachalam2005@gmail.com',
    'sanitation': process.env.SANITATION_EMAIL || 'sharmilakannusamy09@gmail.com',
    'water_dept': process.env.WATER_DEPT_EMAIL || 'tanushriraj2005@gmail.com',
    'other': process.env.DEFAULT_EMAIL || 'tanushriraj2005@gmail.com'
};

// Category to department mapping
const categoryToDepartment = {
    'pothole': 'public_works',
    'road_damage': 'public_works',
    'drainage': 'public_works',
    'streetlight': 'electrical',
    'garbage': 'sanitation',
    'water_leak': 'water_dept',
    'other': 'other'
};

// Create transporter for Gmail
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

// Email template
const createEmailTemplate = (issue, reporter) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
        .issue-card { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
        .label { font-weight: bold; color: #555; }
        .btn { display: inline-block; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 New Civic Issue Reported</h1>
        </div>
        <div class="content">
            <div class="issue-card">
                <h2>${issue.title}</h2>
                <p><span class="label">Description:</span> ${issue.description}</p>
                <p><span class="label">Category:</span> ${issue.category.replace('_', ' ').toUpperCase()}</p>
                <p><span class="label">Priority:</span> ${issue.priority.toUpperCase()}</p>
                <p><span class="label">Location:</span> ${issue.location?.address || 'Not specified'}</p>
                <p><span class="label">Reported by:</span> ${reporter.name} (${reporter.email})</p>
                <p><span class="label">Reported on:</span> ${new Date(issue.createdAt).toLocaleString()}</p>
            </div>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/dashboard" class="btn">
                View Issue in Dashboard
            </a>
        </div>
    </div>
</body>
</html>
    `;
};

// Main email function
const sendNewIssueEmail = async (issue, reporter) => {
    try {
        console.log('📧 Starting email notification process...');
        
        const department = categoryToDepartment[issue.category] || 'other';
        const toEmail = departmentEmails[department];
        
        console.log('   Department:', department);
        console.log('   Sending to:', toEmail);

        if (!toEmail) {
            throw new Error(`No email configured for department: ${department}`);
        }

        const transporter = createTransporter();
        
        const mailOptions = {
            from: {
                name: 'Civic Issue Reporting System',
                address: process.env.EMAIL_USER
            },
            to: toEmail,
            subject: `🚨 New ${issue.category.replace('_', ' ')} Issue: ${issue.title}`,
            html: createEmailTemplate(issue, reporter),
            text: `New issue reported:\n\nTitle: ${issue.title}\nDescription: ${issue.description}\nCategory: ${issue.category}\nLocation: ${issue.location?.address}\nReported by: ${reporter.name} (${reporter.email})`
        };

        console.log('   Verifying SMTP connection...');
        await transporter.verify();
        console.log('   ✅ SMTP connection verified');

        console.log('   Sending email...');
        const result = await transporter.sendMail(mailOptions);
        console.log('   ✅ Email sent successfully! Message ID:', result.messageId);
        return true;
        
    } catch (error) {
        console.error('   ❌ Email error:', error.message);
        throw error;
    }
};

// Make sure to export the function
module.exports = {
    sendNewIssueEmail,
    departmentEmails,
    categoryToDepartment
};