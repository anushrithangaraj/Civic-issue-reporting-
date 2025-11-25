const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const issueSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['pothole', 'streetlight', 'garbage', 'water_leak', 'road_damage', 'drainage', 'other'],
        required: true
    },
    location: {
        address: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    status: {
        type: String,
        enum: ['reported', 'under_review', 'approved', 'in_progress', 'resolved', 'rejected'],
        default: 'reported'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    images: [{
        filename: String,
        originalName: String,
        path: String
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        isInternal: {
            type: Boolean,
            default: false
        }
    }],
    resolutionDetails: {
        resolvedAt: Date,
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        resolutionNotes: String,
        beforeImage: String,
        afterImage: String
    },
    // CORRECTED AI Analysis field - properly placed within the schema
    aiAnalysis: {
        detectedIssues: [{
            category: String,
            label: String,
            score: Number
        }],
        suggestedCategory: String,
        confidence: Number,
        analysisType: String,
        analyzedAt: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Issue', issueSchema);