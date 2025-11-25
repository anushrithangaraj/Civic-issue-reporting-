const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createDepartmentAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civic_issues');
        
        console.log('🔧 Creating department admin accounts...');

        const departmentAdmins = [
            {
                name: 'Potholes Department Manager',
                email: 'potholes@gmail.com',
                password: '123123',
                role: 'department_staff',
                phone: '+1234567891',
                department: 'public_works' // This will show potholes, road_damage, drainage
            },
            {
                name: 'Street Lights Department Manager',
                email: 'streetlights@gmail.com',
                password: '123123',
                role: 'department_staff',
                phone: '+1234567892',
                department: 'electrical' // This will show only streetlight issues
            },
            {
                name: 'Garbage Department Manager',
                email: 'garbage@gmail.com',
                password: '123123',
                role: 'department_staff',
                department: 'sanitation' // This will show only garbage issues
            },
            {
                name: 'Water Department Manager',
                email: 'water@gmail.com',
                password: '123123',
                role: 'department_staff',
                department: 'water_dept' // This will show only water_leak issues
            }
        ];

        let createdCount = 0;

        for (const adminData of departmentAdmins) {
            const existingAdmin = await User.findOne({ email: adminData.email });
            if (existingAdmin) {
                console.log(`⚠️  User ${adminData.email} already exists`);
                // Update existing user's department
                existingAdmin.department = adminData.department;
                await existingAdmin.save();
                console.log(`↻ Updated department for: ${adminData.email}`);
                continue;
            }

            const adminUser = new User(adminData);
            await adminUser.save();
            createdCount++;
            
            console.log(`✅ Created department admin: ${adminData.name}`);
            console.log(`   Email: ${adminData.email}`);
            console.log(`   Department: ${adminData.department}`);
            console.log('   ---');
        }

        console.log(`🎉 Successfully processed ${departmentAdmins.length} department admin accounts`);
        
    } catch (error) {
        console.error('❌ Error creating department admin accounts:', error);
    } finally {
        await mongoose.connection.close();
    }
};

createDepartmentAdmins();