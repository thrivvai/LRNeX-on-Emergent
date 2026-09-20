export const STAGE_ONE_ROUTES = {
  landing: "/",
  studentHome: "/student",
  representativeLesson: "/lesson",
  staffAnalytics: "/admin",
} as const;

export const STAGE_ONE_CHECKPOINT = {
  studentJourney: [
    "student-entry",
    "pretest",
    "lesson",
    "saved-progress",
    "posttest",
    "student-result",
    "staff-analytics",
  ],
  status: "persisted-vertical-slice",
} as const;
