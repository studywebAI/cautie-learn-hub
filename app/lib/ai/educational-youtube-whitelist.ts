export type EducationalChannel = {
  channel: string;
  focus: string[];
  sampleVideos: string[];
};

export const EDUCATIONAL_YOUTUBE_WHITELIST: EducationalChannel[] = [
  { channel: "Khan Academy", focus: ["math", "science", "history", "economics"], sampleVideos: ["https://www.youtube.com/@khanacademy"] },
  { channel: "CrashCourse", focus: ["history", "biology", "chemistry", "literature"], sampleVideos: ["https://www.youtube.com/@crashcourse"] },
  { channel: "Veritasium", focus: ["physics", "science"], sampleVideos: ["https://www.youtube.com/@veritasium"] },
  { channel: "3Blue1Brown", focus: ["math", "calculus", "linear algebra"], sampleVideos: ["https://www.youtube.com/@3blue1brown"] },
  { channel: "Numberphile", focus: ["math"], sampleVideos: ["https://www.youtube.com/@numberphile"] },
  { channel: "MinutePhysics", focus: ["physics"], sampleVideos: ["https://www.youtube.com/@MinutePhysics"] },
  { channel: "Professor Dave Explains", focus: ["chemistry", "physics", "biology"], sampleVideos: ["https://www.youtube.com/@ProfessorDaveExplains"] },
  { channel: "The Organic Chemistry Tutor", focus: ["math", "chemistry", "physics"], sampleVideos: ["https://www.youtube.com/@TheOrganicChemistryTutor"] },
  { channel: "TED-Ed", focus: ["history", "science", "language"], sampleVideos: ["https://www.youtube.com/@TEDEd"] },
  { channel: "CGP Grey", focus: ["history", "politics", "geography"], sampleVideos: ["https://www.youtube.com/@CGPGrey"] },
  { channel: "Oversimplified", focus: ["history"], sampleVideos: ["https://www.youtube.com/@OverSimplified"] },
  { channel: "Simple History", focus: ["history"], sampleVideos: ["https://www.youtube.com/@Simplehistory"] },
  { channel: "Math with Menno", focus: ["math"], sampleVideos: ["https://www.youtube.com/results?search_query=math+with+menno"] },
  { channel: "SmarterEveryDay", focus: ["engineering", "science"], sampleVideos: ["https://www.youtube.com/@smartereveryday"] },
  { channel: "SciShow", focus: ["science", "biology"], sampleVideos: ["https://www.youtube.com/@SciShow"] },
  { channel: "Kurzgesagt - In a Nutshell", focus: ["science", "biology", "space"], sampleVideos: ["https://www.youtube.com/@kurzgesagt"] },
  { channel: "PBS Space Time", focus: ["physics", "space"], sampleVideos: ["https://www.youtube.com/@pbsspacetime"] },
  { channel: "History Matters", focus: ["history", "politics"], sampleVideos: ["https://www.youtube.com/@HistoryMatters"] },
  { channel: "Historia Civilis", focus: ["history"], sampleVideos: ["https://www.youtube.com/@HistoriaCivilis"] },
  { channel: "Mr. Beat", focus: ["history", "civics"], sampleVideos: ["https://www.youtube.com/@iammrbeat"] },
  { channel: "The Plain Bagel", focus: ["economics", "finance"], sampleVideos: ["https://www.youtube.com/@ThePlainBagel"] },
  { channel: "Ben Eater", focus: ["computer science", "engineering"], sampleVideos: ["https://www.youtube.com/@BenEater"] },
  { channel: "Computerphile", focus: ["computer science", "math"], sampleVideos: ["https://www.youtube.com/@Computerphile"] },
  { channel: "MIT OpenCourseWare", focus: ["math", "science", "engineering"], sampleVideos: ["https://www.youtube.com/@mitocw"] },
  { channel: "YaleCourses", focus: ["history", "philosophy", "economics"], sampleVideos: ["https://www.youtube.com/@YaleCourses"] },
  { channel: "Professor Leonard", focus: ["math", "calculus"], sampleVideos: ["https://www.youtube.com/@ProfessorLeonard"] },
  { channel: "Amoeba Sisters", focus: ["biology", "science"], sampleVideos: ["https://www.youtube.com/@AmoebaSisters"] },
  { channel: "Bozeman Science", focus: ["science", "biology", "chemistry", "physics"], sampleVideos: ["https://www.youtube.com/@BozemanScience"] },
  { channel: "NileRed", focus: ["chemistry"], sampleVideos: ["https://www.youtube.com/@NileRed"] },
  { channel: "Real Engineering", focus: ["engineering", "technology"], sampleVideos: ["https://www.youtube.com/@RealEngineering"] },
  { channel: "Wendover Productions", focus: ["geography", "economics", "history"], sampleVideos: ["https://www.youtube.com/@Wendoverproductions"] },
];

export function pickWhitelistedChannelsForTopic(sourceText: string, max = 5): EducationalChannel[] {
  const hay = sourceText.toLowerCase();
  const scored = EDUCATIONAL_YOUTUBE_WHITELIST.map((entry) => {
    const score = entry.focus.reduce((acc, tag) => (hay.includes(tag) ? acc + 1 : acc), 0);
    return { entry, score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((row) => row.entry);

  if (scored.length > 0) return scored;
  return EDUCATIONAL_YOUTUBE_WHITELIST.slice(0, Math.min(max, EDUCATIONAL_YOUTUBE_WHITELIST.length));
}
