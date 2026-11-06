import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

export type Question = {
  id: string;
  testId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  marks: number;
};

export type Test = {
  id: string;
  title: string;
  description: string;
  courseId: string;
  duration: number;
  questions: number;
};

export type TestResultAnswer = {
  questionId: string;
  question: string;
  options: string[];
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  marks: number;
};

export type TestResult = {
  id: string;
  testId: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  attemptedAt: string;
  answers: TestResultAnswer[];
  studentName?: string;
  studentEmail?: string;
};

type TestContextType = {
  tests: Test[];
  questions: Question[];
  results: TestResult[];

  addTest: (
    test: Omit<Test, "id" | "questions">
  ) => Promise<boolean>;

  updateTest: (
    id: string,
    test: Omit<Test, "id" | "questions">
  ) => Promise<boolean>;

  deleteTest: (id: string) => Promise<boolean>;

  addQuestion: (
    question: Omit<Question, "id">
  ) => Promise<boolean>;

  updateQuestion: (
    id: string,
    question: Omit<Question, "id">
  ) => Promise<boolean>;

  deleteQuestion: (id: string) => Promise<boolean>;

  getTestQuestions: (testId: string) => Question[];

  saveTestResult: (
    result: Omit<
      TestResult,
      "id" | "attemptedAt" | "studentName" | "studentEmail"
    >
  ) => Promise<boolean>;

  getTestResults: (testId?: string) => TestResult[];

  deleteTestResult: (id: string) => Promise<boolean>;

  refreshTests: () => Promise<void>;
};

const TestContext =
  createContext<TestContextType | undefined>(undefined);

const API_BASE_URL =
  "https://ramanujan-sybq.onrender.com/api";

const ALLOWED_CLASSES = [6, 7, 8, 9, 10, 11, 12];

const getToken = async () => {
  return await AsyncStorage.getItem("studypoint_token");
};

/* =========================================================
   QUESTION MAPPER
========================================================= */

const mapQuestion = (
  item: any,
  testId: string
): Question => {
  const options = Array.isArray(item.options)
    ? item.options
    : [];

  let correctAnswer = Number(item.correctAnswer);

  if (
    !Number.isInteger(correctAnswer) ||
    correctAnswer < 0 ||
    correctAnswer >= options.length
  ) {
    correctAnswer = options.findIndex(
      (option: string) =>
        option === String(item.correctAnswer)
    );

    if (correctAnswer < 0) {
      correctAnswer = 0;
    }
  }

  return {
    id:
      item._id?.toString() ||
      item.id ||
      `question-${Date.now()}-${Math.random()}`,
    testId,
    question: item.question || "",
    options,
    correctAnswer,
    marks: Number(item.marks) || 1,
  };
};

/* =========================================================
   TEST MAPPER
========================================================= */

const mapTest = (item: any): Test => {
  const questions = Array.isArray(item.questions)
    ? item.questions
    : [];

  return {
    id: item._id?.toString() || item.id,
    title: item.title || "",
    description: item.description || "",
    courseId:
      item.course?._id?.toString() ||
      item.course?.toString() ||
      item.courseId ||
      "",
    duration: Number(item.duration) || 30,
    questions: questions.length,
  };
};

/* =========================================================
   RESULT MAPPER
========================================================= */

const mapResult = (item: any): TestResult => {
  const test =
    item.test && typeof item.test === "object"
      ? item.test
      : null;

  return {
    id: item._id?.toString() || item.id,

    testId:
      test?._id?.toString() ||
      item.test?.toString() ||
      item.testId ||
      "",

    testTitle:
      test?.title ||
      item.testTitle ||
      "Test",

    score: Number(item.score) || 0,

    totalMarks: Number(item.totalMarks) || 0,

    percentage: Number(item.percentage) || 0,

    correctAnswers: Number(
      item.correctAnswers || 0
    ),

    totalQuestions: Number(
      item.totalQuestions ||
        test?.questions?.length ||
        0
    ),

    answers: Array.isArray(item.answers)
      ? item.answers.map((answer: any) => ({
          questionId: String(
            answer.questionId || ""
          ),

          question: String(
            answer.question || ""
          ),

          options: Array.isArray(answer.options)
            ? answer.options.map((option: any) =>
                String(option)
              )
            : [],

          selectedAnswer: Number.isInteger(
            Number(answer.selectedAnswer)
          )
            ? Number(answer.selectedAnswer)
            : -1,

          correctAnswer: Number.isInteger(
            Number(answer.correctAnswer)
          )
            ? Number(answer.correctAnswer)
            : 0,

          isCorrect: Boolean(
            answer.isCorrect
          ),

          marks:
            Number(answer.marks) || 1,
        }))
      : [],

    attemptedAt:
      item.submittedAt ||
      item.createdAt ||
      item.attemptedAt ||
      new Date().toISOString(),

    studentName:
      item.student?.name ||
      item.studentName ||
      undefined,

    studentEmail:
      item.student?.email ||
      item.studentEmail ||
      undefined,
  };
};

/* =========================================================
   TEST PROVIDER
========================================================= */

export function TestProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] =
    useState<Question[]>([]);
  const [results, setResults] =
    useState<TestResult[]>([]);

  /* =======================================================
     LOAD TESTS WHEN USER CHANGES
  ======================================================= */

  useEffect(() => {
    loadTests();
  }, [
    user?.id,
    user?.role,
    user?.classId,
  ]);

  /* =======================================================
     LOAD RESULTS
  ======================================================= */

  useEffect(() => {
    loadResults();
  }, [
    user?.email,
    user?.role,
  ]);

  /* =======================================================
     LOAD CLASS-WISE TESTS
  ======================================================= */

  const loadTests = async () => {

    try {
      /* ---------------------------------------------------
         No user
      --------------------------------------------------- */

      if (!user) {
        console.log(
          "No logged-in user for TestContext"
        );

        setTests([]);
        setQuestions([]);

        return;
      }

      /* ---------------------------------------------------
         Check Admin
      --------------------------------------------------- */

      const isAdmin =
        user.role === "admin";

      console.log(
        "TestContext user role:",
        user.role
      );

      console.log(
        "TestContext classId:",
        user.classId
      );

      /* ---------------------------------------------------
         Student class validation
      --------------------------------------------------- */

      if (
        !isAdmin &&
        !ALLOWED_CLASSES.includes(
          Number(user.classId)
        )
      ) {
        console.log(
          "Invalid student classId:",
          user.classId
        );

        setTests([]);
        setQuestions([]);

        return;
      }

      /* ---------------------------------------------------
         Get Courses
      --------------------------------------------------- */

      const token = await getToken();

      const response = await fetch(
        `${API_BASE_URL}/courses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        console.log(
          "Failed to load courses"
        );

        setTests([]);
        setQuestions([]);

        return;
      }

      let courses =
        data.courses || [];

      console.log(
        "All courses from backend:",
        courses.length
      );

      /* ---------------------------------------------------
         STUDENT CLASS FILTER
      --------------------------------------------------- */

      if (!isAdmin) {
        courses =
          courses.filter(
            (course: any) =>
              Number(course.classId) ===
              Number(user.classId)
          );
      }

      console.log(
        "Courses used for tests:",
        courses.map(
          (course: any) => ({
            id: course._id,
            title: course.title,
            classId: course.classId,
          })
        )
      );

      /* ---------------------------------------------------
         Get tests for allowed courses
      --------------------------------------------------- */

      const testRequests =
        courses.map(
          async (course: any) => {
            try {
              const courseId =
                course._id;

              const response =
                await fetch(
                  `${API_BASE_URL}/tests/course/${courseId}`,
                  {
                    headers: {
                      Authorization:
                        `Bearer ${
                          await getToken()
                        }`,
                    },
                  }
                );

              const data =
                await response.json();

              if (
                !response.ok ||
                !data.success
              ) {
                console.log(
                  "Test request failed:",
                  course.title,
                  data.message
                );

                return [];
              }

              return data.tests || [];
            } catch (error) {
              console.log(
                "Test course request error:",
                error
              );

              return [];
            }
          }
        );

      const testArrays =
        await Promise.all(
          testRequests
        );

      const backendTests =
        testArrays.flat();

      console.log(
        "Backend tests received:",
        backendTests.length
      );

      /* ---------------------------------------------------
         Map tests
      --------------------------------------------------- */

      const mappedTests =
        backendTests.map(
          mapTest
        );

      /* ---------------------------------------------------
         Map questions
      --------------------------------------------------- */

      const mappedQuestions =
        backendTests.flatMap(
          (test: any) => {
            const testId =
              test._id?.toString();

            if (!testId) {
              return [];
            }

            return (
              test.questions || []
            ).map(
              (question: any) =>
                mapQuestion(
                  question,
                  testId
                )
            );
          }
        );

      setTests(
        mappedTests
      );

      setQuestions(
        mappedQuestions
      );

      console.log(
        "Final tests loaded:",
        mappedTests.length
      );
    } catch (error) {
      console.error(
        "Load Tests Error:",
        error
      );

      setTests([]);
      setQuestions([]);
    }
  };

  /* =======================================================
     REFRESH TESTS
  ======================================================= */

  const refreshTests =
    async () => {
      await loadTests();
    };

  /* =======================================================
     LOAD RESULTS
  ======================================================= */

  const loadResults =
    async () => {
      try {
        if (!user?.email) {
          setResults([]);
          return;
        }

        const token =
          await getToken();

        if (!token) {
          setResults([]);
          return;
        }

        const isAdmin =
          user.role === "admin";

        const endpoint =
          isAdmin
            ? `${API_BASE_URL}/test-results`
            : `${API_BASE_URL}/test-results/my-results`;

        const response =
          await fetch(
            endpoint,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          setResults([]);
          return;
        }

        const backendResults =
          data.results || [];

        setResults(
          backendResults.map(
            mapResult
          )
        );
      } catch (error) {
        console.error(
          "Load Results Error:",
          error
        );

        setResults([]);
      }
    };

  /* =======================================================
     ADD TEST
  ======================================================= */

  const addTest = async (
    test: Omit<
      Test,
      "id" | "questions"
    >
  ): Promise<boolean> => {
    try {
      const token =
        await getToken();

      if (!token) {
        return false;
      }

      const response =
        await fetch(
          `${API_BASE_URL}/tests`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              title: test.title,

              description:
                test.description,

              course:
                test.courseId,

              duration:
                test.duration,

              questions: [],
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        return false;
      }

      await loadTests();

      return true;
    } catch {
      return false;
    }
  };

  /* =======================================================
     UPDATE TEST
  ======================================================= */

  const updateTest =
    async (
      id: string,
      test: Omit<
        Test,
        "id" | "questions"
      >
    ): Promise<boolean> => {
      try {
        const token =
          await getToken();

        if (!token) {
          return false;
        }

        const response =
          await fetch(
            `${API_BASE_URL}/tests/${id}`,
            {
              method: "PUT",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                title:
                  test.title,

                description:
                  test.description,

                duration:
                  test.duration,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          return false;
        }

        await loadTests();

        return true;
      } catch {
        return false;
      }
    };

  /* =======================================================
     DELETE TEST
  ======================================================= */

  const deleteTest =
    async (
      id: string
    ): Promise<boolean> => {
      try {
        const token =
          await getToken();

        if (!token) {
          return false;
        }

        const response =
          await fetch(
            `${API_BASE_URL}/tests/${id}`,
            {
              method: "DELETE",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          return false;
        }

        await loadTests();

        return true;
      } catch {
        return false;
      }
    };

  /* =======================================================
     GET TEST FROM BACKEND
  ======================================================= */

  const getTestFromBackend =
    async (
      testId: string
    ) => {
      const token =
        await getToken();

      const response =
        await fetch(
          `${API_BASE_URL}/tests/${testId}`,
          {
            headers: token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {},
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Test not found"
        );
      }

      return data.test;
    };

  /* =======================================================
     UPDATE BACKEND QUESTIONS
  ======================================================= */

  const updateBackendQuestions =
    async (
      testId: string,
      backendQuestions: any[]
    ): Promise<boolean> => {
      try {
        const token =
          await getToken();

        if (!token) {
          return false;
        }

        const response =
          await fetch(
            `${API_BASE_URL}/tests/${testId}`,
            {
              method: "PUT",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                questions:
                  backendQuestions,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          return false;
        }

        await loadTests();

        return true;
      } catch {
        return false;
      }
    };

  /* =======================================================
     ADD QUESTION
  ======================================================= */

  const addQuestion =
    async (
      question: Omit<
        Question,
        "id"
      >
    ): Promise<boolean> => {
      try {
        const test =
          await getTestFromBackend(
            question.testId
          );

        const existingQuestions =
          Array.isArray(
            test.questions
          )
            ? test.questions
            : [];

        const newQuestion = {
          question:
            question.question,

          options:
            question.options,

          correctAnswer:
            String(
              question.correctAnswer
            ),

          marks:
            question.marks,
        };

        const updatedQuestions =
          [
            ...existingQuestions,
            newQuestion,
          ];

        return await updateBackendQuestions(
          question.testId,
          updatedQuestions
        );
      } catch {
        return false;
      }
    };

  /* =======================================================
     UPDATE QUESTION
  ======================================================= */

  const updateQuestion =
    async (
      id: string,
      question: Omit<
        Question,
        "id"
      >
    ): Promise<boolean> => {
      try {
        const test =
          await getTestFromBackend(
            question.testId
          );

        const existingQuestions =
          Array.isArray(
            test.questions
          )
            ? test.questions
            : [];

        const updatedQuestions =
          existingQuestions.map(
            (item: any) => {
              const itemId =
                item._id?.toString() ||
                item.id;

              if (
                itemId !== id
              ) {
                return item;
              }

              return {
                ...item,

                question:
                  question.question,

                options:
                  question.options,

                correctAnswer:
                  String(
                    question.correctAnswer
                  ),

                marks:
                  question.marks,
              };
            }
          );

        return await updateBackendQuestions(
          question.testId,
          updatedQuestions
        );
      } catch {
        return false;
      }
    };

  /* =======================================================
     DELETE QUESTION
  ======================================================= */

  const deleteQuestion =
    async (
      id: string
    ): Promise<boolean> => {
      try {
        const questionToDelete =
          questions.find(
            (item) =>
              item.id === id
          );

        if (
          !questionToDelete
        ) {
          return false;
        }

        const test =
          await getTestFromBackend(
            questionToDelete.testId
          );

        const existingQuestions =
          Array.isArray(
            test.questions
          )
            ? test.questions
            : [];

        const updatedQuestions =
          existingQuestions.filter(
            (item: any) => {
              const itemId =
                item._id?.toString() ||
                item.id;

              return (
                itemId !== id
              );
            }
          );

        return await updateBackendQuestions(
          questionToDelete.testId,
          updatedQuestions
        );
      } catch {
        return false;
      }
    };

  /* =======================================================
     GET TEST QUESTIONS
  ======================================================= */

  const getTestQuestions =
    (
      testId: string
    ): Question[] => {
      return questions.filter(
        (question) =>
          question.testId ===
          testId
      );
    };

  /* =======================================================
     SAVE TEST RESULT
  ======================================================= */

  const saveTestResult =
    async (
      result: Omit<
        TestResult,
        | "id"
        | "attemptedAt"
        | "studentName"
        | "studentEmail"
      >
    ): Promise<boolean> => {
      try {
        const token =
          await getToken();

        if (!token) {
          return false;
        }

        const test =
          tests.find(
            (item) =>
              item.id ===
              result.testId
          );

        if (!test) {
          return false;
        }

        const response =
          await fetch(
            `${API_BASE_URL}/test-results`,
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                testId:
                  result.testId,

                courseId:
                  test.courseId,

                score:
                  result.score,

                totalMarks:
                  result.totalMarks,

                answers:
                  result.answers || [],
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          return false;
        }

        await loadResults();

        return true;
      } catch {
        return false;
      }
    };

  /* =======================================================
     GET TEST RESULTS
  ======================================================= */

  const getTestResults =
    (
      testId?: string
    ): TestResult[] => {
      if (!testId) {
        return results;
      }

      return results.filter(
        (result) =>
          result.testId ===
          testId
      );
    };

  /* =======================================================
     DELETE TEST RESULT
  ======================================================= */

  const deleteTestResult =
    async (
      id: string
    ): Promise<boolean> => {
      return false;
    };

  /* =======================================================
     PROVIDER
  ======================================================= */

  return (
    <TestContext.Provider
      value={{
        tests,
        questions,
        results,

        addTest,
        updateTest,
        deleteTest,

        addQuestion,
        updateQuestion,
        deleteQuestion,

        getTestQuestions,

        saveTestResult,
        getTestResults,
        deleteTestResult,

        refreshTests,
      }}
    >
      {children}
    </TestContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useTests() {
  const context =
    useContext(TestContext);

  if (!context) {
    throw new Error(
      "useTests must be used inside TestProvider"
    );
  }

  return context;
}
