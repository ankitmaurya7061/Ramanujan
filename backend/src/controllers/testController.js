const Test = require("../models/Test");
const Course = require("../models/Course");

const ALLOWED_CLASSES = [6, 7, 8, 9, 10, 11, 12];

/*
|--------------------------------------------------------------------------
| Helper: Check whether user can access a course
|--------------------------------------------------------------------------
*/
const canAccessCourse = (user, course) => {
  // Admin can access every class
  if (user.role === "admin") {
    return true;
  }

  // Student must have a valid class
  if (!ALLOWED_CLASSES.includes(Number(user.classId))) {
    return false;
  }

  // Course must have a valid class
  if (!ALLOWED_CLASSES.includes(Number(course.classId))) {
    return false;
  }

  return Number(user.classId) === Number(course.classId);
};

/*
|--------------------------------------------------------------------------
| Create Test - Admin Only
|--------------------------------------------------------------------------
*/
const createTest = async (req, res) => {
  try {
    const {
      title,
      description,
      course,
      duration,
      questions,
    } = req.body;

    if (!title || !course) {
      return res.status(400).json({
        success: false,
        message: "Title and course are required",
      });
    }

    const existingCourse = await Course.findById(course);

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const testQuestions = Array.isArray(questions)
      ? questions
      : [];

    const totalMarks = testQuestions.reduce(
      (total, question) =>
        total + (Number(question.marks) || 1),
      0
    );

    const test = await Test.create({
      title: title.trim(),
      description: description
        ? description.trim()
        : "",
      course: existingCourse._id,
      duration: duration || 30,
      totalMarks,
      questions: testQuestions,
    });

    return res.status(201).json({
      success: true,
      message: "Test created successfully",
      test,
    });
  } catch (error) {
    console.error("Create Test Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating test",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Tests By Course
|--------------------------------------------------------------------------
*/
const getTestsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Class Security
    |--------------------------------------------------------------------------
    */

    if (!canAccessCourse(req.user, course)) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access tests for this class",
      });
    }

    const tests = await Test.find({
      course: courseId,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: tests.length,
      tests,
    });
  } catch (error) {
    console.error("Get Tests Error:", error);

    return res.status(500).json({
      success: false,
      message: "Invalid course ID",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Single Test
|--------------------------------------------------------------------------
*/
const getTestById = async (req, res) => {
  try {
    const test = await Test.findById(
      req.params.id
    ).populate("course");

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Class Security
    |--------------------------------------------------------------------------
    */

    if (!test.course) {
      return res.status(404).json({
        success: false,
        message: "Course associated with this test not found",
      });
    }

    if (!canAccessCourse(req.user, test.course)) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this test",
      });
    }

    return res.status(200).json({
      success: true,
      test,
    });
  } catch (error) {
    console.error("Get Test Error:", error);

    return res.status(500).json({
      success: false,
      message: "Invalid test ID",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Update Test - Admin Only
|--------------------------------------------------------------------------
*/
const updateTest = async (req, res) => {
  try {
    const {
      title,
      description,
      duration,
      questions,
    } = req.body;

    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    if (title !== undefined) {
      test.title = title.trim();
    }

    if (description !== undefined) {
      test.description = description.trim();
    }

    if (duration !== undefined) {
      test.duration = Number(duration);

      if (
        !Number.isFinite(test.duration) ||
        test.duration <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Duration must be greater than 0",
        });
      }
    }

    if (questions !== undefined) {
      if (!Array.isArray(questions)) {
        return res.status(400).json({
          success: false,
          message: "Questions must be an array",
        });
      }

      test.questions = questions;

      test.totalMarks = questions.reduce(
        (total, question) =>
          total + (Number(question.marks) || 1),
        0
      );
    }

    await test.save();

    return res.status(200).json({
      success: true,
      message: "Test updated successfully",
      test,
    });
  } catch (error) {
    console.error("Update Test Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating test",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Delete Test - Admin Only
|--------------------------------------------------------------------------
*/
const deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    await test.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Test deleted successfully",
    });
  } catch (error) {
    console.error("Delete Test Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting test",
    });
  }
};

module.exports = {
  createTest,
  getTestsByCourse,
  getTestById,
  updateTest,
  deleteTest,
};