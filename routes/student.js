// routes/student.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Student = require('../models/Student');

// Get all at-risk students (Teacher & Admin)
router.get('/risk', protect, authorize('Teacher', 'Admin'), async (req, res) => {
	try {
		const students = await Student.find({ isAtRisk: true }).select('name rollNo attendancePercentage cgpa currentBacklogs riskLevel warnings').sort({ riskScore: -1 });

		res.json({ success: true, count: students.length, data: students });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
});

// Update attendance (Teacher only)
router.patch('/:id/attendance', protect, authorize('Teacher'), async (req, res) => {
	const { attended, total } = req.body; // e.g., attended: 3, total: 5
	try {
		const student = await Student.findById(req.params.id);
		if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

		student.attendedClasses += attended;
		student.totalClasses += total;

		await student.save();

		res.json({
			success: true,
			message: 'Attendance updated',
			attendancePercentage: student.attendancePercentage,
		});
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
});

// Mark warning / at-risk
router.patch('/:id/warning', protect, authorize('Teacher'), async (req, res) => {
	const { reason, isAtRisk } = req.body;
	try {
		const student = await Student.findById(req.params.id);
		if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

		if (reason) {
			student.warnings.push({ reason, givenBy: req.user.id });
		}
		if (isAtRisk !== undefined) {
			student.isAtRisk = isAtRisk;
			student.riskLevel = isAtRisk ? 'High' : 'Low';
		}

		await student.save();
		res.json({ success: true, student });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
});
// GET current logged-in student
// router.get('/me', protect, async (req, res) => {
//   try {
//     const student = await Student.findById(req.user._id)
//       .select('name rollNo semester cgpa attendancePercentage riskScore riskLevel currentBacklogs feePending warnings')
//       .populate('warnings.givenBy', 'name');

//     res.json({ success: true, student });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

router.get('/me', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('-password -otp -otpExpires');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/class', protect, async (req, res) => {
  const { semester, section, department } = req.query;
  const students = await Student.find({
    semester: Number(semester),
    section: section?.toString().toUpperCase(),
    department: department
  }).select('name rollNo _id').sort('rollNo');
  res.json({ success: true, students });
});
// GET /api/students/class?semester=5&section=A&department=Computer%20Science
router.get('/class', protect, async (req, res) => {
  try {
    const { semester, section, department } = req.query;

    if (!semester || !section || !department) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const students = await Student.find({
      semester: Number(semester),
      section: section.toString().toUpperCase(),
      department: department.toString(),
    })
      .select('name rollNo _id attendancePercentage')
      .sort('rollNo');

    res.json({
      success: true,
      count: students.length,
      students
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
module.exports = router;
