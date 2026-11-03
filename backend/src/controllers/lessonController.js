const Lesson = require("../models/Lesson");
const Course = require("../models/Course");

/*
|--------------------------------------------------------------------------
| CREATE LESSON
|--------------------------------------------------------------------------
| Admin only
|
| Lesson order automatically generate hoga agar order nahi bheja gaya.
| Course.lessons count automatically update hoga.
|--------------------------------------------------------------------------
*/

const createLesson = async (req, res) => {
  try {
    const {
      title,
      description,
      videoUrl,
      notesUrl,
      duration,
      course,
      order,
      status,
    } = req.body;

    if (!title || !course) {
      return res.status(400).json({
        success: false,
        message: "Lesson title and course are required",
      });
    }

    // Check course
    const existingCourse = await Course.findById(course);

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    /*
     * Automatic order
     */
    let lessonOrder;

    if (
      order !== undefined &&
      order !== null &&
      Number(order) >= 1
    ) {
      lessonOrder = Number(order);
    } else {
      const lastLesson = await Lesson.findOne({
        course,
      }).sort({ order: -1 });

      lessonOrder = lastLesson
        ? Number(lastLesson.order) + 1
        : 1;
    }

    /*
     * Status validation
     */
    const lessonStatus =
      status === "published"
        ? "published"
        : "draft";

    /*
     * If selected order already exists,
     * shift existing lessons down.
     */
    await Lesson.updateMany(
      {
        course,
        order: { $gte: lessonOrder },
      },
      {
        $inc: { order: 1 },
      }
    );

    /*
     * Create lesson
     */
    const lesson = await Lesson.create({
      title: title.trim(),
      description: description?.trim() || "",
      videoUrl: videoUrl?.trim() || "",
      notesUrl: notesUrl?.trim() || "",
      duration: duration?.trim() || "0 min",
      course,
      order: lessonOrder,
      status: lessonStatus,
    });

    /*
     * AUTOMATIC LESSON COUNT
     *
     * Course.lessons =
     * actual number of lessons in database
     */
    const lessonCount = await Lesson.countDocuments({
      course,
    });

    await Course.findByIdAndUpdate(
      course,
      {
        $set: {
          lessons: lessonCount,
        },
      }
    );

    return res.status(201).json({
      success: true,
      message: "Lesson created successfully",
      lesson,
      lessonCount,
    });
  } catch (error) {
    console.error("Create Lesson Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating lesson",
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET LESSONS BY COURSE
|--------------------------------------------------------------------------
|
| Admin:
|   All lessons including drafts
|
| Student:
|   Only own class
|   Only published lessons
|
|--------------------------------------------------------------------------
*/

const getLessonsByCourse = async (req, res) => {
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
     * Student class protection
     */
    if (req.user.role === "user") {
      if (!req.user.classId) {
        return res.status(403).json({
          success: false,
          message: "Student class is not assigned",
        });
      }

      if (
        Number(req.user.classId) !==
        Number(course.classId)
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to access this course",
        });
      }

      /*
       * Students only receive published lessons.
       */
      const lessons = await Lesson.find({
        course: courseId,
        status: "published",
      })
        .sort({ order: 1, createdAt: 1 })
        .populate("course", "title classId");

      return res.status(200).json({
        success: true,
        count: lessons.length,
        lessons,
      });
    }

    /*
     * Admin gets all lessons
     */
    const lessons = await Lesson.find({
      course: courseId,
    })
      .sort({ order: 1, createdAt: 1 })
      .populate("course", "title classId");

    return res.status(200).json({
      success: true,
      count: lessons.length,
      lessons,
    });
  } catch (error) {
    console.error(
      "Get Lessons By Course Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while loading lessons",
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET SINGLE LESSON
|--------------------------------------------------------------------------
|
| Student:
|   - own class only
|   - published lessons only
|
| Admin:
|   can access draft/published
|--------------------------------------------------------------------------
*/

const getLessonById = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id)
      .populate("course", "title classId");

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    /*
     * Student protection
     */
    if (req.user.role === "user") {
      if (!req.user.classId) {
        return res.status(403).json({
          success: false,
          message: "Student class is not assigned",
        });
      }

      if (
        Number(req.user.classId) !==
        Number(lesson.course.classId)
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to access this lesson",
        });
      }

      /*
       * Draft lesson must never be accessible
       */
      if (lesson.status !== "published") {
        return res.status(403).json({
          success: false,
          message: "This lesson is not published yet",
        });
      }
    }

    return res.status(200).json({
      success: true,
      lesson,
    });
  } catch (error) {
    console.error(
      "Get Lesson By ID Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while loading lesson",
    });
  }
};


/*
|--------------------------------------------------------------------------
| UPDATE LESSON
|--------------------------------------------------------------------------
| Admin only
|--------------------------------------------------------------------------
*/

const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      videoUrl,
      notesUrl,
      duration,
      order,
      status,
    } = req.body;

    const lesson = await Lesson.findById(id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    /*
     * Basic field updates
     */

    if (title !== undefined) {
      lesson.title = title.trim();
    }

    if (description !== undefined) {
      lesson.description = description.trim();
    }

    if (videoUrl !== undefined) {
      lesson.videoUrl = videoUrl.trim();
    }

    if (notesUrl !== undefined) {
      lesson.notesUrl = notesUrl.trim();
    }

    if (duration !== undefined) {
      lesson.duration = duration.trim();
    }

    /*
     * Status
     */
    if (status !== undefined) {
      if (
        !["draft", "published"].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Status must be draft or published",
        });
      }

      lesson.status = status;
    }

    /*
     * Order update
     */
    if (
      order !== undefined &&
      order !== null
    ) {
      const newOrder = Number(order);

      if (
        !Number.isInteger(newOrder) ||
        newOrder < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Order must be a positive integer",
        });
      }

      if (newOrder !== lesson.order) {
        const oldOrder = lesson.order;

        if (newOrder < oldOrder) {
          /*
           * Move upward
           */
          await Lesson.updateMany(
            {
              course: lesson.course,
              _id: { $ne: lesson._id },
              order: {
                $gte: newOrder,
                $lt: oldOrder,
              },
            },
            {
              $inc: { order: 1 },
            }
          );
        } else {
          /*
           * Move downward
           */
          await Lesson.updateMany(
            {
              course: lesson.course,
              _id: { $ne: lesson._id },
              order: {
                $gt: oldOrder,
                $lte: newOrder,
              },
            },
            {
              $inc: { order: -1 },
            }
          );
        }

        lesson.order = newOrder;
      }
    }

    await lesson.save();

    /*
     * Recalculate count to keep it accurate.
     */
    const lessonCount = await Lesson.countDocuments({
      course: lesson.course,
    });

    await Course.findByIdAndUpdate(
      lesson.course,
      {
        $set: {
          lessons: lessonCount,
        },
      }
    );

    const updatedLesson =
      await Lesson.findById(id)
        .populate(
          "course",
          "title classId"
        );

    return res.status(200).json({
      success: true,
      message: "Lesson updated successfully",
      lesson: updatedLesson,
      lessonCount,
    });
  } catch (error) {
    console.error(
      "Update Lesson Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while updating lesson",
    });
  }
};


/*
|--------------------------------------------------------------------------
| DELETE LESSON
|--------------------------------------------------------------------------
| Admin only
|--------------------------------------------------------------------------
*/

const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    const courseId = lesson.course;
    const deletedOrder = lesson.order;

    /*
     * Delete lesson
     */
    await Lesson.findByIdAndDelete(id);

    /*
     * Close numbering gap
     */
    await Lesson.updateMany(
      {
        course: courseId,
        order: { $gt: deletedOrder },
      },
      {
        $inc: { order: -1 },
      }
    );

    /*
     * AUTOMATIC LESSON COUNT
     */
    const lessonCount = await Lesson.countDocuments({
      course: courseId,
    });

    await Course.findByIdAndUpdate(
      courseId,
      {
        $set: {
          lessons: lessonCount,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Lesson deleted successfully",
      lessonCount,
    });
  } catch (error) {
    console.error(
      "Delete Lesson Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while deleting lesson",
    });
  }
};


module.exports = {
  createLesson,
  getLessonsByCourse,
  getLessonById,
  updateLesson,
  deleteLesson,
};