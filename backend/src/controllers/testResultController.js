const TestResult = require("../models/TestResult");
const Test = require("../models/Test");
const Course = require("../models/Course");
const User = require("../models/User");

const ALLOWED_CLASSES = [
  6,
  7,
  8,
  9,
  10,
  11,
  12,
];

/*
|--------------------------------------------------------------------------
| Helper: Check Class Access
|--------------------------------------------------------------------------
*/

const canAccessCourse = (user, course) => {
  if (!user || !course) {
    return false;
  }

  // Admin can access all classes
  if (user.role === "admin") {
    return true;
  }

  const userClass = Number(
    user.classId
  );

  const courseClass = Number(
    course.classId
  );

  if (
    !ALLOWED_CLASSES.includes(
      userClass
    )
  ) {
    return false;
  }

  if (
    !ALLOWED_CLASSES.includes(
      courseClass
    )
  ) {
    return false;
  }

  return userClass === courseClass;
};

/*
|--------------------------------------------------------------------------
| Submit Test Result
|--------------------------------------------------------------------------
*/

const submitTestResult = async (
  req,
  res
) => {
  try {
    const {
      testId,
      courseId,
      answers = [],
    } = req.body;

    console.log(
      "========== SUBMIT TEST =========="
    );

    console.log(
      "Student:",
      req.user?.email
    );

    console.log(
      "Student class:",
      req.user?.classId
    );

    console.log(
      "Test ID:",
      testId
    );

    console.log(
      "Course ID:",
      courseId
    );

    /*
    |--------------------------------------------------------------------------
    | Basic Validation
    |--------------------------------------------------------------------------
    */

    if (!testId || !courseId) {
      return res.status(400).json({
        success: false,
        message:
          "Test ID and Course ID are required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Test
    |--------------------------------------------------------------------------
    */

    const test =
      await Test.findById(testId);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Course
    |--------------------------------------------------------------------------
    */

    const course =
      await Course.findById(
        courseId
      );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT:
    | Test must actually belong to submitted course
    |--------------------------------------------------------------------------
    */

    if (
      String(test.course) !==
      String(course._id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Test does not belong to this course",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Class Security
    |--------------------------------------------------------------------------
    */

    if (
      !canAccessCourse(
        req.user,
        course
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to submit this test",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Student Only
    |--------------------------------------------------------------------------
    */

    if (
      req.user.role !== "user"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only students can submit test results",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent Duplicate Submission
    |--------------------------------------------------------------------------
    */

    const existingResult =
      await TestResult.findOne({
        student:
          req.user._id,

        test:
          testId,
      });

    if (existingResult) {
      return res.status(400).json({
        success: false,

        message:
          "You have already submitted this test",

        result:
          existingResult,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Make Sure Answers Is Array
    |--------------------------------------------------------------------------
    */

    const submittedAnswers =
      Array.isArray(answers)
        ? answers
        : [];

    /*
    |--------------------------------------------------------------------------
    | Calculate Score From Backend Questions
    |--------------------------------------------------------------------------
    */

    let score = 0;

    let totalMarks = 0;

    const processedAnswers =
      test.questions.map(
        (question) => {
          const submittedAnswer =
            submittedAnswers.find(
              (answer) =>
                String(
                  answer.questionId
                ) ===
                String(
                  question._id
                )
            );

          const selectedAnswer =
            submittedAnswer &&
            submittedAnswer.selectedAnswer !==
              undefined
              ? Number(
                  submittedAnswer.selectedAnswer
                )
              : -1;

          const correctAnswer =
            Number(
              question.correctAnswer
            );

          const marks =
            Number(
              question.marks
            ) || 1;

          const isCorrect =
            selectedAnswer ===
            correctAnswer;

          totalMarks += marks;

          if (isCorrect) {
            score += marks;
          }

          return {
            questionId:
              String(
                question._id
              ),

            question:
              question.question,

            options:
              question.options || [],

            selectedAnswer,

            correctAnswer,

            isCorrect,

            marks,
          };
        }
      );

    /*
    |--------------------------------------------------------------------------
    | Percentage
    |--------------------------------------------------------------------------
    */

    const percentage =
      totalMarks > 0
        ? Number(
            (
              (score /
                totalMarks) *
              100
            ).toFixed(2)
          )
        : 0;

    const passed =
      percentage >= 50;

    /*
    |--------------------------------------------------------------------------
    | Create Result
    |--------------------------------------------------------------------------
    */

    const result =
      await TestResult.create({
        student:
          req.user._id,

        test:
          testId,

        course:
          course._id,

        score,

        totalMarks,

        percentage,

        passed,

        answers:
          processedAnswers,

        submittedAt:
          new Date(),
      });

    /*
    |--------------------------------------------------------------------------
    | Populate Result
    |--------------------------------------------------------------------------
    */

    const populatedResult =
      await TestResult.findById(
        result._id
      )
        .populate(
          "student",
          "name email profilePhoto classId"
        )
        .populate(
          "test",
          "title description duration totalMarks questions"
        )
        .populate(
          "course",
          "title image classId"
        );

    console.log(
      "Test submitted successfully"
    );

    console.log(
      "Score:",
      score,
      "/",
      totalMarks
    );

    console.log(
      "Percentage:",
      percentage
    );

    return res.status(201).json({
      success: true,

      message:
        "Test submitted successfully",

      result:
        populatedResult,
    });
  } catch (error) {
    console.error(
      "Submit Test Result Error:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | Duplicate Submission
    |--------------------------------------------------------------------------
    */

    if (
      error.code === 11000
    ) {
      return res.status(400).json({
        success: false,

        message:
          "You have already submitted this test",
      });
    }

    return res.status(500).json({
      success: false,

      message:
        "Server error while submitting test result",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get My Test Results
|--------------------------------------------------------------------------
*/

const getMyTestResults =
  async (req, res) => {
    try {
      const results =
        await TestResult.find({
          student:
            req.user._id,
        })
          .populate(
            "student",
            "name email profilePhoto classId"
          )
          .populate(
            "test",
            "title description duration totalMarks questions"
          )
          .populate(
            "course",
            "title image classId"
          )
          .sort({
            submittedAt: -1,
          });

      /*
      |--------------------------------------------------------------------------
      | Student class security
      |--------------------------------------------------------------------------
      */

      const validResults =
        results.filter(
          (result) => {
            if (
              !result.student ||
              !result.test ||
              !result.course
            ) {
              return false;
            }

            return (
              Number(
                result.course.classId
              ) ===
              Number(
                req.user.classId
              )
            );
          }
        );

      return res.status(200).json({
        success: true,

        count:
          validResults.length,

        results:
          validResults,
      });
    } catch (error) {
      console.error(
        "Get My Test Results Error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error while fetching test results",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get Student Test Results - Admin
|--------------------------------------------------------------------------
*/

const getStudentTestResults =
  async (req, res) => {
    try {
      const {
        studentId,
      } = req.params;

      /*
      |--------------------------------------------------------------------------
      | Verify Student
      |--------------------------------------------------------------------------
      */

      const student =
        await User.findById(
          studentId
        ).select(
          "name email role classId"
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found",
        });
      }

      const results =
        await TestResult.find({
          student:
            studentId,
        })
          .populate(
            "student",
            "name email profilePhoto classId"
          )
          .populate(
            "test",
            "title description duration totalMarks questions"
          )
          .populate(
            "course",
            "title image classId"
          )
          .sort({
            submittedAt: -1,
          });

      /*
      |--------------------------------------------------------------------------
      | Remove invalid/orphan/wrong-class records
      |--------------------------------------------------------------------------
      */

      const validResults =
        results.filter(
          (result) => {
            if (
              !result.student ||
              !result.test ||
              !result.course
            ) {
              return false;
            }

            return (
              Number(
                result.student.classId
              ) ===
              Number(
                result.course.classId
              )
            );
          }
        );

      return res.status(200).json({
        success: true,

        count:
          validResults.length,

        results:
          validResults,
      });
    } catch (error) {
      console.error(
        "Get Student Test Results Error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error while fetching student test results",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get All Test Results - Admin
|--------------------------------------------------------------------------
*/

const getAllTestResults =
  async (req, res) => {
    try {
      const results =
        await TestResult.find({})
          .populate(
            "student",
            "name email profilePhoto classId"
          )
          .populate(
            "test",
            "title description duration totalMarks questions"
          )
          .populate(
            "course",
            "title image classId"
          )
          .sort({
            submittedAt: -1,
          });

      /*
      |--------------------------------------------------------------------------
      | Remove invalid/orphan records
      |--------------------------------------------------------------------------
      */

      const validResults =
        results.filter(
          (result) =>
            result.student &&
            result.test &&
            result.course
        );

      return res.status(200).json({
        success: true,

        count:
          validResults.length,

        results:
          validResults,
      });
    } catch (error) {
      console.error(
        "Get All Test Results Error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error while fetching all test results",
      });
    }
  };

module.exports = {
  submitTestResult,
  getMyTestResults,
  getStudentTestResults,
  getAllTestResults,
};