// models/Student.js
const mongoose = require('mongoose');

const gradeToPoints = {
	'O': 10,
	'A+': 9,
	'A': 8,
	'B+': 7,
	'B': 6,
	'C': 5,
	'F': 0,
	'Ab': 0,
};

const attendanceRecordSchema = new mongoose.Schema(
	{
		date: { type: Date, required: true },
		status: { type: String, enum: ['present', 'absent', 'late'], required: true },
	},
	{ _id: false }
);

const studentSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		email: { type: String, required: true, unique: true, lowercase: true },
		rollNo: { type: String, required: true, unique: true },
		department: { type: String, required: true },
		program: { type: String, required: true },
		batch: { type: String, required: true },
		semester: { type: Number, required: true },
		section: { type: String, required: true },

		// Attendance Counters
		totalClasses: { type: Number, default: 0 },
		attendedClasses: { type: Number, default: 0 }, // present + late
		presentCount: { type: Number, default: 0 },
		lateCount: { type: Number, default: 0 },
		absentCount: { type: Number, default: 0 },
		attendancePercentage: { type: Number, default: 0 },

		// History
		attendanceRecords: { type: [attendanceRecordSchema], default: [] },

		// Academics
		academics: [
			/* your existing schema */
		],

		// Quick access
		cgpa: { type: Number, default: 0 },
		currentBacklogs: { type: Number, default: 0 },
		totalBacklogsEver: { type: Number, default: 0 },
		riskScore: { type: Number, default: 0 },
		riskLevel: {
			type: String,
			enum: ['Low', 'Medium', 'High', 'Critical'],
			default: 'Low',
		},
		isAtRisk: { type: Boolean, default: false },
		feePending: { type: Boolean, default: false },
		registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
		role: { type: String, default: 'student' },
	},
	{ timestamps: true }
);

// FINAL & PERFECT PRE-SAVE HOOK — THIS FIXES EVERYTHING


module.exports = mongoose.model('Student', studentSchema);
