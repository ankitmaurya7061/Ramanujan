const Course = require("../models/Course");

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
| CREATE COURSE
|--------------------------------------------------------------------------
|
| IMPORTANT:
| lessons count manually accept nahi hoga.
| Har new course ka lesson count = 0.
|
| Lesson add hone par lessonController automatically
| Course.lessons ko update karega.
|--------------------------------------------------------------------------
*/

const createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      image,
      instructor,
      category,
      level,
      duration,
      rating,
      students,
      icon,
      color,
      iconColor,
      classId,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    const courseClass = Number(classId);

    if (!ALLOWED_CLASSES.includes(courseClass)) {
      return res.status(400).json({
        success: false,
        message: "Class must be between 6 and 12",
      });
    }

    const course = await Course.create({
      title: title.trim(),

      description: description.trim(),

      image: image || "",

      instructor: instructor
        ? instructor.trim()
        : "",

      category: category
        ? category.trim()
        : "Development",

      level: level
        ? level.trim()
        : "Beginner",

      /*
       * DO NOT take lesson count from frontend.
       * New course always starts with 0 lessons.
       */
      lessons: 0,

      duration: duration
        ? duration.trim()
        : "0h",

      rating:
        rating !== undefined
          ? Number(rating)
          : 0,

      students:
        students !== undefined
          ? Number(students)
          : 0,

      icon: icon
        ? icon.trim()
        : "CO",

      color: color
        ? color.trim()
        : "#DBEAFE",

      iconColor: iconColor
        ? iconColor.trim()
        : "#2563EB",

      classId: courseClass,
    });

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    console.error(
      "Create Course Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while creating course",
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET ALL COURSES
|--------------------------------------------------------------------------
*/

const getCourses = async (req, res) => {
  try {
    const filter = {};

    /*
     * Student can only see courses
     * of their own class.
     */
    if (
      req.user &&
      req.user.role === "user"
    ) {
      if (!req.user.classId) {
        return res.status(403).json({
          success: false,
          message: "Student class is not assigned",
        });
      }

      filter.classId =
        Number(req.user.classId);
    }

    const courses =
      await Course.find(filter).sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    console.error(
      "Get Courses Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while fetching courses",
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET COURSE BY ID
|--------------------------------------------------------------------------
*/

const getCourseById = async (
  req,
  res
) => {
  try {
    const course =
      await Course.findById(
        req.params.id
      );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    /*
     * Student security:
     * Student can only access
     * their own class course.
     */
    if (
      req.user &&
      req.user.role === "user"
    ) {
      if (
        !req.user.classId ||
        Number(course.classId) !==
          Number(req.user.classId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not allowed to access this course",
        });
      }
    }

    return res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    console.error(
      "Get Course Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: "Invalid course ID",
    });
  }
};


/*
|--------------------------------------------------------------------------
| UPDATE COURSE
|--------------------------------------------------------------------------
|
| lessons field intentionally removed.
| Lesson count is controlled only by lessonController.
|--------------------------------------------------------------------------
*/

const updateCourse = async (
  req,
  res
) => {
  try {
    const {
      title,
      description,
      image,
      instructor,
      category,
      level,
      duration,
      rating,
      students,
      icon,
      color,
      iconColor,
      classId,
    } = req.body;

    const course =
      await Course.findById(
        req.params.id
      );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    /*
     * Title
     */
    if (title !== undefined) {
      course.title =
        title.trim();
    }

    /*
     * Description
     */
    if (
      description !== undefined
    ) {
      course.description =
        description.trim();
    }

    /*
     * Image
     */
    if (image !== undefined) {
      course.image = image;
    }

    /*
     * Teacher Name
     *
     * Backend field remains
     * "instructor" so existing
     * database/API does not break.
     */
    if (
      instructor !== undefined
    ) {
      course.instructor =
        instructor.trim();
    }

    /*
     * Category
     */
    if (
      category !== undefined
    ) {
      course.category =
        category.trim();
    }

    /*
     * Level
     */
    if (level !== undefined) {
      course.level =
        level.trim();
    }

    /*
     * IMPORTANT:
     * lessons is NOT updated here.
     *
     * Actual count is managed by:
     * lessonController.js
     */

    /*
     * Duration
     */
    if (
      duration !== undefined
    ) {
      course.duration =
        duration.trim();
    }

    /*
     * Rating
     */
    if (
      rating !== undefined
    ) {
      course.rating =
        Number(rating);
    }

    /*
     * Students
     */
    if (
      students !== undefined
    ) {
      course.students =
        Number(students);
    }

    /*
     * Icon
     */
    if (icon !== undefined) {
      course.icon =
        icon.trim();
    }

    /*
     * Color
     */
    if (color !== undefined) {
      course.color =
        color.trim();
    }

    /*
     * Icon Color
     */
    if (
      iconColor !== undefined
    ) {
      course.iconColor =
        iconColor.trim();
    }

    /*
     * Class
     */
    if (
      classId !== undefined
    ) {
      const courseClass =
        Number(classId);

      if (
        !ALLOWED_CLASSES.includes(
          courseClass
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Class must be between 6 and 12",
        });
      }

      course.classId =
        courseClass;
    }

    await course.save();

    return res.status(200).json({
      success: true,
      message:
        "Course updated successfully",
      course,
    });
  } catch (error) {
    console.error(
      "Update Course Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating course",
    });
  }
};


/*
|--------------------------------------------------------------------------
| UPLOAD COURSE PHOTO
|--------------------------------------------------------------------------
*/

const uploadCoursePhoto = async (
  req,
  res
) => {
  try {
    const course =
      await Course.findById(
        req.params.id
      );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Course photo is required",
      });
    }

    const photoUrl =
      `${req.protocol}://${req.get(
        "host"
      )}/uploads/courses/${req.file.filename}`;

    course.image = photoUrl;

    await course.save();

    return res.status(200).json({
      success: true,
      message:
        "Course photo uploaded successfully",
      image: photoUrl,
      course,
    });
  } catch (error) {
    console.error(
      "Upload Course Photo Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while uploading course photo",
    });
  }
};


/*
|--------------------------------------------------------------------------
| DELETE COURSE
|--------------------------------------------------------------------------
*/

const deleteCourse = async (
  req,
  res
) => {
  try {
    const course =
      await Course.findById(
        req.params.id
      );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    await course.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "Course deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Course Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while deleting course",
    });
  }
};


module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  uploadCoursePhoto,
  deleteCourse,
};