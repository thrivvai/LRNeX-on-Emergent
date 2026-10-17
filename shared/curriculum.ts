export type CurriculumPractice = {
  prompt: string;
  choices: Array<{ id: string; label: string }>;
  answer: string;
  explanation: string;
};

export type CurriculumStep = {
  id: string;
  label: string;
  title: string;
  body: string;
  callout?: string;
  practice?: CurriculumPractice;
};

export type CurriculumModule = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  phase: "notice" | "try" | "carry";
  description: string;
  objective: string;
  standards: string[];
  status: "active" | "available" | "coming-soon";
  lessonId: string;
  steps: CurriculumStep[];
};

/** Version tag on lesson_progress rows for these modules; must equal the seeded lessons' content_version. */
export const CURRICULUM_CONTENT_VERSION = "curriculum-1";

// The UI renders this file, while lesson_progress and learning_events reference the lessons seeded by
// supabase/migrations/20260927000000_d2d_curriculum_modules.sql. Each module's lessonId, slug, title, and
// step text must match that seed; server/curriculum.contract.test.ts fails if they drift apart.
export const D2D_CURRICULUM: CurriculumModule[] = [
  {
    id: "module-01",
    slug: "the-money-you-pay",
    title: "The Money You Pay",
    eyebrow: "FIELD NOTE 01 / CREDIT",
    phase: "notice",
    description: "Read a credit-card statement, separate the signals, and make a payment decision you can explain.",
    objective: "Interpret balance, minimum payment, APR, and due date in a real-world context.",
    standards: ["MD PFL 4", "8.AT.A.1", "8.EE.B.5"],
    status: "active",
    lessonId: "66666666-6666-4666-8666-666666666666",
    steps: [
      {
        id: "notice",
        label: "01 / NOTICE",
        title: "Slow down before you decide.",
        body: "A statement is not a wall of numbers. Start by locating the new balance, minimum payment, APR, and payment due date. Each number answers a different question.",
        callout: "New balance = the total amount currently owed. Minimum payment = the smallest payment that keeps the account from being late.",
        practice: { prompt: "A statement shows a $960 new balance and a $35 minimum payment. Which number tells you what you owe right now?", choices: [{ id: "new_balance", label: "The new balance" }, { id: "minimum", label: "The minimum payment" }, { id: "apr", label: "The APR" }], answer: "new_balance", explanation: "The new balance is the current total owed. The minimum payment is only the smallest amount due." },
      },
      {
        id: "try",
        label: "02 / TRY",
        title: "Name the tradeoff.",
        body: "Paying only the minimum may protect you from a late fee today, but it usually keeps the balance around longer. A stronger decision names both the immediate need and the longer-term cost.",
        callout: "A good decision is not just a number. It is a reason you can carry forward.",
        practice: { prompt: "Before choosing how much to pay, what should you look at next?", choices: [{ id: "due_date", label: "The due date and what you can afford" }, { id: "card_color", label: "The card color" }, { id: "logo", label: "The logo" }], answer: "due_date", explanation: "The due date and your available money help you compare the short-term and long-term consequences." },
      },
      {
        id: "carry",
        label: "03 / CARRY",
        title: "Carry the question forward.",
        body: "The next time money feels complicated, ask: What does this number measure? What choice does it unlock? What evidence would change my mind? Those questions work beyond credit cards.",
        callout: "Notice first. Decide second. Explain the move.",
      },
    ],
  },
  {
    id: "module-02",
    slug: "credit-choices",
    title: "Credit Choices",
    eyebrow: "FIELD NOTE 02 / TRADEOFFS",
    phase: "try",
    description: "Compare two credit offers and make the hidden cost visible before choosing.",
    objective: "Compare fees, interest, and repayment conditions to justify a financially responsible choice.",
    standards: ["MD PFL 1", "MD PFL 4", "8.AT.B.3"],
    status: "available",
    lessonId: "66666666-6666-4666-8666-666666666667",
    steps: [
      { id: "compare", label: "01 / NOTICE", title: "Put both offers on the same page.", body: "A lower monthly payment can hide a longer payoff or a higher total cost. Build a side-by-side comparison before choosing.", callout: "Monthly payment is one signal, not the whole story." },
      { id: "question", label: "02 / TRY", title: "Ask what the offer costs over time.", body: "Find the fee, interest rate, length of repayment, and total amount paid. Circle the detail that could change your decision.", callout: "Evidence-seeking is a strength, not hesitation." },
      { id: "justify", label: "03 / CARRY", title: "Explain your choice.", body: "Choose the offer that fits the scenario and explain the tradeoff in one or two sentences. A different choice can still be strong when the reasoning is clear." },
    ],
  },
  {
    id: "module-03",
    slug: "payment-plan-model",
    title: "Payment Plan Model",
    eyebrow: "FIELD NOTE 03 / MODELING",
    phase: "try",
    description: "Use a table, graph, and equation to model how a balance changes over time.",
    objective: "Represent a relationship, test assumptions, and interpret a result in context.",
    standards: ["8.AT.D", "8.F.B", "MD PFL 3"],
    status: "available",
    lessonId: "66666666-6666-4666-8666-666666666668",
    steps: [
      { id: "table", label: "01 / NOTICE", title: "Find the pattern in the table.", body: "A table shows what changes each month and what stays the same. Look for the rate of change before reaching for a formula.", callout: "A model is a claim about how a situation behaves." },
      { id: "equation", label: "02 / TRY", title: "Choose a useful representation.", body: "Translate the pattern into an equation or graph. Check whether the representation still makes sense when you test a new value." },
      { id: "interpret", label: "03 / CARRY", title: "Interpret, then challenge the model.", body: "State what the answer means in the real situation and name one assumption that could make the model less accurate." },
    ],
  },
  {
    id: "module-04",
    slug: "carry-it-forward",
    title: "Carry It Forward",
    eyebrow: "FIELD NOTE 04 / TRANSFER",
    phase: "carry",
    description: "Transfer the same reasoning to a new purchase, income, or savings decision.",
    objective: "Apply a strategy in an unfamiliar context and explain which evidence still matters.",
    standards: ["MD PFL 1", "MD PFL 3", "8.AT.B.4"],
    status: "available",
    lessonId: "66666666-6666-4666-8666-666666666669",
    steps: [
      { id: "notice", label: "01 / NOTICE", title: "What is actually being asked?", body: "Separate the story from the signal. Identify the quantities, the constraint, and the decision the person needs to make." },
      { id: "transfer", label: "02 / TRY", title: "Reuse the strategy, not the answer.", body: "Bring forward the questions that helped you before, but rebuild the model for this situation. Transfer means adapting." },
      { id: "reflect", label: "03 / CARRY", title: "Make your thinking visible.", body: "Write the decision, the evidence, and the next question. Your explanation is part of the work, not an afterthought." },
    ],
  },
];
