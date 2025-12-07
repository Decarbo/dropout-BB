// models/Student.js
const mongoose = require('mongoose');

const gradeToPoints = {
  'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'F': 0, 'Ab': 0,
};

const attendanceRecordSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], required: true },
}, { _id: false });

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

    // Attendance
    totalClasses: { type: Number, default: 0 },
    attendedClasses: { type: Number, default: 0 }, // present + late
    presentCount: { type: Number, default: 0 },
    lateCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 },
    attendancePercentage: { type: Number, default: 0 },

    // keep per-day history for heatmaps / auditing
    attendanceRecords: { type: [attendanceRecordSchema], default: [] },

    // Academic
    academics: [
      {
        semester: { type: Number, required: true },
        subjects: [
          {
            subjectName: { type: String, required: true },
            subjectCode: { type: String, required: true },
            credits: { type: Number, required: true },
            grade: {
              type: String,
              enum: ['O', 'A+', 'A', 'B+', 'B', 'C', 'F', 'Ab'],
              required: true,
            },
            gradePoints: { type: Number },
            marks: { type: Number, min: 0, max: 100 },
          },
        ],
        sgpa: { type: Number, min: 0, max: 10 },
        totalCredits: Number,
        earnedCredits: Number,
        backlogsThisSem: { type: Number, default: 0 },
      },
    ],

    // Quick access fields
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

// // Pre-save: recalc attendancePercentage (keeps backwards compatibility)
// studentSchema.pre('save', function (next) {
//   // Ensure totals are consistent when manual updates happen
//   if (this.totalClasses > 0) {
//     this.attendancePercentage = Number(((this.attendedClasses / this.totalClasses) * 100).toFixed(2));
//   } else {
//     this.attendancePercentage = 0;
//   }
//   next();
// });

module.exports = mongoose.model('Student', studentSchema);
