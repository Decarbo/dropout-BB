// routes/teacher.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const Attendance = require('../models/Attendance');
// GET /api/teachers/me → Get logged-in teacher's full details + subjects
router.get('/me', protect, async (req, res) => {
  try {
    const teacherId = req.user.id;

    // 1. Get teacher profile
    const teacher = await Teacher.findById(teacherId)
      .select('-password')
      .populate('registeredBy', 'name');

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    // 2. Today info
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][today.getDay()];

    // 3. Total students (by subjects taught)
    const semesters = [...new Set(teacher.subjects.map(s => s.semester))];
    const sections = [...new Set(teacher.subjects.map(s => s.section))];

    const totalStudents = await Student.countDocuments({
      department: teacher.department,
      semester: { $in: semesters },
      section: { $in: sections }
    });

    // 4. Today's classes
    const todayClasses = await Timetable.find({
      teacher: teacherId,
      day: dayName
    }).select('subjectCode subjectName time');

    // 5. Already marked today
    const markedToday = await Attendance.distinct('subjectCode', {
      createdBy: teacherId,
      date: { $gte: today }
    });

    // 6. Low attendance students
    const lowAttendanceCount = await Student.countDocuments({
      department: teacher.department,
      semester: { $in: semesters },
      attendancePercentage: { $lt: 75 }
    });

    // 7. Pending to mark
    const pendingMarking = todayClasses.length - markedToday.length;

    // 8. Student breakdown by section (PURE JS)
    const studentBreakdown = {};
    for (const sub of teacher.subjects) {
      const key = `Semester ${sub.semester} - Section ${sub.section}`;
      if (!studentBreakdown[key]) {
        studentBreakdown[key] = await Student.countDocuments({
          department: teacher.department,
          semester: sub.semester,
          section: sub.section
        });
      }
    }

    // FINAL RESPONSE
    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        employeeId: teacher.employeeId,
        email: teacher.email,
        department: teacher.department,
        role: teacher.role,
        phone: teacher.phone || null,
        designation: teacher.designation || null,
        subjects: teacher.subjects,
        registeredBy: teacher.registeredBy?.name || 'Admin',
        createdAt: teacher.createdAt,

        // Dashboard stats
        totalStudents,
        classesToday: todayClasses.length,
        markedToday: markedToday.length,
        pendingMarking: Math.max(0, pendingMarking),
        lowAttendanceCount,
        studentBreakdown,
        todaySchedule: todayClasses.map(cls => ({
          subjectCode: cls.subjectCode,
          subjectName: cls.subjectName || cls.subjectCode,
          time: cls.time || 'Not set'
        }))
      }
    });

  } catch (err) {
    console.error('Teacher /me error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});
router.get('/my-students', protect, async (req, res) => {
	try {
		const teacher = await Teacher.findById(req.user.id).select('subjects department name');

		if (!teacher) {
			return res.status(404).json({ success: false, message: 'Teacher not found' });
		}

		// Extract all unique (semester, section, batch) combinations teacher teaches
		const teachingClasses = teacher.subjects.map((sub) => ({
			semester: sub.semester,
			section: sub.section,
			batch: sub.batch,
		}));

		// Find students in these classes
		const students = await Student.find({
			$or: teachingClasses.map((cls) => ({
				semester: cls.semester,
				section: cls.section,
				batch: cls.batch,
			})),
		})
			.select('name rollNo email cgpa attendancePercentage riskScore riskLevel currentBacklogs feePending warnings')
			.sort({ rollNo: 1 });

		// Get latest semester marks for each student
		const studentsWithMarks = students.map((student) => {
			const latestSem = student.academics?.sort((a, b) => b.semester - a.semester)[0];

			const latestSgpa = latestSem?.sgpa || null;
			const subjects = latestSem?.subjects || [];

			return {
				_id: student._id,
				name: student.name,
				rollNo: student.rollNo,
				email: student.email,
				cgpa: student.cgpa?.toFixed(2) || 'N/A',
				sgpa: latestSgpa?.toFixed(2) || 'N/A',
				attendance: Math.round(student.attendancePercentage || 0),
				riskScore: student.riskScore || 0,
				riskLevel: student.riskLevel || 'Low',
				backlogs: student.currentBacklogs || 0,
				feePending: student.feePending || false,
				warnings: student.warnings?.length || 0,
				totalSubjects: subjects.length,
				failedSubjects: subjects.filter((s) => ['F', 'Ab'].includes(s.grade)).length,
			};
		});

		res.json({
			success: true,
			message: `Found ${studentsWithMarks.length} students in your classes`,
			classInfo: {
				teacherName: teacher.name,
				department: teacher.department,
				totalClasses: teacher.subjects.length,
			},
			students: studentsWithMarks,
		});
	} catch (err) {
		console.error('My Students Error:', err);
		res.status(500).json({ success: false, message: 'Server error' });
	}
});
module.exports = router;
