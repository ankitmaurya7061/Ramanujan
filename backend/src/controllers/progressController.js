const Progress = require("../models/Progress");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");

// Get or create progress for a course
const getMyProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const totalLessons = await Lesson.countDocuments({
      course: courseId,
    });

    let progress = await Progress.findOne({
      student: req.user._id,
      course: courseId,
    }).populate("lastCompletedLesson", "title order");

    if (!progress) {
      progress = await Progress.create({
        student: req.user._id,
        course: courseId,
        totalLessons,
        completedCount: 0,
        percentage: 0,
        learningTimeSeconds: 0,
        lastActivityAt: null,
      });

      progress = await Progress.findById(progress._id).populate(
        "lastCompletedLesson",
        "title order"
      );
    } else {
      progress.totalLessons = totalLessons;

      progress.completedCount =
        progress.completedLessons.length;

      progress.percentage =
        totalLessons > 0
          ? Number(
              (
                (progress.completedCount / totalLessons) *
                100
              ).toFixed(2)
            )
          : 0;

      await progress.save();
    }

    return res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("Get My Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching progress",
    });
  }
};

// Mark a lesson as completed
const completeLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;

    if (!courseId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: "Course ID and lesson ID are required",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const lesson = await Lesson.findOne({
      _id: lessonId,
      course: courseId,
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found for this course",
      });
    }

    const totalLessons = await Lesson.countDocuments({
      course: courseId,
    });

    let progress = await Progress.findOne({
      student: req.user._id,
      course: courseId,
    });

    if (!progress) {
      progress = new Progress({
        student: req.user._id,
        course: courseId,
        completedLessons: [],
        totalLessons,
        completedCount: 0,
        percentage: 0,
        learningTimeSeconds: 0,
      });
    }

    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    progress.totalLessons = totalLessons;

    progress.completedCount =
      progress.completedLessons.length;

    progress.percentage =
      totalLessons > 0
        ? Number(
            (
              (progress.completedCount / totalLessons) *
              100
            ).toFixed(2)
          )
        : 0;

    progress.lastCompletedLesson = lessonId;

    progress.lastActivityAt = new Date();

    await progress.save();

    const updatedProgress = await Progress.findById(
      progress._id
    )
      .populate("lastCompletedLesson", "title order")
      .populate("completedLessons", "title order");

    return res.status(200).json({
      success: true,
      message: "Lesson marked as completed",
      progress: updatedProgress,
    });
  } catch (error) {
    console.error("Complete Lesson Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while completing lesson",
    });
  }
};

// Add learning time
const addLearningTime = async (req, res) => {
  try {
    const { courseId, seconds } = req.body;

    if (!courseId || seconds === undefined) {
      return res.status(400).json({
        success: false,
        message: "Course ID and seconds are required",
      });
    }

    const learningSeconds = Number(seconds);

    if (
      !Number.isFinite(learningSeconds) ||
      learningSeconds <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Seconds must be a positive number",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const totalLessons = await Lesson.countDocuments({
      course: courseId,
    });

    let progress = await Progress.findOne({
      student: req.user._id,
      course: courseId,
    });

    if (!progress) {
      progress = new Progress({
        student: req.user._id,
        course: courseId,
        completedLessons: [],
        totalLessons,
        completedCount: 0,
        percentage: 0,
        learningTimeSeconds: 0,
      });
    }

    progress.learningTimeSeconds =
      (progress.learningTimeSeconds || 0) +
      Math.floor(learningSeconds);

    progress.lastActivityAt = new Date();

    progress.totalLessons = totalLessons;

    progress.completedCount =
      progress.completedLessons.length;

    progress.percentage =
      totalLessons > 0
        ? Number(
            (
              (progress.completedCount / totalLessons) *
              100
            ).toFixed(2)
          )
        : 0;

    await progress.save();

    const updatedProgress = await Progress.findById(
      progress._id
    )
      .populate("course", "title image")
      .populate("lastCompletedLesson", "title order");

    return res.status(200).json({
      success: true,
      message: "Learning time updated",
      progress: updatedProgress,
    });
  } catch (error) {
    console.error("Add Learning Time Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating learning time",
    });
  }
};

// Get progress for all courses of logged-in student
const getAllMyProgress = async (req, res) => {
  try {
    const progress = await Progress.find({
      student: req.user._id,
    })
      .populate("course", "title image")
      .populate("lastCompletedLesson", "title order")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: progress.length,
      progress,
    });
  } catch (error) {
    console.error("Get All Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching progress",
    });
  }
};

// Get progress of a particular student - Admin
const getStudentProgress = async (req, res) => {
  try {
    const { studentId } = req.params;

    const progress = await Progress.find({
      student: studentId,
    })
      .populate("student", "name email")
      .populate("course", "title image")
      .populate("lastCompletedLesson", "title order")
      .populate("completedLessons", "title order")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: progress.length,
      progress,
    });
  } catch (error) {
    console.error("Get Student Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching student progress",
    });
  }
};

// Get all students progress - Admin
const getAllProgress = async (req, res) => {
  try {
    const progress = await Progress.find({})
      .populate("student", "name email")
      .populate("course", "title image")
      .populate("lastCompletedLesson", "title order")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: progress.length,
      progress,
    });
  } catch (error) {
    console.error("Get All Students Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching all progress",
    });
  }
};

module.exports = {
  getMyProgress,
  completeLesson,
  addLearningTime,
  getAllMyProgress,
  getStudentProgress,
  getAllProgress,
};