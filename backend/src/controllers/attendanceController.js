const Attendance = require("../models/Attendance");
const AttendanceSession = require("../models/AttendanceSession");
const User = require("../models/User");
const Course = require("../models/Course");

const getAttendanceDate = (date) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setHours(0, 0, 0, 0);

  return parsedDate;
};

// ======================================================
// CURRENT DATE — INDIA
// ======================================================
const getTodayString = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

// ======================================================
// CHECK REQUESTED DATE IS TODAY
// ======================================================
const isTodayAttendanceDate = (date) => {
  const requestedDate = String(date).slice(0, 10);
  const today = getTodayString();

  return requestedDate === today;
};

// ======================================================
// BATCH MARK ATTENDANCE
// ======================================================
const markAttendanceBatch = async (req, res) => {
  try {
    const { courseId, date, attendance } = req.body;

    if (!courseId || !date || !Array.isArray(attendance)) {
      return res.status(400).json({
        success: false,
        message: "courseId, date and attendance are required",
      });
    }

    const attendanceDate = getAttendanceDate(date);

    if (!attendanceDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance date",
      });
    }

    // Only today's attendance can be marked
    if (!isTodayAttendanceDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Attendance can only be marked for the current date",
      });
    }

    // Check course
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Attendance list cannot be empty
    if (attendance.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Attendance list cannot be empty",
      });
    }

    // Check course/date lock
    const existingSession = await AttendanceSession.findOne({
      course: courseId,
      date: attendanceDate,
    });

    if (existingSession) {
      return res.status(409).json({
        success: false,
        locked: true,
        message:
          "Attendance is already marked for this course and date",
      });
    }

    // Check duplicate students
    const studentIds = attendance.map(
      (item) => item.studentId
    );

    const uniqueStudentIds = new Set(studentIds);

    if (uniqueStudentIds.size !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "A student cannot have more than one attendance entry",
      });
    }

    // Validate students
    const students = await User.find({
      _id: {
        $in: studentIds,
      },
      role: "user",
    }).select("_id name email classId");

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more students were not found",
      });
    }

    // Course must have class
    if (
      course.classId === undefined ||
      course.classId === null
    ) {
      return res.status(400).json({
        success: false,
        message: "Course class is not configured",
      });
    }

    // Students must belong to same class as course
    for (const student of students) {
      if (
        student.classId === undefined ||
        student.classId === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Class is not configured for student ${student.name}`,
        });
      }

      if (
        Number(student.classId) !==
        Number(course.classId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Student and course must belong to the same class",
        });
      }
    }

    // Validate status
    for (const item of attendance) {
      if (
        !["present", "absent"].includes(item.status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Attendance status must be present or absent",
        });
      }
    }

    // Check existing attendance
    const existingAttendance =
      await Attendance.findOne({
        student: {
          $in: studentIds,
        },
        course: courseId,
        date: attendanceDate,
      });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        locked: true,
        message:
          "Attendance has already been marked for one or more students",
      });
    }

    // Prepare attendance records
    const attendanceRecords = attendance.map(
      (item) => ({
        student: item.studentId,
        course: courseId,
        date: attendanceDate,
        status: item.status,
        markedBy: req.user._id,
      })
    );

    // Save attendance
    await Attendance.insertMany(
      attendanceRecords
    );

    // Lock course + date
    await AttendanceSession.create({
      course: courseId,
      date: attendanceDate,
      locked: true,
      lockedBy: req.user._id,
      lockedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      locked: true,
      message:
        "Attendance saved and locked successfully",
      count: attendanceRecords.length,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        locked: true,
        message:
          "Attendance has already been marked. It cannot be changed or marked again.",
      });
    }

    console.error(
      "Mark attendance batch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while saving attendance",
    });
  }
};

// ======================================================
// SINGLE STUDENT MARK ATTENDANCE
// ======================================================
const markAttendance = async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      date,
      status,
    } = req.body;

    if (
      !studentId ||
      !courseId ||
      !date ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        message:
          "studentId, courseId, date and status are required",
      });
    }

    const attendanceDate =
      getAttendanceDate(date);

    if (!attendanceDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance date",
      });
    }

    // Only today's attendance can be marked
    if (!isTodayAttendanceDate(date)) {
      return res.status(400).json({
        success: false,
        message:
          "Attendance can only be marked for the current date",
      });
    }

    if (
      !["present", "absent"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid attendance status",
      });
    }

    // Check student
    const student =
      await User.findById(studentId);

    if (
      !student ||
      student.role !== "user"
    ) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check course
    const course =
      await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check class
    if (
      student.classId === undefined ||
      student.classId === null ||
      course.classId === undefined ||
      course.classId === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student or course class is not configured",
      });
    }

    if (
      Number(student.classId) !==
      Number(course.classId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Student and course must belong to the same class",
      });
    }

    // Check lock
    const existingSession =
      await AttendanceSession.findOne({
        course: courseId,
        date: attendanceDate,
      });

    if (existingSession) {
      return res.status(409).json({
        success: false,
        locked: true,
        message:
          "Attendance is already marked for this course and date",
      });
    }

    // Check existing attendance
    const existingAttendance =
      await Attendance.findOne({
        student: studentId,
        course: courseId,
        date: attendanceDate,
      });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        locked: true,
        message:
          "Attendance is already marked and cannot be changed",
      });
    }

    // Create attendance
    const attendance =
      await Attendance.create({
        student: studentId,
        course: courseId,
        date: attendanceDate,
        status,
        markedBy: req.user._id,
      });

    return res.status(201).json({
      success: true,
      locked: true,
      message:
        "Attendance marked successfully",
      attendance,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        locked: true,
        message:
          "Attendance is already marked and cannot be changed",
      });
    }

    console.error(
      "Mark attendance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while marking attendance",
    });
  }
};

// ======================================================
// GET MY ATTENDANCE
// ======================================================
const getMyAttendance = async (req, res) => {
  try {
    const { courseId } = req.query;

    const filter = {
      student: req.user._id,
    };

    if (courseId) {
      filter.course = courseId;
    }

    const records =
      await Attendance.find(filter)
        .populate(
          "course",
          "title classId"
        )
        .sort({ date: -1 });

    const total = records.length;

    const present =
      records.filter(
        (record) =>
          record.status === "present"
      ).length;

    const absent =
      records.filter(
        (record) =>
          record.status === "absent"
      ).length;

    const percentage =
      total > 0
        ? Number(
            (
              (present / total) *
              100
            ).toFixed(2)
          )
        : 0;

    return res.status(200).json({
      success: true,
      attendance: records,
      summary: {
        total,
        present,
        absent,
        percentage,
      },
    });
  } catch (error) {
    console.error(
      "Get my attendance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching attendance",
    });
  }
};

// ======================================================
// GET STUDENT ATTENDANCE
// ======================================================
const getStudentAttendance = async (
  req,
  res
) => {
  try {
    const { studentId } = req.params;

    const student =
      await User.findById(studentId).select(
        "_id name email role classId"
      );

    if (
      !student ||
      student.role !== "user"
    ) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const records =
      await Attendance.find({
        student: studentId,
      })
        .populate(
          "course",
          "title classId"
        )
        .sort({ date: -1 });

    const classRecords =
      records.filter(
        (record) =>
          record.course &&
          Number(
            record.course.classId
          ) ===
            Number(student.classId)
      );

    const total = classRecords.length;

    const present =
      classRecords.filter(
        (record) =>
          record.status === "present"
      ).length;

    const absent =
      classRecords.filter(
        (record) =>
          record.status === "absent"
      ).length;

    const percentage =
      total > 0
        ? Number(
            (
              (present / total) *
              100
            ).toFixed(2)
          )
        : 0;

    return res.status(200).json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        classId: student.classId,
      },
      attendance: classRecords,
      summary: {
        total,
        present,
        absent,
        percentage,
      },
    });
  } catch (error) {
    console.error(
      "Get student attendance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching student attendance",
    });
  }
};

// ======================================================
// GET COURSE ATTENDANCE
// ======================================================
const getCourseAttendance = async (
  req,
  res
) => {
  try {
    const { courseId } = req.params;
    const { date } = req.query;

    const course =
      await Course.findById(courseId).select(
        "_id title classId"
      );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const filter = {
      course: courseId,
    };

    if (date) {
      const attendanceDate =
        getAttendanceDate(date);

      if (!attendanceDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid attendance date",
        });
      }

      filter.date = attendanceDate;
    }

    const records =
      await Attendance.find(filter)
        .populate(
          "student",
          "name email classId"
        )
        .sort({ date: -1 });

    const classRecords =
      records.filter(
        (record) =>
          record.student &&
          Number(
            record.student.classId
          ) === Number(course.classId)
      );

    let locked = false;

    if (date) {
      const attendanceDate =
        getAttendanceDate(date);

      const session =
        await AttendanceSession.findOne({
          course: courseId,
          date: attendanceDate,
        });

      locked = !!session;
    }

    return res.status(200).json({
      success: true,
      locked,
      course: {
        id: course._id,
        title: course.title,
        classId: course.classId,
      },
      attendance: classRecords,
    });
  } catch (error) {
    console.error(
      "Get course attendance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching course attendance",
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
  markAttendance,
  markAttendanceBatch,
  getMyAttendance,
  getStudentAttendance,
  getCourseAttendance,
};