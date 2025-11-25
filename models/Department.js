const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    categories: [{
        type: String,
        enum: ['pothole', 'streetlight', 'garbage', 'water_leak', 'road_damage', 'drainage', 'other']
    }],
    phone: String,
    address: String,
    inCharge: {
        name: String,
        email: String,
        phone: String
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Department', departmentSchema);