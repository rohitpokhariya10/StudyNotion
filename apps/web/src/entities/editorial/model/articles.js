import courseImage from "@/shared/assets/editorial/course.svg"
import studyImage from "@/shared/assets/editorial/study.svg"
import teachingImage from "@/shared/assets/editorial/teaching.svg"

// Original static Prahit guides. No fictional authors, dates or CMS.
export const articles = [
  {
    slug: "make-a-little-time-for-learning",
    title: "Make a little time for learning",
    category: "Learning habits",
    readingTime: "4 min read",
    image: studyImage,
    imageAlt: "Illustrated study pages, a pencil and a completed task",
    excerpt:
      "A practical way to turn a good intention into a learning routine you can return to.",
    body: `## Start with one clear intention
A long list of things to learn can make it hard to begin. Choose one thing you would like to understand or be able to do. Write it in plain language: explain a concept, build a small feature, or work through a topic that has been confusing you.

Use that intention to choose your next lesson. You do not need to plan every week in advance. A clear next step is enough to start.

## Give the lesson a little space
Choose a time when you can pay attention. Put the materials you need within reach and close unrelated tabs. A short session you can actually fit into your day is a useful starting point.

If a lesson is longer than the time you have, stop at a natural break. Write down the idea you were working on and what you want to try next. That note can make returning easier.

## Watch, then try
Pause when an explanation introduces something new. Describe it in your own words before moving on. For a practical subject, try the example yourself and change one part of it. Notice what happens.

If you get stuck, return to the relevant part of the lesson. The aim is to understand the idea well enough to use it, rather than simply reach the end of the video.

## Make completion meaningful
Prahit lets you mark lessons complete when the player offers that action. Wait for the save to finish so your account reflects the completed lesson. Use the curriculum to see the steps you have finished and the topics still ahead.

A completion indicator is a record of your course progress. Your own examples, explanations and practice are useful ways to check what you understand.

## Leave yourself a next step
At the end of a session, write one sentence about what you learned and one question you want to answer next. Keep these notes wherever you normally study; the course player does not include a separate notes feature.

Some days will be busy. When you return, start with that question. You can revisit a lesson without having to begin the entire course again.`,
  },
  {
    slug: "choose-a-course-with-confidence",
    title: "Choose your next course with confidence",
    category: "Course guides",
    readingTime: "3 min read",
    image: courseImage,
    imageAlt: "Illustrated course outline with a check mark",
    excerpt:
      "Look beyond a title: read the curriculum, consider your starting point and understand checkout.",
    body: `## Begin with your goal
Before browsing, decide what you want from the course. Are you exploring a new subject or filling a specific gap? A clear goal makes it easier to compare descriptions and curricula.

## Read the curriculum
Open a course page and expand its sections. Look for the topics you need and the order in which they appear. Read the description and any listed learning outcomes or requirements. If something you need is not listed, do not assume it is included.

## Consider your starting point
Catalog filters can help narrow the available courses. Check the course information as well: a filter is a starting point, while the description and curriculum provide the detail for your decision.

Read available learner reviews for context. A review describes one learner's experience, and it is most helpful when considered alongside the course content and your own goal.

## Understand the purchase
Review the current price and checkout policies before you pay. The checkout service confirms the applicable terms and refund conditions. Do not assume that a refund window or access period is the same for every purchase.

If a payment is interrupted, check your purchase history and any displayed status before trying again. Contact support if an order needs clarification.

## Start from your library
After enrollment is confirmed, open your enrolled courses. Follow the available lesson link and use the curriculum to move through the course. Courses with no available lessons display their own waiting state.

Choose a first session small enough to complete. The best next course is one whose material fits your goal and whose lessons you can make time to use.`,
  },
  {
    slug: "turn-your-knowledge-into-a-course",
    title: "Turn your knowledge into a thoughtful course",
    category: "Teaching",
    readingTime: "4 min read",
    image: teachingImage,
    imageAlt: "Illustrated lesson plan with a pencil and checklist",
    excerpt:
      "A clear outcome, a useful sequence and focused lessons give learners a stronger place to start.",
    body: `## Choose a useful outcome
Start by describing what a learner should understand or be able to do after the course. Keep it specific enough to guide your decisions about what belongs in the curriculum.

List the knowledge a learner needs before beginning. Make those expectations clear in the course information so people can decide whether the material fits their starting point.

## Build the sequence first
Sketch the sections before recording every lesson. Each section should have a purpose, and each lesson should help the learner move towards it. Put foundational ideas before examples that depend on them.

A useful check is to describe the connection between neighbouring lessons in one sentence. If the connection is unclear, consider whether the order needs to change.

## Make examples do real work
Use examples to explain a decision, not just demonstrate a finished result. Show what you are doing and why. When appropriate, include a common mistake and explain how to recognise it.

Give learners a moment to pause and try. Keep essential information in the explanation rather than relying on an unsupported download or extra tool.

## Use the authoring stages
Approved Prahit instructors work through Course Information, Course Builder and Publish. Course Information holds the description and required details. Course Builder organises sections and uploaded lessons. The final stage reviews the course for publication.

Check the actual uploaded media and section order before publishing. Follow any validation messages rather than assuming an upload or publication has completed.

## Review the learner's path
Read the course page as someone who has never met you. Does the title match the content? Are requirements clear? Does the curriculum describe what is actually taught?

Creating an instructor account is the first step, and approval is required before the teaching tools become available. Choose Instructor on the existing signup form and complete the verification process.`,
  },
]
export const articleCategories = [
  ...new Set(articles.map((article) => article.category)),
]
export function filterArticles(query = "", category = "") {
  const term = query.trim().toLowerCase()
  return articles.filter(
    (article) =>
      (!category || article.category === category) &&
      `${article.title} ${article.excerpt} ${article.category}`
        .toLowerCase()
        .includes(term)
  )
}
