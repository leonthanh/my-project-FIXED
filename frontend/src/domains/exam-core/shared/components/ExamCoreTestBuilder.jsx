import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import AdminNavbar from "../../../../shared/components/AdminNavbar";
import { 
  QuestionTypeSelector, 
  QuestionEditorFactory,
} from "../../../../shared/components/questions";
import { 
  getQuestionTypesForTest,
  getDefaultQuestionData,
  getTestConfig,
  QUESTION_TYPES,
  TEST_CONFIGS,
} from "../../../../shared/config/questionTypes";
import {
  apiPath,
  hostPath,
  authFetch,
  redirectToLogin,
  getStoredUser,
} from "../../../../shared/utils/api";
import useQuillImageUpload from "../../../../shared/hooks/useQuillImageUpload";
import { canManageCategory } from '../../../../shared/utils/permissions';
import AudioPreviewBlock from "../../../../shared/components/AudioPreviewBlock";
import LineIcon from "../../../../shared/components/LineIcon.jsx";
import "./ExamCoreTestBuilder.css";
import { computeQuestionStarts, getQuestionCountForSection } from "../utils/examQuestionNumbering";
import renumberGatewayClozeQuestion from "../utils/gatewayClozeNumbering";
import { normalizeQuillPromptHtml } from "../utils/normalizePromptHtml";
import { normalizeAudioReference, normalizeListeningPartsAudio } from "../../../../shared/utils/audioUrls";
import resolveAuthUserDisplayName from "../../../../shared/utils/authUserDisplayName";
import GATEWAY_WRITING_RUBRIC from "../../../../shared/config/gatewayWritingRubric";

const InlineIcon = ({ name, size = 16, strokeWidth = 2, style }) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 0,
      ...style,
    }}
  >
    <LineIcon name={name} size={size} strokeWidth={strokeWidth} />
  </span>
);

const QUESTION_TYPE_ICONS = {
  fill: "fill",
  abc: "choice",
  abcd: "choice",
  "long-text-mc": "reading",
  "cloze-mc": "selector",
  "cloze-test": "form",
  "short-message": "writing",
  "people-matching": "matching",
  "word-form": "edit",
  "matching-pictures": "image",
  "image-cloze": "image",
  "word-drag-cloze": "flowchart",
  "story-completion": "reading",
  "look-read-write": "writing",
  "gap-match": "matching",
  "draw-lines": "target",
  "letter-matching": "matching",
  "image-tick": "correct",
  "colour-write": "palette",
  "preposition-gap-fill": "selector",
  "odd-one-out": "correct",
};

const createGatewayRewriteItems = () => ([
  {
    questionText: "We often go on backpacking holidays so it’s easy to remember what to pack.",
    correctAnswer: "We used to go on backpacking holidays, so it’s easy to remember what to pack.",
    explanation: "",
  },
  {
    questionText: "I remember this place being totally uncontaminated.",
    correctAnswer: "I remember this place used to be totally uncontaminated.",
    explanation: "",
  },
  {
    questionText: "Marie enjoyed scuba diving when she was younger.",
    correctAnswer: "Marie used to enjoy scuba diving when she was younger.",
    explanation: "",
  },
  {
    questionText: "My parents were in the habit of planning their holidays very carefully.",
    correctAnswer: "My parents would plan their holidays very carefully.",
    explanation: "",
  },
  {
    questionText: "Mum finds it normal to speak Spanish every day because her mum is Spanish.",
    correctAnswer: "Mum is used to speaking Spanish every day because her mum is Spanish.",
    explanation: "",
  },
]);

const createGatewayGrammarAQuestionData = () => ({
  ...getDefaultQuestionData("reading-open-questions"),
  layoutMode: "rewrite-sentences",
  passageTitle: "A. Rewrite these sentences using be used to, used to or would.",
  instruction: "Rewrite each sentence.",
  scoreNote: "____/5 (1 mark per answer)",
  items: createGatewayRewriteItems(),
});

const createGatewayUseEnglishAQuestionData = () => ({
  ...getDefaultQuestionData("reading-open-questions"),
  layoutMode: "reorder-words",
  passageTitle: "A. Reorder the given words to make sentences.",
  instruction: "Write the words in the correct order.",
  scoreNote: "_____/5 (1 mark per answer)",
  items: [
    {
      questionText: "when / were / Sally and Dave / on / met / they / getting / a coach.",
      correctAnswer: "Sally and Dave met when they were getting on a coach.",
      explanation: "",
    },
    {
      questionText: "left / on / last night. / She / her / luggage / the train /",
      correctAnswer: "She left her luggage on the train last night.",
      explanation: "",
    },
    {
      questionText: "while / spoke / she / was / travelling / in / She / Italy. / Italian /",
      correctAnswer: "She spoke Italian while she was travelling in Italy.",
      explanation: "",
    },
    {
      questionText: "got on / and / quickly / the tram / a seat / The child / the window. / found / near /",
      correctAnswer: "The child quickly got on the tram and found a seat near the window.",
      explanation: "",
    },
    {
      questionText: "raining / when / he / the / bike ride. / started / It / was /",
      correctAnswer: "It was raining when he started the bike ride.",
      explanation: "",
    },
  ],
});

const createGatewayUseEnglishBQuestionData = () => ({
  ...getDefaultQuestionData("cloze-test"),
  passageTitle: "B. For each question, write the correct answer.",
  instruction: "Write one word for each gap.",
  scoreNote: "_____/5 (1 mark per answer)",
  passageText: `<p style="text-align:center;"><strong>WORKING AS A CLOWN</strong></p>
<p style="text-align:center;"><em>by Richard Kerr</em></p>
<p>I started my career as a clown when I was in my twenties. I (0) used to work as a magician before a colleague of mine introduced me to his best friend, who was a circus clown and needed a partner for his shows. That's (36) how my career started.</p>
<p>I spent 10 years working in several circuses. Although I had an agent at the time, I wanted to work (37) on my own, so I decided to try and get a job with the Starry Sky Circus. When I met the circus owner, he advised me to spend a term at the Clown School since he (38) only wanted professional performers. After 6 months' training, I joined the Starry Sky Circus and worked on the road for 5 years.</p>
<p>When others ask me how to become a great clown, I always tell (39) them that it depends on how much you enjoy the work: you won't be successful (40) unless you really love what you do and commit to it.</p>`,
  answers: {
    36: "how",
    37: "on",
    38: "only",
    39: "them",
    40: "unless",
  },
});

const createGatewayReadingQuestionData = () => ({
  ...getDefaultQuestionData("long-text-mc"),
  gatewayReadingMode: true,
  passageTitle: "",
  passage: `<p style="text-align:center;"><strong>SUBWAY IN THE SKY</strong></p>
<p style="text-align:center;"><strong>THE MOST SPECTACULAR TRANSPORT SYSTEM IN THE WORLD.</strong></p>
<p>Visiting La Paz, Bolivia, was very challenging for tourists in the past. They either used to have to walk everywhere or risk their lives using small minibuses, which looked like they were going to break down at any moment. The city is surrounded by hills and mountains so transport along the ground took a long time. As one of the highest cities in the world, its districts range from 3,170 metres to 3,600 metres above sea level. Because of this, most tourists used to stay in the city centre.</p>
<p>But now tourists can get around the city on its amazing cable car system, the teleférico, which opened in 2014. It’s the highest cable car system in the world, operating 4,000 metres above sea level. Instead of a subway or underground, the neighbourhoods in La Paz are now linked by cable car lines. The system consists of eight lines: red, yellow, green, blue, orange, white, sky blue and purple. It runs on electricity and it is silent and quick.</p>
<p>A single ticket costs just three bolivianos – around 30 cents, and it can get you to most of the main tourist sites, with the most spectacular views of the city on the way. For example, you can get on the red line in the city centre where it starts, and in 20 minutes it will take you all the way to El Alto, the end of the line. There, you can get off and enjoy amazing views of the snowy mountains or experience local Bolivian life at the largest open-air market in the world. From the end of the line, a short ten-minute taxi ride will get you to La Paz’s international airport.</p>
<p>The operators are proud that the cable car is the most popular tourist attraction in the city. And it doesn’t just transport tourists, it gets children to school and people to work in half or a third of the time it used to take them. It’s also cheaper than other types of transport. Local people are delighted. ‘I used to travel for three or four hours to go shopping’, says Mónica Pérez, a secondary school teacher. Now, the journey is much quicker.</p>
<p>Mercedes Blanco, a student, is equally happy and says her stress levels are much lower. ‘Before, I had to take three buses to get to college. The road was noisy and polluted. It’s much better now’, she says. The journey is actually relaxing, floating above the city looking down on small office buildings, football fields and rivers. It’s a quiet and calm start to the day.</p>`,
  readingAInstruction: "A. Read the magazine article and choose the best answers.",
  readingAScoreNote: "_____/5 (1 mark per answer)",
  readingBInstruction: "B. Read the text again and decide whether the statements are True (T) or False (F).",
  readingBScoreNote: "_____/5 (1 mark per answer)",
  questions: [
    {
      questionText: "Why did getting around La Paz used to be difficult?",
      options: ["A. Because there weren’t many minibuses.", "B. Because the different parts of the city are at different heights.", "C. Because walking was dangerous."],
      correctAnswer: "B",
      answerType: "multiple-choice",
    },
    {
      questionText: "How did tourists used to get around La Paz?",
      options: ["A. by subway", "B. by car", "C. on foot"],
      correctAnswer: "C",
      answerType: "multiple-choice",
    },
    {
      questionText: "What can you do at the end of the red line?",
      options: ["A. visit an indoor market", "B. climb the mountain", "C. see spectacular scenery"],
      correctAnswer: "C",
      answerType: "multiple-choice",
    },
    {
      questionText: "Why do the local people like the teleférico?",
      options: ["A. It’s cleaner than the buses.", "B. It saves time and money.", "C. They can meet the tourists."],
      correctAnswer: "B",
      answerType: "multiple-choice",
    },
    {
      questionText: "Which of these facts about the teleférico is true?",
      options: ["A. It’s also a tourist attraction.", "B. It has created more pollution.", "C. It’s quite loud."],
      correctAnswer: "A",
      answerType: "multiple-choice",
    },
    {
      questionText: "In the past, travelling around La Paz was difficult because the city has a large number of hills.",
      correctAnswer: "F",
      answerType: "true-false",
    },
    {
      questionText: "The cable car system consists of eight lines connecting different parts of La Paz.",
      correctAnswer: "T",
      answerType: "true-false",
    },
    {
      questionText: "Passengers can enjoy views of the city while travelling on the cable car.",
      correctAnswer: "T",
      answerType: "true-false",
    },
    {
      questionText: "Local teacher Mónica Pérez believes that the cable car has made her daily journeys longer.",
      correctAnswer: "F",
      answerType: "true-false",
    },
    {
      questionText: "Mercedes Blanco enjoys travelling by cable car because she can see parts of the city from above.",
      correctAnswer: "T",
      answerType: "true-false",
    },
  ],
});

const createGatewayWritingQuestionData = () => ({
  ...getDefaultQuestionData("short-message"),
  gatewayWritingMode: true,
  messageType: "blog post",
  wordLimit: { min: 100, max: 120 },
  writingRubric: GATEWAY_WRITING_RUBRIC,
  situation: `<p><strong>Write a blog post about an experience you had while travelling somewhere, e.g. by train, plane or boat. Use a variety of past tenses. Write 100–120 words. Think about the following:</strong></p>
<ul>
<li>Was it a good/bad experience?</li>
<li>Where were you travelling to?</li>
<li>Why had you decided to take that type of transport?</li>
<li>How long was the journey?</li>
<li>What happened on the journey?</li>
<li>Were you late/early?</li>
</ul>
<p><strong><em><u>Use words and expressions for giving emphasis:</u></em></strong></p>
<ul>
<li><em>What a + (adjective) + noun!</em></li>
<li><em>so + adjective</em></li>
<li><em>such + (adjective) + noun</em></li>
<li><em>do and did in affirmative sentences, e.g. I really do love …</em></li>
</ul>`,
  sampleAnswer: "",
});

const createGatewayGrammarBQuestionData = () => ({
  ...getDefaultQuestionData("cloze-test"),
  passageTitle: "",
  wordBank: ["Be", "get off", "hope", "leave", "travel"],
  passageText: `<p><strong>B. Complete the text with the correct past simple, past continuous or past perfect form of the verbs in the box.</strong></p>
<p>I fell asleep on the train once and missed my stop.</p>
<p>It was two years ago when I <strong>(6)</strong> college in London to go home.</p>
<p>I <strong>(7)</strong> on a train from Kings Cross to Newark-on-Trent about 125 miles away.</p>
<p>It <strong>(8)</strong> a long day in London, so I was very tired. I had done this journey many times but had never fallen asleep before. On this occasion, I woke up just as the train was stopping in Newark, so I got my bags and went to the door, but unfortunately, before I got there, the train set off again.</p>
<p>I <strong>(9)</strong> to get off at the next stop, but the train didn’t stop there. Finally, the train arrived in Doncaster, 35 miles north of Newark where I <strong>(10)</strong>. Luckily, I only had to wait ten minutes for a train going in the opposite direction, and I arrived back in Newark, only a little over an hour after I had missed my stop.</p>
<p style="text-align:right;"><strong>_____/5</strong> (1 mark per answer)</p>`,
  answers: {
    6: "",
    7: "",
    8: "",
    9: "",
    10: "",
  },
});

const createGatewayGrammarCQuestionData = () => ({
  ...getDefaultQuestionData("cloze-test"),
  passageTitle: "C. Complete the text using Present Simple or Present Continuous forms of the verbs given.",
  instruction: "",
  scoreNote: "_____/5 (1 mark per answer)",
  passageText: `<p style="text-align:center;"><strong>My favourite person</strong></p>
<p>My favourite person is my grandma. She is like a best friend to me. She doesn’t live far away. It’s a five-minute walk, so I often (11) (go) and visit her.</p>
<p>She’s a <u>really likeable</u> person. She’s always smiling. Even though she’s elderly, she’s very energetic and (12) (love) trying new things. We (13) (learn) Italian together <u>at the moment</u>. It’s hard, but we (14) (make) good progress.</p>
<p>She wants to take me to Italy next year. The best thing about my grandma is that she’s always there for me when I (15) (have) a problem.</p>`,
  answers: {
    11: "",
    12: "",
    13: "",
    14: "",
    15: "",
  },
});

const createGatewayVocabularyAQuestionData = () => ({
  ...getDefaultQuestionData("cloze-test"),
  passageTitle: "A. Complete the dialogue with the words in the box. There are two words that you do not need to use.",
  instruction: "",
  scoreNote: "_____/5 (1 mark per answer)",
  wordBank: ["arrivals", "delay", "information", "luggage", "platform", "service", "station", "taxi rank"],
  passageText: `<p><strong>Janet:</strong>&nbsp; What time does Lisa's train arrive?</p>
<p><strong>Steve:</strong>&nbsp; I think it's about 10.30. Can you see it on the (16) screen?</p>
<p><strong>Janet:</strong>&nbsp; Yes, there it is. 10.34. But there's a (17) of ten minutes, so that means 10.44.</p>
<p><strong>Steve:</strong>&nbsp; OK, so we still have 15 minutes. Which (18) does the train come into?</p>
<p><strong>Janet:</strong>&nbsp; Number eight. It's over there.</p>
<p><strong>Steve:</strong>&nbsp; Lisa says she's bringing a lot of (19), so I don't think we should take the bus home. It's not easy carrying bags on the bus.</p>
<p><strong>Janet:</strong>&nbsp; You're right. There's a (20) just outside the station, so we can go there when she arrives.</p>
<p><strong>Steve:</strong>&nbsp; Great! Look, here comes the train!</p>`,
  answers: {
    16: "information",
    17: "delay",
    18: "platform",
    19: "luggage",
    20: "taxi rank",
  },
});

const createGatewayVocabularyBQuestions = () => {
  const questionDefaults = {
    passageTitle: "B. Choose the best answers to complete the mini-dialogues.",
    instruction: "",
    scoreNote: "_____/5 (1 mark per answer)",
  };

  return [
    {
      questionText: "Ana: Shall we get a ______ or a return ticket?\nBen: Get a return. It's cheaper.",
      options: ["A. fare", "B. single", "C. luggage"],
      correctAnswer: "B",
      ...questionDefaults,
    },
    {
      questionText: "Amy: Will you check the timetable on your phone? We need to ______ a train at around 7am.\nDan: Sure. I'll see what times they leave.",
      options: ["A. return", "B. catch", "C. miss"],
      correctAnswer: "B",
    },
    {
      questionText: "Eve: Let's get a coffee.\nSam: No, we don't have time. We'll ______ the plane.",
      options: ["A. lose", "B. cancel", "C. miss"],
      correctAnswer: "C",
    },
    {
      questionText: "Tom: I left my umbrella on the train last week.\nJon: Why don't you go to the ______ and see if they have it there?",
      options: ["A. lost property office", "B. waiting room", "C. service station"],
      correctAnswer: "A",
    },
    {
      questionText: "Zoe: What platform does the train leave from?\nSue: Check the ______ on the information screens.",
      options: ["A. arrivals", "B. departures", "C. train station"],
      correctAnswer: "B",
    },
  ];
};

const createGatewayVocabularyCQuestionData = () => ({
  ...getDefaultQuestionData("cloze-test"),
  passageTitle: "C. Complete the email with synonyms of the words given.",
  instruction: "",
  scoreNote: "_____/5 (1 mark per answer)",
  passageText: `<p>Hi Sophie,</p>
<p>When weren't you at Lee's party on Friday? I missed you. It was <strong><em>Ex 1. difficult (hard)</em></strong> to find Lee's house at first, so I was late. Everyone was already there, and they were all talking to each other. Lee's friends are more (26) (sociable) than me and I felt a bit shy. I was so (27) (happy) to see Jason. He came over and talked to me as he could see I was nervous. He told me he's going to study engineering. He's so (28) (intelligent). Sometimes I don't understand what he's talking about! Jason introduced me to a friend of his, called Duncan, who's very (29) (handsome)! Hannah was there, too, being silly as usual. She's so (30) (immature) sometimes. She's a year older than us, but she doesn't seem it.</p>
<p>Let's get together soon.</p>
<p>Love Thea</p>`,
  answers: {
  26: "outgoing",
  27: "glad | pleased",
  28: "clever | smart",
  29: "good-looking | attractive | gorgeous",
  30: "childish",
  },
});

const normalizeGatewaySectionKey = (value) => String(value || "").trim().toLowerCase();

const GATEWAY_READING_WRITING_SECTION_BLUEPRINTS = [
  {
    sectionTitle: "Grammar - A",
    questionType: "reading-open-questions",
    buildDefaultQuestionData: createGatewayGrammarAQuestionData,
  },
  {
    sectionTitle: "Grammar - B",
    questionType: "cloze-test",
    buildDefaultQuestionData: createGatewayGrammarBQuestionData,
  },
  {
    sectionTitle: "Grammar - C",
    questionType: "cloze-test",
    buildDefaultQuestionData: createGatewayGrammarCQuestionData,
  },
  {
    sectionTitle: "Vocabulary - A",
    questionType: "cloze-test",
    buildDefaultQuestionData: createGatewayVocabularyAQuestionData,
  },
  {
    sectionTitle: "Vocabulary - B",
    questionType: "abc",
    buildDefaultQuestions: createGatewayVocabularyBQuestions,
  },
  {
    sectionTitle: "Vocabulary - C",
    questionType: "cloze-test",
    buildDefaultQuestionData: createGatewayVocabularyCQuestionData,
  },
  {
    sectionTitle: "Use of English - A",
    questionType: "reading-open-questions",
    buildDefaultQuestionData: createGatewayUseEnglishAQuestionData,
  },
  {
    sectionTitle: "Use of English - B",
    questionType: "cloze-test",
    buildDefaultQuestionData: createGatewayUseEnglishBQuestionData,
  },
  {
    sectionTitle: "Reading",
    questionType: "long-text-mc",
    buildDefaultQuestionData: createGatewayReadingQuestionData,
  },
  {
    sectionTitle: "Writing",
    questionType: "short-message",
    buildDefaultQuestionData: createGatewayWritingQuestionData,
  },
];

const getGatewayReadingWritingSectionBlueprint = (sectionTitle = "") => (
  GATEWAY_READING_WRITING_SECTION_BLUEPRINTS.find(
    (item) => normalizeGatewaySectionKey(item.sectionTitle) === normalizeGatewaySectionKey(sectionTitle)
  ) || null
);

const migrateGatewayGrammarBWordBank = (section) => {
  const firstQuestion = section?.questions?.[0];
  if (!firstQuestion || !Array.isArray(section.questions) || Array.isArray(firstQuestion.wordBank)) return section;

  const passageText = String(firstQuestion.passageText || firstQuestion.passage || "");
  const tableMatch = passageText.match(/<table\b[^>]*>[\s\S]*?<\/table>/i);
  if (!tableMatch) {
    return {
      ...section,
      questions: [{ ...firstQuestion, wordBank: [] }, ...section.questions.slice(1)],
    };
  }

  const wordBank = [...tableMatch[0].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)]
    .map(([, cell]) => cell.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim())
    .filter(Boolean);
  if (wordBank.length === 0) return section;

  return {
    ...section,
    questions: [{
      ...firstQuestion,
      wordBank,
      passageText: passageText.replace(tableMatch[0], ""),
    }, ...section.questions.slice(1)],
  };
};

const buildGatewayQuestionDataFromBlueprint = (blueprint) => {
  if (!blueprint) return getDefaultQuestionData("fill");
  if (typeof blueprint.buildDefaultQuestionData === "function") {
    return blueprint.buildDefaultQuestionData();
  }
  return getDefaultQuestionData(blueprint.questionType);
};

const buildGatewayQuestionsFromBlueprint = (blueprint) => {
  if (typeof blueprint?.buildDefaultQuestions === "function") {
    return blueprint.buildDefaultQuestions();
  }
  return [buildGatewayQuestionDataFromBlueprint(blueprint)];
};

const createGatewayListeningNotesQuestionData = () => ({
  ...getDefaultQuestionData("notes-completion"),
  notesTitle: "Earth Festival",
  notesText: [
    "<ul>",
    "<li>The festival is ______ years old this year.</li>",
    "<li>The topic of this year's festival is ______.</li>",
    "<li>Sheila Sparks is a famous ______.</li>",
    "<li>There will be recycled games and ______ in the Games Zone.</li>",
    "<li>The festival costs £3 for ______.</li>",
    "</ul>",
  ].join(""),
  wordLimit: "ONE WORD ONLY",
  answers: {},
});

const createGatewayListeningMultipleChoiceQuestions = () => [
  {
    questionText: "You will hear two friends talking about working with other students in class.\nThe girl thinks that working with other students in class",
    options: [
      "A. is more useful for the lesson.",
      "B. takes longer than working alone.",
      "C. makes classes more fun.",
    ],
  },
  {
    questionText: "You will hear two friends talking about a school trip to a museum.\nThe friends agree that",
    options: [
      "A. the exhibitions were all interesting.",
      "B. there were nice things in the shop.",
      "C. it was too large to see in one visit.",
    ],
  },
  {
    questionText: "You will hear two friends talking about a football match.\nThe boy is feeling happy because",
    options: [
      "A. his team won.",
      "B. he scored a goal.",
      "C. his parents came to watch.",
    ],
  },
  {
    questionText: "You will hear two friends talking about a poem they've read.\nThey think the poem would be better if",
    options: [
      "A. it was shorter.",
      "B. it had a clearer meaning.",
      "C. the sections were in a different order.",
    ],
  },
  {
    questionText: "You will hear a boy asking a girl about an essay he has written.\nThe girl thinks the boy should",
    options: [
      "A. add more detail.",
      "B. change the subject.",
      "C. improve the style.",
    ],
  },
].map((question) => ({
  ...getDefaultQuestionData("abc"),
  ...question,
  correctAnswer: "",
}));

const GATEWAY_LISTENING_SECTION_BLUEPRINTS = [
  {
    sectionTitle: "Earth Festival — Notes Completion",
    questionType: "notes-completion",
    buildDefaultQuestionData: createGatewayListeningNotesQuestionData,
  },
  {
    sectionTitle: "Five Conversations — Multiple Choice",
    questionType: "abc",
    buildDefaultQuestions: createGatewayListeningMultipleChoiceQuestions,
  },
];

const getGatewayListeningSectionBlueprint = (sectionTitle = "") => (
  GATEWAY_LISTENING_SECTION_BLUEPRINTS.find(
    (item) => normalizeGatewaySectionKey(item.sectionTitle) === normalizeGatewaySectionKey(sectionTitle)
  ) || null
);

const buildGatewayListeningTemplateParts = () => ([
  {
    partNumber: 1,
    title: "Part A",
    instruction: "<p>Listen to a conversation about a festival. Complete the notes with ONE WORD in each space.</p><p>____/5 (1 mark per answer)</p>",
    audioUrl: "",
    imageUrl: "",
    sections: [{
      sectionTitle: GATEWAY_LISTENING_SECTION_BLUEPRINTS[0].sectionTitle,
      questionType: GATEWAY_LISTENING_SECTION_BLUEPRINTS[0].questionType,
      questions: buildGatewayQuestionsFromBlueprint(GATEWAY_LISTENING_SECTION_BLUEPRINTS[0]),
    }],
  },
  {
    partNumber: 2,
    title: "Part B",
    instruction: "<p>Listen to five conversations. For each question, choose the correct answer.</p><p>____/5 (1 mark per answer)</p>",
    audioUrl: "",
    imageUrl: "",
    sections: [{
      sectionTitle: GATEWAY_LISTENING_SECTION_BLUEPRINTS[1].sectionTitle,
      questionType: GATEWAY_LISTENING_SECTION_BLUEPRINTS[1].questionType,
      questions: buildGatewayQuestionsFromBlueprint(GATEWAY_LISTENING_SECTION_BLUEPRINTS[1]),
    }],
  },
]);

const normalizeGatewayTrueFalseAnswer = (answer) => {
  const normalized = String(answer || "").trim().toUpperCase();
  if (normalized === "TRUE") return "T";
  if (normalized === "FALSE") return "F";
  return normalized;
};

const hasGatewayReadingContent = (questions, answerType) => (
  Array.isArray(questions) && questions.some((question) => {
    if (String(question?.questionText || "").trim() || String(question?.correctAnswer || "").trim()) return true;
    if (answerType === "true-false") return false;
    return Array.isArray(question?.options)
      && question.options.some((option) => String(option || "").replace(/^[A-D]\.\s*/i, "").trim());
  })
);

const hasGatewayReadingPassage = (passage) => {
  const value = String(passage || "");
  return Boolean(value.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim() || /<img\b/i.test(value));
};

const migrateGatewayReadingSections = (sections) => {
  const legacyAIndex = sections.findIndex(
    (section) => normalizeGatewaySectionKey(section?.sectionTitle) === "reading - a"
  );
  const legacyBIndex = sections.findIndex(
    (section) => normalizeGatewaySectionKey(section?.sectionTitle) === "reading - b"
  );
  if (legacyAIndex < 0 && legacyBIndex < 0) return sections;

  const existingReadingIndex = sections.findIndex(
    (section) => normalizeGatewaySectionKey(section?.sectionTitle) === "reading"
  );
  const legacyA = legacyAIndex >= 0 ? sections[legacyAIndex] : null;
  const legacyB = legacyBIndex >= 0 ? sections[legacyBIndex] : null;
  const existingReading = existingReadingIndex >= 0 ? sections[existingReadingIndex] : null;
  const blueprint = getGatewayReadingWritingSectionBlueprint("Reading");
  const template = buildGatewayQuestionDataFromBlueprint(blueprint);
  const existingQuestion = existingReading?.questions?.[0] || {};
  const legacyAQuestion = legacyA?.questions?.[0] || {};
  const legacyBQuestion = legacyB?.questions?.[0] || {};
  const sourceMultipleChoiceQuestions = existingQuestion.questions?.filter(
    (question) => question?.answerType !== "true-false"
  );
  const legacyMultipleChoiceQuestions = Array.isArray(legacyAQuestion.questions)
    ? legacyAQuestion.questions
    : [];
  const sourceStatements = Array.isArray(existingQuestion.questions)
    ? existingQuestion.questions.filter((question) => question?.answerType === "true-false")
    : [];
  const legacyStatements = Array.isArray(legacyBQuestion.statements)
    ? legacyBQuestion.statements
    : [];
  const templateMultipleChoiceQuestions = template.questions.filter(
    (question) => question.answerType !== "true-false"
  );
  const templateTrueFalseQuestions = template.questions.filter(
    (question) => question.answerType === "true-false"
  );
  const multipleChoiceCandidates = sourceMultipleChoiceQuestions?.length
    ? sourceMultipleChoiceQuestions
    : legacyMultipleChoiceQuestions;
  const trueFalseCandidates = sourceStatements.length
    ? sourceStatements
    : legacyStatements.map((statement) => ({
        questionText: statement?.text || "",
        correctAnswer: normalizeGatewayTrueFalseAnswer(statement?.correctAnswer),
        answerType: "true-false",
      }));
  const multipleChoiceQuestions = hasGatewayReadingContent(multipleChoiceCandidates, "multiple-choice")
    ? multipleChoiceCandidates
    : templateMultipleChoiceQuestions;
  const trueFalseQuestions = hasGatewayReadingContent(trueFalseCandidates, "true-false")
    ? trueFalseCandidates
    : templateTrueFalseQuestions;
  const passageCandidates = [
    existingQuestion.passage,
    legacyAQuestion.passage,
    legacyBQuestion.passage,
  ];
  const mergedQuestion = {
    ...template,
    ...legacyAQuestion,
    ...existingQuestion,
    passageTitle: existingQuestion.passageTitle || legacyAQuestion.passageTitle || "",
    passage: passageCandidates.find(hasGatewayReadingPassage) || template.passage,
    readingAInstruction: existingQuestion.readingAInstruction
      || legacyAQuestion.instruction
      || template.readingAInstruction,
    readingAScoreNote: existingQuestion.readingAScoreNote
      || legacyAQuestion.scoreNote
      || template.readingAScoreNote,
    readingBInstruction: existingQuestion.readingBInstruction
      || legacyBQuestion.instruction
      || template.readingBInstruction,
    readingBScoreNote: existingQuestion.readingBScoreNote
      || legacyBQuestion.scoreNote
      || template.readingBScoreNote,
    questions: [
      ...multipleChoiceQuestions.map((question) => ({ ...question, answerType: "multiple-choice" })),
      ...trueFalseQuestions.map((question) => ({
        ...question,
        correctAnswer: normalizeGatewayTrueFalseAnswer(question?.correctAnswer),
        answerType: "true-false",
      })),
    ],
  };
  const mergedSection = {
    ...(existingReading || legacyA || {}),
    sectionTitle: "Reading",
    questionType: "long-text-mc",
    questions: [mergedQuestion],
  };
  const insertAt = Math.min(
    ...[legacyAIndex, legacyBIndex, existingReadingIndex].filter((index) => index >= 0)
  );

  return sections
    .filter((_, index) => index !== legacyAIndex && index !== legacyBIndex && index !== existingReadingIndex)
    .reduce((nextSections, section, index) => {
      if (index === insertAt) nextSections.push(mergedSection);
      nextSections.push(section);
      return nextSections;
    }, insertAt >= sections.length ? [mergedSection] : []);
};

const ensureGatewayVocabularyBQuestions = (section, sectionBlueprint) => {
  const questions = Array.isArray(section?.questions) ? section.questions : [];
  if (questions.length !== 1) return section;

  const existingQuestion = questions[0] || {};
  const hasExistingContent = Boolean(
    String(existingQuestion.questionText || "").trim()
    || String(existingQuestion.correctAnswer || "").trim()
    || (Array.isArray(existingQuestion.options)
      && existingQuestion.options.some((option) => String(option || "").replace(/^[A-C]\.\s*/i, "").trim()))
  );
  const templateQuestions = buildGatewayQuestionsFromBlueprint(sectionBlueprint);

  if (!hasExistingContent) {
    return { ...section, questions: templateQuestions };
  }

  return {
    ...section,
    questions: [
      {
        ...templateQuestions[0],
        ...existingQuestion,
        passageTitle: existingQuestion.passageTitle || templateQuestions[0].passageTitle,
        instruction: existingQuestion.instruction || templateQuestions[0].instruction,
        scoreNote: existingQuestion.scoreNote || templateQuestions[0].scoreNote,
      },
      ...templateQuestions.slice(1),
    ],
  };
};

const migrateGatewayFillSectionToCloze = (section, sectionBlueprint) => {
  const template = buildGatewayQuestionDataFromBlueprint(sectionBlueprint);
  const oldQuestions = Array.isArray(section?.questions) ? section.questions : [];
  const legacyQuestions = oldQuestions
    .map((question) => ({
      questionText: String(question?.questionText || "").trim(),
      correctAnswer: String(question?.correctAnswer || "").trim(),
      source: question || {},
    }))
    .filter((question) => question.questionText || question.correctAnswer);

  if (legacyQuestions.length === 0) {
    return {
      ...section,
      questionType: "cloze-test",
      questions: [template],
    };
  }

  const answers = {};
  const passageText = legacyQuestions.map((question, index) => {
    const localNumber = index + 1;
    if (question.correctAnswer) answers[localNumber] = question.correctAnswer;
    if (!question.questionText) return `<p>(${localNumber})</p>`;

    const gapPattern = /\(\s*\d+\s*\)|\[\s*\d+\s*\]|_{3,}|…{3,}/;
    const text = gapPattern.test(question.questionText)
      ? question.questionText.replace(gapPattern, `(${localNumber})`)
      : `${question.questionText} (${localNumber})`;
    const safeText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<p>${safeText}</p>`;
  }).join("");

  const firstLegacySource = legacyQuestions[0].source;
  return {
    ...section,
    questionType: "cloze-test",
    questions: [{
      ...template,
      passageTitle: firstLegacySource.passageTitle || template.passageTitle,
      instruction: firstLegacySource.instruction || template.instruction,
      scoreNote: firstLegacySource.scoreNote || template.scoreNote,
      passageText,
      answers: { ...template.answers, ...answers },
    }],
  };
};

const migrateGatewaySentenceTransformationSection = (section, sectionBlueprint) => {
  const template = buildGatewayQuestionDataFromBlueprint(sectionBlueprint);
  const oldQuestions = Array.isArray(section?.questions) ? section.questions : [];
  const legacyItems = oldQuestions
    .map((question) => {
      const originalSentence = String(question?.originalSentence || "").trim();
      const keyword = String(question?.keyword || question?.promptWord || "").trim();
      const targetSentence = String(question?.targetSentence || "").trim();
      const correctAnswer = String(question?.correctAnswer || "").trim();
      const prompt = [
        originalSentence && `Original: ${originalSentence}`,
        keyword && `Keyword: ${keyword}`,
        targetSentence && `Target: ${targetSentence}`,
      ].filter(Boolean).join(" / ");
      return {
        questionText: prompt,
        correctAnswer,
      };
    })
    .filter((item) => item.questionText || item.correctAnswer);

  if (legacyItems.length === 0) {
    return {
      ...section,
      questionType: "reading-open-questions",
      questions: [template],
    };
  }

  const items = template.items.map((item, index) => (
    legacyItems[index]
      ? { ...item, ...legacyItems[index] }
      : item
  ));
  if (legacyItems.length > items.length) {
    items.push(...legacyItems.slice(items.length));
  }

  return {
    ...section,
    questionType: "reading-open-questions",
    questions: [{ ...template, items }],
  };
};

const buildGatewayReadingWritingTemplateParts = () => ([
  {
    partNumber: 1,
    title: "Gateway Reading-Writing",
    instruction: "",
    audioUrl: "",
    imageUrl: "",
    sections: GATEWAY_READING_WRITING_SECTION_BLUEPRINTS.map((item) => ({
      sectionTitle: item.sectionTitle,
      questionType: item.questionType,
      questions: buildGatewayQuestionsFromBlueprint(item),
    })),
  },
]);

const ensureGatewayReadingWritingSections = (partsData = []) => {
  if (!Array.isArray(partsData)) return partsData;
  return partsData.map((part) => {
    const sourceSections = Array.isArray(part?.sections) ? part.sections : [];
    const sections = migrateGatewayReadingSections(sourceSections);
    const nextSections = sections.map((sourceSection) => {
      let section = sourceSection;
      const sectionBlueprint = getGatewayReadingWritingSectionBlueprint(section?.sectionTitle);
      if (!sectionBlueprint) return section;

      const expectedType = String(sectionBlueprint.questionType || "").trim().toLowerCase();
      const currentType = String(section?.questionType || "").trim().toLowerCase();

      if (currentType !== expectedType) {
        if (
          ["grammar - c", "vocabulary - a", "vocabulary - c"].includes(normalizeGatewaySectionKey(section?.sectionTitle))
          && currentType === "fill"
        ) {
          return migrateGatewayFillSectionToCloze(section, sectionBlueprint);
        }
        if (
          normalizeGatewaySectionKey(section?.sectionTitle) === "use of english - a"
          && currentType === "sentence-transformation"
        ) {
          return migrateGatewaySentenceTransformationSection(section, sectionBlueprint);
        }
        return {
          ...section,
          questionType: sectionBlueprint.questionType,
          questions: buildGatewayQuestionsFromBlueprint(sectionBlueprint),
        };
      }

      if (normalizeGatewaySectionKey(section?.sectionTitle) === "vocabulary - b") {
        section = ensureGatewayVocabularyBQuestions(section, sectionBlueprint);
      }

      const firstQuestion = section?.questions?.[0] || {};
      if (normalizeGatewaySectionKey(section?.sectionTitle) === "writing") {
        const template = buildGatewayQuestionDataFromBlueprint(sectionBlueprint);
        const wordLimit = firstQuestion.wordLimit || {};
        const usesLegacyDefaultWordLimit = Number(wordLimit.min) === 25 && Number(wordLimit.max) === 35;
        const hasPrompt = hasGatewayReadingPassage(firstQuestion.situation);
        return {
          ...section,
          questions: [{
            ...template,
            ...firstQuestion,
            gatewayWritingMode: true,
            messageType: !firstQuestion.messageType || firstQuestion.messageType === "email"
              ? template.messageType
              : firstQuestion.messageType,
            wordLimit: usesLegacyDefaultWordLimit || !wordLimit.min || !wordLimit.max
              ? template.wordLimit
              : wordLimit,
            situation: hasPrompt ? firstQuestion.situation : template.situation,
          }],
        };
      }
      if (normalizeGatewaySectionKey(section?.sectionTitle) === "grammar - b") {
        section = migrateGatewayGrammarBWordBank(section);
      }
      const migratedQuestion = section?.questions?.[0] || firstQuestion;
      const hasRewriteItems = Array.isArray(firstQuestion?.items) && firstQuestion.items.length > 0;
      const hasNonEmptyRewriteItems = Array.isArray(firstQuestion?.items)
        && firstQuestion.items.some((item) => String(item?.questionText || '').trim() || String(item?.correctAnswer || '').trim());

      if (
        expectedType === "reading-open-questions"
        && firstQuestion?.layoutMode === "rewrite-sentences"
        && hasRewriteItems
      ) {
        if (hasNonEmptyRewriteItems) {
          return section;
        }
        const rewriteTemplate = buildGatewayQuestionDataFromBlueprint(sectionBlueprint);
        return {
          ...section,
          questions: [{
            ...rewriteTemplate,
            ...firstQuestion,
            items: rewriteTemplate.items,
          }],
        };
      }

      if (expectedType === "reading-open-questions" && hasRewriteItems) {
        return section;
      }

      if (expectedType === "cloze-test" && typeof sectionBlueprint.buildDefaultQuestionData === "function") {
        const passageText = String(migratedQuestion?.passageText || migratedQuestion?.passage || '').trim();
        const answers = migratedQuestion?.answers && typeof migratedQuestion.answers === 'object' ? migratedQuestion.answers : {};
        const hasAnyAnswer = Object.values(answers).some((value) => String(value || '').trim());

        if (!passageText && !hasAnyAnswer) {
          const templateData = buildGatewayQuestionDataFromBlueprint(sectionBlueprint);
          return {
            ...section,
            questions: [{
              ...templateData,
              ...migratedQuestion,
              passageText: templateData.passageText,
              answers: Object.keys(answers).length > 0 ? answers : templateData.answers,
            }],
          };
        }
      }

      return section;
    });
    const normalizedSections = nextSections.map((section) => {
      if (String(section?.questionType || "").trim().toLowerCase() !== "cloze-test") return section;
      const questions = Array.isArray(section.questions) ? section.questions : [];
      const firstQuestion = questions[0];
      const normalizedQuestion = renumberGatewayClozeQuestion(section.sectionTitle, firstQuestion);
      if (normalizedQuestion === firstQuestion) return section;
      return { ...section, questions: [normalizedQuestion, ...questions.slice(1)] };
    });
    return { ...part, sections: normalizedSections };
  });
};

const isLegacyGatewayReadingDraft = (partsData = []) => {
  if (!Array.isArray(partsData) || partsData.length !== 1) return false;
  const firstPart = partsData[0];
  const sections = Array.isArray(firstPart?.sections) ? firstPart.sections : [];
  if (sections.length !== 1) return false;
  const section = sections[0] || {};
  const sectionTitle = String(section.sectionTitle || '').trim();
  const questionType = String(section.questionType || '').trim().toLowerCase();
  const partTitle = String(firstPart?.title || '').trim().toLowerCase();

  return partTitle === 'part 1' && !sectionTitle && (questionType === '' || questionType === 'fill');
};

const isLegacyGatewayListeningDraft = (partsData = []) => {
  if (!Array.isArray(partsData) || partsData.length !== 1) return false;
  const [part] = partsData;
  const sections = Array.isArray(part?.sections) ? part.sections : [];
  if (String(part?.title || "").trim().toLowerCase() !== "part 1" || sections.length !== 1) {
    return false;
  }

  const section = sections[0] || {};
  const question = section?.questions?.[0] || {};
  const notesText = String(question.notesText || "").replace(/<[^>]*>/g, "").trim();
  const hasAnswers = Object.values(question.answers || {}).some((answer) => String(answer || "").trim());

  return (
    !String(part.instruction || "").replace(/<[^>]*>/g, "").trim()
    && !String(part.audioUrl || "").trim()
    && !String(section.sectionTitle || "").trim()
    && String(section.questionType || "").trim().toLowerCase() === "notes-completion"
    && (section.questions || []).length <= 1
    && !String(question.notesTitle || "").trim()
    && !notesText
    && !hasAnswers
  );
};


/**
 * Shared test builder for Cambridge, Gateway, and other compatible exam formats.
 */
const ExamCoreTestBuilder = ({
  testType = 'ket-listening',
  editId = null,
  initialData = null,
  resetDraftOnLoad = false,
  apiBasePath = null,
  successPathResolver = null,
  durationMinutes = null,
  displayName = null,
}) => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const currentTeacherName = resolveAuthUserDisplayName(user);
  const isCreateMode = !editId && !initialData;

  const baseTestConfig = getTestConfig(testType);
  const resolvedDuration = Number(durationMinutes);
  const testConfig = baseTestConfig
    ? {
        ...baseTestConfig,
        name: displayName || baseTestConfig.name,
        duration:
          Number.isFinite(resolvedDuration) && resolvedDuration > 0
            ? resolvedDuration
            : baseTestConfig.duration,
      }
    : null;
  const isGatewayTest = String(testType || '').startsWith('gateway-');
  const isGatewayReadingWriting = String(testType || '').toLowerCase() === 'gateway-reading-writing';
  const isGatewayListening = String(testType || '').toLowerCase() === 'gateway-listening';
  const isListeningTest = testType.includes('listening');
  const youngLearnerSupportedTypeMap = {
    movers: ['matching-pictures', 'image-cloze', 'word-drag-cloze', 'story-completion', 'look-read-write', 'fill', 'abc', 'cloze-mc', 'word-form', 'short-message'],
  };
  const supportedTypeIds = youngLearnerSupportedTypeMap[testType] || null;
  const availableTypes = useMemo(() => {
    const baseTypes = getQuestionTypesForTest(testType);
    if (!supportedTypeIds) return baseTypes;
    return baseTypes.filter((type) => supportedTypeIds.includes(type.id));
  }, [supportedTypeIds, testType]);
  const defaultQuestionType = availableTypes[0]?.id || 'fill';
  const builderDisplayName = useMemo(() => {
    if (testType === 'movers') return 'Orange Movers Reading & Writing';
    return testConfig?.name || 'Orange Test';
  }, [testConfig?.name, testType]);

  // Hooks (must run unconditionally)
  const { quillRef: partInstructionRef, modules: partInstructionModules } = useQuillImageUpload();
  const normalizePeopleMatchingIds = useCallback((partsData) => {
    if (!Array.isArray(partsData)) return partsData;

    const isNumericId = (id) => typeof id === 'string' && /^\d+$/.test(id.trim());

    const detectSectionType = (section) => {
      const q0 = section?.questions?.[0];
      return (
        section?.questionType ||
        q0?.questionType ||
        q0?.type ||
        (Array.isArray(q0?.people) ? 'people-matching' : '')
      );
    };

    const mapNumericIdsToLetters = (texts) => {
      const ids = (texts || []).map(t => String(t?.id || '').trim()).filter(Boolean);
      if (ids.length === 0) return null;
      if (!ids.every(isNumericId)) return null;
      if (texts.length > 26) return null;

      const uniqueSorted = Array.from(new Set(ids)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      if (uniqueSorted.length > 26) return null;

      const mapping = {};
      for (let i = 0; i < uniqueSorted.length; i++) {
        mapping[uniqueSorted[i]] = String.fromCharCode(65 + i);
      }
      return mapping;
    };

    const normalizeQuestion = (question) => {
      const texts = Array.isArray(question?.texts) ? question.texts : [];
      const mapping = mapNumericIdsToLetters(texts);
      if (!mapping) return question;

      const nextTexts = texts.map(t => {
        const oldId = String(t?.id || '').trim();
        const mapped = mapping[oldId];
        return mapped ? { ...t, id: mapped } : t;
      });

      const answers = question?.answers && typeof question.answers === 'object' ? question.answers : {};
      const nextAnswers = Object.fromEntries(
        Object.entries(answers).map(([personId, chosenId]) => {
          const chosen = String(chosenId || '').trim();
          return [personId, mapping[chosen] || chosenId];
        })
      );

      return { ...question, texts: nextTexts, answers: nextAnswers };
    };

    let changed = false;
    const nextParts = partsData.map(part => {
      const nextSections = (part?.sections || []).map(section => {
        const sectionType = detectSectionType(section);
        if (sectionType !== 'people-matching') return section;

        const nextQuestions = (section?.questions || []).map(q => normalizeQuestion(q));
        const sectionChanged = nextQuestions.some((q, idx) => q !== section.questions[idx]);
        if (!sectionChanged) return section;
        changed = true;
        return { ...section, questions: nextQuestions };
      });

      const partChanged = nextSections.some((s, idx) => s !== part.sections?.[idx]);
      if (!partChanged) return part;
      changed = true;
      return { ...part, sections: nextSections };
    });

    return changed ? nextParts : partsData;
  }, []);

  const normalizeShortMessageParts = useCallback((partsData) => {
    if (!Array.isArray(partsData)) return partsData;

    let changed = false;
    const nextParts = partsData.map((part) => {
      const originalSections = Array.isArray(part?.sections) ? part.sections : [];
      const nextSections = originalSections.map((section) => {
        const sectionType = section?.questionType || section?.questions?.[0]?.questionType;
        if (sectionType !== 'short-message') return section;

        const originalQuestions = Array.isArray(section?.questions) ? section.questions : [];
        let sectionChanged = false;
        const nextQuestions = originalQuestions.map((question) => {
          const rawSituation = typeof question?.situation === 'string' ? question.situation : '';
          const normalizedSituation = normalizeQuillPromptHtml(rawSituation);

          if (rawSituation === normalizedSituation) {
            return question;
          }

          sectionChanged = true;
          changed = true;
          return {
            ...question,
            situation: normalizedSituation,
          };
        });

        if (!sectionChanged) return section;
        return {
          ...section,
          questions: nextQuestions,
        };
      });

      const partChanged = nextSections.some((section, index) => section !== originalSections[index]);
      if (!partChanged) return part;

      return {
        ...part,
        sections: nextSections,
      };
    });

    return changed ? nextParts : partsData;
  }, []);

  // Evaluate permission early but do not return yet (hooks must run first)
  const category = testType.includes('listening') ? 'listening' : 'reading';
  const allowedToManage = canManageCategory(user, category);

  const didResetDraftRef = useRef(false);

  useEffect(() => {
    if (!resetDraftOnLoad || didResetDraftRef.current) return;
    try {
      localStorage.removeItem(`cambridgeTestDraft-${testType}`);
    } catch {
      // ignore
    }
    didResetDraftRef.current = true;
  }, [resetDraftOnLoad, testType]);

  // Load saved data from localStorage
  const loadSavedData = () => {
    try {
      const savedData = localStorage.getItem(`cambridgeTestDraft-${testType}`);
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
    return null;
  };

  const shouldUseDraft = !resetDraftOnLoad && !editId && !initialData;
  const savedData = shouldUseDraft ? loadSavedData() : null;

  // Form fields
  const [title, setTitle] = useState(savedData?.title || '');
  const [classCode, setClassCode] = useState(savedData?.classCode || '');
  const [teacherName, setTeacherName] = useState(
    isCreateMode ? currentTeacherName : savedData?.teacherName || ''
  );
  const [studentResultVisibility, setStudentResultVisibility] = useState(() => {
    if (!savedData) return 'confirmation';
    if (savedData.showResultModal === false) return 'confirmation';
    return savedData.studentResultVisibility || 'score';
  });
  const [mainAudioUrl, setMainAudioUrl] = useState(normalizeAudioReference(savedData?.mainAudioUrl || ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Auto-save state
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  // Show login banner when refresh fails
  const [requiresLogin, setRequiresLogin] = useState(false);
  
  // Initial parts from savedData or default
  const getInitialParts = () => {
    if (savedData?.parts && Array.isArray(savedData.parts)) {
      if (isGatewayReadingWriting && isLegacyGatewayReadingDraft(savedData.parts)) {
        return buildGatewayReadingWritingTemplateParts();
      }
      if (
        isGatewayListening
        && !String(savedData.mainAudioUrl || "").trim()
        && isLegacyGatewayListeningDraft(savedData.parts)
      ) {
        return buildGatewayListeningTemplateParts();
      }
      const normalizedParts = normalizePeopleMatchingIds(normalizeListeningPartsAudio(normalizeShortMessageParts(savedData.parts)));
      if (isGatewayReadingWriting) {
        return ensureGatewayReadingWritingSections(normalizedParts);
      }
      return normalizedParts;
    }
    if (isGatewayReadingWriting) {
      return buildGatewayReadingWritingTemplateParts();
    }
    if (isGatewayListening) {
      return buildGatewayListeningTemplateParts();
    }
    return [
      {
        partNumber: 1,
        title: 'Part 1',
        instruction: '',
        audioUrl: '',
        imageUrl: '',
        sections: [
          {
            sectionTitle: '',
            questionType: defaultQuestionType,
            questions: [getDefaultQuestionData(defaultQuestionType)],
          }
        ]
      }
    ];
  };

  // Support edit mode via props
  useEffect(() => {
    if (isCreateMode) {
      setTeacherName(currentTeacherName);
    }
  }, [currentTeacherName, isCreateMode]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setClassCode(initialData.classCode || '');
      setTeacherName(initialData.teacherName || '');
      setStudentResultVisibility(
        initialData.showResultModal === false
          ? 'confirmation'
          : initialData.studentResultVisibility || 'score'
      );
      setMainAudioUrl(normalizeAudioReference(initialData.mainAudioUrl || ''));

      // parts may be stored as string in older records -> parse safely
      let partsData = initialData.parts;
      if (typeof partsData === 'string') {
        try {
          partsData = JSON.parse(partsData);
        } catch (err) {
          console.warn('Could not parse parts JSON - falling back to default:', err);
          partsData = null;
        }
      }

      if (Array.isArray(partsData)) {
        const normalizedParts = normalizePeopleMatchingIds(normalizeListeningPartsAudio(normalizeShortMessageParts(partsData)));
        setParts(isGatewayReadingWriting ? ensureGatewayReadingWritingSections(normalizedParts) : normalizedParts);
      }
    }
  }, [defaultQuestionType, initialData, isGatewayReadingWriting, normalizePeopleMatchingIds, normalizeShortMessageParts]);

  // State - Load from savedData if available
  const [parts, setParts] = useState(getInitialParts());
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  
  // Collapse/Expand state
  const [collapsedQuestions, setCollapsedQuestions] = useState({});
  
  // Copy state
  const [copiedQuestion, setCopiedQuestion] = useState(null);
  
  // Audio upload state (listening only)
  const [uploadingAudioPartIndex, setUploadingAudioPartIndex] = useState(null);
  const [audioUploadError, setAudioUploadError] = useState('');
  const [uploadingMainAudio, setUploadingMainAudio] = useState(false);
  const [mainAudioUploadError, setMainAudioUploadError] = useState('');

  // Image upload state (reading/non-listening)
  const [uploadingImagePartIndex, setUploadingImagePartIndex] = useState(null);
  const [imageUploadError, setImageUploadError] = useState('');
  const partInstructionDraftRef = useRef('');

  const currentPart = parts[selectedPartIndex];
  const currentSection = currentPart?.sections?.[selectedSectionIndex];
  const currentGatewaySectionBlueprint = useMemo(() => {
    if (!isGatewayReadingWriting || !currentSection) return null;
    return getGatewayReadingWritingSectionBlueprint(currentSection.sectionTitle);
  }, [isGatewayReadingWriting, currentSection]);
  const currentGatewayListeningSectionBlueprint = useMemo(() => {
    if (!isGatewayListening || !currentSection) return null;
    return getGatewayListeningSectionBlueprint(currentSection.sectionTitle);
  }, [isGatewayListening, currentSection]);
  const activeGatewaySectionBlueprint =
    currentGatewaySectionBlueprint || currentGatewayListeningSectionBlueprint;
  const isGatewaySectionTypeLocked = Boolean(activeGatewaySectionBlueprint);
  const questionTypeOptions = useMemo(() => {
    const currentTypeId = currentSection?.questionType;
    if (!currentTypeId || availableTypes.some((type) => type.id === currentTypeId)) {
      return availableTypes;
    }

    const legacyType = QUESTION_TYPES[currentTypeId];
    return legacyType ? [...availableTypes, legacyType] : availableTypes;
  }, [availableTypes, currentSection?.questionType]);
  const isMoversReading = !isListeningTest && String(testType || '').toLowerCase() === 'movers';
  const moversReadingPartThemes = useMemo(() => ([
    { color: '#3b82f6', bg: '#eff6ff' },
    { color: '#10b981', bg: '#f0fdf4' },
    { color: '#8b5cf6', bg: '#f5f3ff' },
    { color: '#f59e0b', bg: '#fffbeb' },
    { color: '#ef4444', bg: '#fef2f2' },
    { color: '#06b6d4', bg: '#ecfeff' },
  ]), []);

  const getMoversReadingPartTheme = useCallback((part, idx) => {
    const fallback = moversReadingPartThemes[idx % moversReadingPartThemes.length] || moversReadingPartThemes[0];
    const sectionType = part?.sections?.[0]?.questionType || '';

    const typeThemeMap = {
      'matching-pictures': { color: '#3b82f6', bg: '#eff6ff' },
      'image-cloze': { color: '#10b981', bg: '#f0fdf4' },
      'word-drag-cloze': { color: '#8b5cf6', bg: '#f5f3ff' },
      'story-completion': { color: '#f59e0b', bg: '#fffbeb' },
      'look-read-write': { color: '#ef4444', bg: '#fef2f2' },
      'fill': { color: '#06b6d4', bg: '#ecfeff' },
      abc: { color: '#f97316', bg: '#fff7ed' },
      'cloze-mc': { color: '#dc2626', bg: '#fef2f2' },
      'word-form': { color: '#0ea5e9', bg: '#f0f9ff' },
      'short-message': { color: '#6366f1', bg: '#eef2ff' },
    };

    return typeThemeMap[sectionType] || fallback;
  }, [moversReadingPartThemes]);

  const getMoversReadingPartSummary = useCallback((part) => {
    const sections = Array.isArray(part?.sections) ? part.sections : [];
    if (sections.length === 0) return 'Chưa có section';

    const questionCount = sections.reduce((sum, section) => sum + getQuestionCountForSection(section), 0);
    if (questionCount > 0) {
      return `${questionCount} câu hỏi`;
    }
    return `${sections.length} section(s)`;
  }, []);

  const normalizePartInstructionHtml = useCallback((value) => {
    const html = String(value || '').trim();
    if (!html) return '';
    if (/^<p><br\s*\/?><\/p>$/i.test(html)) return '';
    return html;
  }, []);

  useEffect(() => {
    partInstructionDraftRef.current = normalizePartInstructionHtml(parts[selectedPartIndex]?.instruction || '');
  }, [normalizePartInstructionHtml, parts, selectedPartIndex]);

  const getLivePartInstructionValue = useCallback(() => {
    const editor = partInstructionRef.current?.getEditor?.();
    const liveHtml = normalizePartInstructionHtml(editor?.root?.innerHTML || '');

    if (editor?.root) {
      partInstructionDraftRef.current = liveHtml;
      return liveHtml;
    }

    return partInstructionDraftRef.current || normalizePartInstructionHtml(currentPart?.instruction || '');
  }, [currentPart?.instruction, normalizePartInstructionHtml, partInstructionRef]);

  const syncCurrentPartInstructionInParts = useCallback((partsData) => {
    if (!Array.isArray(partsData) || selectedPartIndex < 0 || selectedPartIndex >= partsData.length) {
      return partsData;
    }

    const nextInstruction = getLivePartInstructionValue();
    const currentInstruction = normalizePartInstructionHtml(partsData[selectedPartIndex]?.instruction || '');

    if (currentInstruction === nextInstruction) {
      return partsData;
    }

    return partsData.map((part, idx) => {
      if (idx !== selectedPartIndex) return part;
      return { ...part, instruction: nextInstruction };
    });
  }, [getLivePartInstructionValue, normalizePartInstructionHtml, selectedPartIndex]);

  const updateParts = useCallback((updater, options = {}) => {
    const { syncCurrentPartInstruction = true } = options;

    setParts((prevParts) => {
      const baseParts = syncCurrentPartInstruction
        ? syncCurrentPartInstructionInParts(prevParts)
        : prevParts;
      return updater(baseParts);
    });
  }, [syncCurrentPartInstructionInParts]);

  const commitCurrentPartInstruction = useCallback(() => {
    setParts((prevParts) => syncCurrentPartInstructionInParts(prevParts));
  }, [syncCurrentPartInstructionInParts]);

  const getPartsSnapshotWithCurrentInstruction = useCallback(() => {
    return syncCurrentPartInstructionInParts(parts);
  }, [parts, syncCurrentPartInstructionInParts]);

  const handleSelectPart = useCallback((partIndex) => {
    commitCurrentPartInstruction();
    setSelectedPartIndex(partIndex);
    setSelectedSectionIndex(0);
  }, [commitCurrentPartInstruction]);

  const handleSelectSection = useCallback((sectionIndex) => {
    commitCurrentPartInstruction();
    setSelectedSectionIndex(sectionIndex);
  }, [commitCurrentPartInstruction]);

  const uploadAudioForPart = async (partIndex, file) => {
    if (!file) return;

    setAudioUploadError('');
    setUploadingAudioPartIndex(partIndex);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const res = await fetch(apiPath('upload/audio'), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errMsg = 'Lỗi khi upload audio';
        try {
          const err = await res.json();
          errMsg = err?.message || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const url = data?.url;
      if (!url) throw new Error('Upload thành công nhưng không nhận được URL audio');
      const normalizedUrl = normalizeAudioReference(url);

      updateParts(prev => {
        const next = [...prev];
        next[partIndex] = { ...next[partIndex], audioUrl: normalizedUrl };

        // Teacher workflow: Cambridge/KET Listening usually uses ONE mp3 for the whole test.
        // If user uploads audio to Part 1, reuse it for other parts that are still empty.
        if (isListeningTest && partIndex === 0) {
          for (let i = 0; i < next.length; i++) {
            if (!next[i]?.audioUrl) {
              next[i] = { ...next[i], audioUrl: normalizedUrl };
            }
          }
        }
        return next;
      });
    } catch (err) {
      setAudioUploadError(err?.message || 'Lỗi khi upload audio');
    } finally {
      setUploadingAudioPartIndex(null);
    }
  };

  const uploadImageForPart = async (partIndex, file) => {
    if (!file) return;

    setImageUploadError('');
    setUploadingImagePartIndex(partIndex);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(apiPath('upload/cambridge-image'), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errMsg = 'Lỗi khi upload hình ảnh';
        try {
          const err = await res.json();
          errMsg = err?.message || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const url = data?.url;
      if (!url) throw new Error('Upload thành công nhưng không nhận được URL hình ảnh');

      updateParts(prev => {
        const next = [...prev];
        next[partIndex] = { ...next[partIndex], imageUrl: url };
        return next;
      });
    } catch (err) {
      setImageUploadError(err?.message || 'Lỗi khi upload hình ảnh');
    } finally {
      setUploadingImagePartIndex(null);
    }
  };

  const uploadMainAudio = async (file) => {
    if (!file) return;

    setMainAudioUploadError('');
    setUploadingMainAudio(true);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const res = await fetch(apiPath('upload/audio'), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errMsg = 'Lỗi khi upload audio';
        try {
          const err = await res.json();
          errMsg = err?.message || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const url = data?.url;
      if (!url) throw new Error('Upload thành công nhưng không nhận được URL audio');

      setMainAudioUrl(normalizeAudioReference(url));
    } catch (err) {
      setMainAudioUploadError(err?.message || 'Lỗi khi upload audio');
    } finally {
      setUploadingMainAudio(false);
    }
  };

  // Handlers
  const handleQuestionTypeChange = (newType) => {
    if (isGatewaySectionTypeLocked) {
      setMessage({ type: 'error', text: 'Mục Gateway này đã khóa loại câu hỏi theo mẫu. Dùng "Khôi phục mẫu mục" nếu cần.' });
      return;
    }
    updateParts(prevParts => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;
      const nextSections = (part.sections || []).map((section, sIdx) => {
        if (sIdx !== selectedSectionIndex) return section;
        return {
          ...section,
          questionType: newType,
          questions: [getDefaultQuestionData(newType)],
        };
      });
      return { ...part, sections: nextSections };
    }));
  };

  const handleRestoreGatewaySectionTemplate = useCallback(() => {
    if (!activeGatewaySectionBlueprint) return;
    updateParts((prevParts) => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;
      const nextSections = (part.sections || []).map((section, sIdx) => {
        if (sIdx !== selectedSectionIndex) return section;
        return {
          ...section,
          sectionTitle: activeGatewaySectionBlueprint.sectionTitle,
          questionType: activeGatewaySectionBlueprint.questionType,
          questions: buildGatewayQuestionsFromBlueprint(activeGatewaySectionBlueprint),
        };
      });
      return { ...part, sections: nextSections };
    }));
    setMessage({ type: 'success', text: `Đã khôi phục mẫu ${activeGatewaySectionBlueprint.sectionTitle}.` });
  }, [activeGatewaySectionBlueprint, selectedPartIndex, selectedSectionIndex, updateParts]);

  /* eslint-disable-next-line no-unused-vars */
  const handleQuestionChange = (field, value) => {
    updateParts(prevParts => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;
      const nextSections = (part.sections || []).map((section, sIdx) => {
        if (sIdx !== selectedSectionIndex) return section;
        const prevQuestions = Array.isArray(section.questions) ? section.questions : [];
        if (prevQuestions.length === 0) return { ...section, questions: [{ [field]: value }] };
        const nextQuestions = prevQuestions.map((q, qIdx) => {
          if (qIdx !== 0) return q;
          return { ...q, [field]: value };
        });
        return { ...section, questions: nextQuestions };
      });
      return { ...part, sections: nextSections };
    }));
  };

  const handleAddPart = () => {
    let nextPartIndex = 0;
    updateParts((prevParts) => {
      nextPartIndex = prevParts.length;
      const inheritedAudioUrl = isListeningTest
        ? (mainAudioUrl ? '' : normalizeAudioReference(prevParts?.[0]?.audioUrl || ''))
        : '';

      return [
        ...prevParts,
        {
          partNumber: prevParts.length + 1,
          title: `Part ${prevParts.length + 1}`,
          instruction: '',
          audioUrl: inheritedAudioUrl,
          imageUrl: '',
          sections: [
            {
              sectionTitle: '',
              questionType: defaultQuestionType,
              questions: [getDefaultQuestionData(defaultQuestionType)],
            }
          ]
        }
      ];
    });
    partInstructionDraftRef.current = '';
    setSelectedPartIndex(nextPartIndex);
    setSelectedSectionIndex(0);
  };

  const handleAddSection = () => {
    const nextSection = {
      sectionTitle: isGatewayReadingWriting ? `New mục ${(currentPart?.sections?.length || 0) + 1}` : '',
      questionType: defaultQuestionType,
      questions: [getDefaultQuestionData(defaultQuestionType)],
    };

    updateParts(prevParts => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;
      const nextSections = [...(part.sections || []), nextSection];
      return { ...part, sections: nextSections };
    }));

    setSelectedSectionIndex((currentPart?.sections?.length || 0));
  };

  const handleDeleteSection = useCallback((sectionIndex) => {
    let nextSelectedIndex = selectedSectionIndex;

    updateParts((prevParts) => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;

      const originalSections = Array.isArray(part.sections) ? part.sections : [];
      if (originalSections.length <= 1) {
        nextSelectedIndex = 0;
        return part;
      }

      const nextSections = originalSections.filter((_, idx) => idx !== sectionIndex);

      if (selectedSectionIndex > sectionIndex) {
        nextSelectedIndex = selectedSectionIndex - 1;
      } else if (selectedSectionIndex === sectionIndex) {
        nextSelectedIndex = Math.min(sectionIndex, nextSections.length - 1);
      }

      return {
        ...part,
        sections: nextSections,
      };
    }));

    setSelectedSectionIndex(Math.max(nextSelectedIndex, 0));
  }, [selectedPartIndex, selectedSectionIndex, updateParts]);

  const handleAddQuestion = () => {
    const currentType = currentSection?.questionType;
    updateParts(prevParts => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;
      const nextSections = (part.sections || []).map((section, sIdx) => {
        if (sIdx !== selectedSectionIndex) return section;
        const prevQuestions = Array.isArray(section.questions) ? section.questions : [];
        return {
          ...section,
          questions: [...prevQuestions, getDefaultQuestionData(currentType)],
        };
      });
      return { ...part, sections: nextSections };
    }));
  };

  const handleDeleteQuestion = (qIndex) => {
    updateParts(prevParts => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;
      const nextSections = (part.sections || []).map((section, sIdx) => {
        if (sIdx !== selectedSectionIndex) return section;
        const prevQuestions = Array.isArray(section.questions) ? section.questions : [];
        return {
          ...section,
          questions: prevQuestions.filter((_, idx) => idx !== qIndex),
        };
      });
      return { ...part, sections: nextSections };
    }));
  };
  // Toggle collapse/expand for a question
  const toggleCollapseQuestion = (qIdx) => {
    const key = `${selectedPartIndex}-${selectedSectionIndex}-${qIdx}`;
    setCollapsedQuestions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Copy a question
  const handleCopyQuestion = (qIdx) => {
    const questionToCopy = {
      ...parts[selectedPartIndex].sections[selectedSectionIndex].questions[qIdx]
    };
    setCopiedQuestion(questionToCopy);
  };

  // Paste copied question
  const handlePasteQuestion = () => {
    if (!copiedQuestion) return;
    updateParts(prevParts => prevParts.map((part, pIdx) => {
      if (pIdx !== selectedPartIndex) return part;
      const nextSections = (part.sections || []).map((section, sIdx) => {
        if (sIdx !== selectedSectionIndex) return section;
        return {
          ...section,
          questions: [
            ...(section.questions || []),
            { ...JSON.parse(JSON.stringify(copiedQuestion)) },
          ],
        };
      });
      return { ...part, sections: nextSections };
    }));
  };

  const questionStarts = useMemo(() => computeQuestionStarts(parts, testType), [parts, testType]);

  // Autosave function
  const sanitizeDraftData = useCallback((value) => {
    const dataUrlRegex = /data:image\/[a-zA-Z]+;base64,[^"'\s)]+/g;
    const walk = (input) => {
      if (typeof input === 'string') {
        const withoutDataUrls = input.replace(dataUrlRegex, '[image]');
        return withoutDataUrls.length > 200000 ? withoutDataUrls.slice(0, 200000) : withoutDataUrls;
      }
      if (Array.isArray(input)) {
        return input.map(walk);
      }
      if (input && typeof input === 'object') {
        return Object.entries(input).reduce((acc, [key, val]) => {
          if (typeof val === 'string' && /data:image\//i.test(val)) {
            acc[key] = '[image]';
            return acc;
          }
          acc[key] = walk(val);
          return acc;
        }, {});
      }
      return input;
    };
    return walk(value);
  }, []);

  const saveToLocalStorage = useCallback(() => {
    const storageKey = `cambridgeTestDraft-${testType}`;
    try {
      setIsSaving(true);
      const normalizedParts = normalizeListeningPartsAudio(normalizeShortMessageParts(getPartsSnapshotWithCurrentInstruction()));
      const dataToSave = {
        title,
        classCode,
        teacherName,
        studentResultVisibility,
        showResultModal: studentResultVisibility !== 'confirmation',
        mainAudioUrl: normalizeAudioReference(mainAudioUrl),
        parts: normalizedParts,
        testType,
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        setLastSaved(new Date());
      } catch (error) {
        const isQuota =
          error?.name === 'QuotaExceededError' ||
          /quota/i.test(error?.message || '');
        if (isQuota) {
          try {
            const trimmed = sanitizeDraftData(dataToSave);
            localStorage.setItem(storageKey, JSON.stringify(trimmed));
            setLastSaved(new Date());
            console.warn('Draft trimmed to fit localStorage quota.');
          } catch (secondaryError) {
            localStorage.removeItem(storageKey);
            console.warn('Draft disabled due to storage quota limits.');
          }
        } else {
          console.error('Error saving draft:', error);
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [title, classCode, teacherName, studentResultVisibility, mainAudioUrl, testType, sanitizeDraftData, getPartsSnapshotWithCurrentInstruction, normalizeShortMessageParts]);

  const handleManualDraftSave = useCallback(() => {
    saveToLocalStorage();
    setMessage({ type: 'success', text: 'Đã lưu nháp trên trình duyệt.' });
  }, [saveToLocalStorage]);

  // Auto save every 30 seconds and on page unload
  useEffect(() => {
    const autosaveInterval = setInterval(saveToLocalStorage, 30000);

    const handleBeforeUnload = () => {
      saveToLocalStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(autosaveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveToLocalStorage]);

  // Save handler
  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tiêu đề đề thi!' });
      return;
    }
    if (!classCode.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mã lớp!' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    const cleanupClozeHtml = (html) => {
      if (!html) return '';
      let cleaned = String(html);
      cleaned = cleaned.replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
      cleaned = cleaned.replace(/<p><\/p>/gi, '');
      cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
      cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
      return cleaned.trim();
    };

    const partsSnapshot = getPartsSnapshotWithCurrentInstruction();

    const cleanedParts = normalizeShortMessageParts(partsSnapshot.map((part) => ({
      ...part,
      sections: (part.sections || []).map((section) => ({
        ...section,
        questions: (section.questions || []).map((q) => {
          if (section.questionType === 'cloze-test' || q.questionType === 'cloze-test') {
            return { ...q, passageText: cleanupClozeHtml(q.passageText) };
          }
          return q;
        }),
      })),
    })));
    const normalizedCleanedParts = normalizeListeningPartsAudio(cleanedParts);

    try {
      const payload = {
        title,
        classCode,
        teacherName,
        studentResultVisibility,
        showResultModal: studentResultVisibility !== 'confirmation',
        testType,
        duration: testConfig.duration || 60,
        mainAudioUrl: normalizeAudioReference(mainAudioUrl),
        parts: normalizedCleanedParts,
        totalQuestions: normalizedCleanedParts.reduce(
          (sum, part) => sum + part.sections.reduce((sSum, sec) => sSum + getQuestionCountForSection(sec), 0),
          0
        ),
      };

      // Determine API endpoint based on test type
      const isListening = testType.includes('listening');
      const endpoint = apiBasePath || (isListening ? 'cambridge/listening-tests' : 'cambridge/reading-tests');

      // If editId is provided, update instead of create
      if (editId) {
        const res = await authFetch(apiPath(`${endpoint}/${editId}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          if (res.status === 401) {
            // Save draft and prompt re-login
            try { saveToLocalStorage(); } catch (e) {}
            setMessage({ type: 'error', text: 'Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục. Bản nháp đã được lưu.' });
            setRequiresLogin(true);
            return;
          }
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message || 'Lỗi khi cập nhật đề');
        }
        setMessage({ type: 'success', text: 'Cập nhật đề thành công!' });
        // Clear draft after successful save
        localStorage.removeItem(`cambridgeTestDraft-${testType}`);
      } else {
        const response = await authFetch(apiPath(endpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          if (response.status === 401) {
            try { saveToLocalStorage(); } catch (e) {}
            setMessage({ type: 'error', text: 'Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục. Bản nháp đã được lưu.' });
            setRequiresLogin(true);
            return;
          }
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.message || 'Lỗi khi lưu đề thi');
        }

        /* eslint-disable-next-line no-unused-vars */
        const result = await response.json();
        setMessage({ type: 'success', text: 'Tạo đề thành công!' });
        // Clear draft after successful save
        localStorage.removeItem(`cambridgeTestDraft-${testType}`);
      }

      // Redirect after success
      setTimeout(() => {
        if (isGatewayTest) {
          const gatewayTab = testType.includes('listening') ? 'listening' : 'reading-writing';
          navigate(`/select-test?platform=gateway&tab=${gatewayTab}`);
          return;
        }
        const successPath = typeof successPathResolver === 'function'
          ? successPathResolver(testType)
          : '/select-test';
        navigate(successPath);
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: 'Lỗi: ' + error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!allowedToManage) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <InlineIcon name="average" size={20} style={{ color: '#d97706' }} />
          Bạn không có quyền tạo/sửa đề {category === 'listening' ? 'Listening' : 'Reading'}
        </h2>
        <p>Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ quản trị hệ thống.</p>
        <button onClick={() => navigate('/select-test')} style={{ marginTop: 16, padding: '8px 14px' }}>Quay lại</button>
      </div>
    );
  }

  if (!testConfig) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <InlineIcon name="error" size={20} style={{ color: '#dc2626' }} />
          Test type không hợp lệ: {testType}
        </h2>
        <p>Các test types hỗ trợ:</p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {Object.keys(TEST_CONFIGS).map(key => (
            <li key={key} style={{ padding: '4px' }}>
              <code>{key}</code> - {TEST_CONFIGS[key].name}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const showMoversReadingSectionNav = !isMoversReading || (currentPart?.sections?.length || 0) > 1;
  const saveButtonLabel = editId ? 'Cập nhật đề' : 'Lưu đề';
  const sidebarFooterBackground = isMoversReading ? 'var(--ctb-sidebar-bg, #f6f8fc)' : '#1e293b';
  const sidebarFooterBorder = isMoversReading ? 'var(--ctb-sidebar-border, #dbe3ef)' : 'rgba(148, 163, 184, 0.25)';
  const sidebarStatusColor = isSubmitting
    ? '#cbd5e1'
    : isSaving
      ? '#fbbf24'
      : lastSaved
        ? '#86efac'
        : (isMoversReading ? 'var(--ctb-sidebar-subtext, #64748b)' : '#94a3b8');
  const sidebarMessageBg = message.type === 'success'
    ? (isMoversReading ? '#f0fdf4' : 'rgba(34, 197, 94, 0.14)')
    : (isMoversReading ? '#fef2f2' : 'rgba(239, 68, 68, 0.14)');
  const sidebarMessageColor = message.type === 'success'
    ? '#22c55e'
    : '#fca5a5';

  const renderSidebarSavePanel = () => (
    <div
      className="ctb-sidebar-footer"
      style={{
        marginTop: 'auto',
        paddingTop: '16px',
        paddingBottom: '12px',
        borderTop: `1px solid ${sidebarFooterBorder}`,
        position: 'sticky',
        bottom: 0,
        background: sidebarFooterBackground,
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: sidebarStatusColor,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '10px',
          fontWeight: 600,
        }}
      >
        {isSubmitting
          ? <InlineIcon name="loading" size={12} />
          : isSaving
            ? <InlineIcon name="save" size={12} />
            : lastSaved
              ? <InlineIcon name="correct" size={12} />
              : <InlineIcon name="clock" size={12} />}
        {isSubmitting
          ? 'Đang lưu đề...'
          : isSaving
            ? 'Đang lưu nháp tự động...'
            : lastSaved
              ? `Tự lưu ${lastSaved.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
              : 'Chưa có bản lưu gần đây'}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSubmitting}
        style={{
          width: '100%',
          padding: '11px',
          borderRadius: isMoversReading ? '9px' : '8px',
          border: 'none',
          background: isSubmitting ? '#94a3b8' : (isMoversReading ? '#6366f1' : '#3b82f6'),
          color: 'white',
          fontWeight: 700,
          fontSize: '14px',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          marginBottom: '8px',
          boxShadow: isMoversReading ? 'none' : '0 8px 20px rgba(59, 130, 246, 0.22)',
        }}
      >
        {isSubmitting
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="loading" size={14} style={{ color: 'white' }} />Đang lưu...</span>
          : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="save" size={14} style={{ color: 'white' }} />{saveButtonLabel}</span>}
      </button>

      <button
        type="button"
        onClick={handleManualDraftSave}
        disabled={isSubmitting}
        className="ctb-btn-draft"
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: isMoversReading ? '9px' : '8px',
          fontWeight: 600,
          fontSize: '13px',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          background: isMoversReading ? '#ffffff' : '#334155',
          color: isMoversReading ? '#334155' : 'white',
          border: isMoversReading ? '1px solid #cbd5e1' : '1px solid rgba(148, 163, 184, 0.3)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="save" size={14} />Lưu nháp</span>
      </button>

      {message.text && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: sidebarMessageBg,
            color: sidebarMessageColor,
            fontSize: '12px',
            fontWeight: 600,
            lineHeight: 1.4,
            border: isMoversReading ? 'none' : `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(248, 113, 113, 0.25)'}`,
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );

  return (
    <div className={`ctb-page${isMoversReading ? ' ctb-page--movers' : ''}`} style={{ minHeight: '100vh' }}>
      {/* AdminNavbar */}
      {requiresLogin && (
        <div style={{ padding: 12, background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, margin: '12px auto', maxWidth: 1000 }}>
          <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <InlineIcon name="average" size={16} style={{ color: '#d97706' }} />
            Bạn cần đăng nhập lại để hoàn tất thao tác.
          </strong>
          <div style={{ marginTop: 8 }}>
            Bản nháp đã được lưu. <button style={{ marginLeft: 8, padding: '6px 10px' }} onClick={() => { redirectToLogin({ rememberPath: true, replace: true }); }}>Đăng nhập lại</button>
          </div>
        </div>
      )}
      <AdminNavbar />

      <div style={{ 
        display: isMoversReading ? 'flex' : 'grid', 
        gridTemplateColumns: isMoversReading ? undefined : '280px 1fr', 
        minHeight: 'calc(100vh - 60px)',
      }}>
      {/* Sidebar - Fixed/Sticky */}
      <div className={isMoversReading ? 'ctb-sidebar--movers' : ''} style={{
        backgroundColor: isMoversReading ? 'var(--ctb-sidebar-bg, #f6f8fc)' : '#1e293b',
        color: isMoversReading ? 'var(--ctb-sidebar-text, #1f2937)' : 'white',
        width: isMoversReading ? '244px' : undefined,
        flexShrink: 0,
        padding: isMoversReading ? '20px 14px' : '20px',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        zIndex: 100,
        borderRight: isMoversReading ? '1px solid var(--ctb-sidebar-border, #dbe3ef)' : 'none',
      }}>
        {/* Test Info */}
        {isMoversReading ? (
          <>
            <h2 className="ctb-sidebar-title" style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 800 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <InlineIcon name="graduation" size={18} style={{ color: 'var(--ctb-sidebar-title-icon, #2563eb)' }} />
                {builderDisplayName}
              </span>
            </h2>
            <p className="ctb-sidebar-sub" style={{ fontSize: '11px', margin: '0 0 18px' }}>
              {testConfig.totalQuestions} câu hỏi · {testConfig.parts} parts · {testConfig.duration} phút
            </p>
          </>
        ) : (
          <div style={{
            padding: '16px',
            backgroundColor: '#334155',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <InlineIcon name="graduation" size={18} style={{ color: '#fff' }} />
              {builderDisplayName}
            </h3>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              <p style={{ margin: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}><InlineIcon name="questions" size={14} />{testConfig.totalQuestions} câu hỏi</p>
              <p style={{ margin: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}><InlineIcon name="reading" size={14} />{testConfig.parts} parts</p>
              <p style={{ margin: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}><InlineIcon name="clock" size={14} />{testConfig.duration} phút</p>
            </div>
          </div>
        )}

        {/* Parts Navigation */}
        {!isGatewayReadingWriting && (
          <>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: isMoversReading ? 'var(--ctb-sidebar-subtext, #6b7280)' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <InlineIcon name="document" size={14} />
              Parts
            </h4>
            {parts.map((part, idx) => {
          const isActive = selectedPartIndex === idx;
          const partTheme = getMoversReadingPartTheme(part, idx);
          const partIcon = QUESTION_TYPE_ICONS[part?.sections?.[0]?.questionType] || 'questions';

          if (isMoversReading) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPart(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '12px 14px',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: isActive ? `${partTheme.color}20` : 'transparent',
                  borderLeft: isActive ? `4px solid ${partTheme.color}` : '4px solid transparent',
                  marginBottom: '6px',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <InlineIcon name={partIcon} size={20} style={{ color: isActive ? partTheme.color : 'var(--ctb-sidebar-muted, #475569)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: isActive ? partTheme.color : 'var(--ctb-sidebar-text, #374151)' }}>
                    {part.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ctb-sidebar-subtext, #6b7280)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getMoversReadingPartSummary(part)}
                  </div>
                </div>
              </button>
            );
          }

            return (
              <div
                key={idx}
                onClick={() => handleSelectPart(idx)}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: selectedPartIndex === idx ? '#3b82f6' : '#475569',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <strong>{part.title}</strong>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                  {part.sections.length} section(s)
                </div>
              </div>
            );
          })}

            <button
              type="button"
              onClick={handleAddPart}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: isMoversReading ? 'var(--ctb-sidebar-button-bg, #ffffff)' : '#22c55e',
                color: isMoversReading ? 'var(--ctb-sidebar-button-text, #334155)' : 'white',
                border: isMoversReading ? '1px solid var(--ctb-sidebar-button-border, #cbd5e1)' : 'none',
                borderRadius: isMoversReading ? '9px' : '6px',
                cursor: 'pointer',
                fontWeight: 600,
                marginTop: '12px',
                fontSize: isMoversReading ? '13px' : undefined,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="create" size={14} style={{ color: isMoversReading ? 'var(--ctb-sidebar-button-text, #334155)' : 'white' }} />Thêm Part</span>
            </button>
          </>
        )}

        {/* Sections in current Part */}
        {currentPart && currentPart.sections.length > 0 && showMoversReadingSectionNav && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: isMoversReading ? 'var(--ctb-sidebar-subtext, #6b7280)' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <InlineIcon name="document" size={14} />
              {isGatewayReadingWriting
                ? "Mục bài Gateway"
                : isGatewayListening
                  ? `Sections trong ${currentPart.title || `Part ${selectedPartIndex + 1}`}`
                  : `Sections trong Part ${selectedPartIndex + 1}`}
            </h4>
            {currentPart.sections.map((sec, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSection(idx)}
                style={{
                  padding: '10px',
                  marginBottom: '6px',
                  backgroundColor: isMoversReading
                    ? (selectedSectionIndex === idx ? 'var(--ctb-sidebar-section-active-bg, #eaf1ff)' : 'var(--ctb-sidebar-section-bg, rgba(255, 255, 255, 0.82))')
                    : (selectedSectionIndex === idx ? '#6366f1' : '#475569'),
                  color: isMoversReading
                    ? (selectedSectionIndex === idx ? 'var(--ctb-sidebar-section-active-text, #2563eb)' : 'var(--ctb-sidebar-text, #1f2937)')
                    : 'white',
                  border: isMoversReading ? `1px solid ${selectedSectionIndex === idx ? 'var(--ctb-sidebar-section-active-border, #93c5fd)' : 'var(--ctb-sidebar-section-border, #d7dee8)'}` : 'none',
                  borderRadius: isMoversReading ? '10px' : '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {isGatewayReadingWriting || isGatewayListening
                  ? (sec.sectionTitle || `Mục ${idx + 1}`)
                  : `Section ${idx + 1}: ${sec.questionType}`}
                <div style={{ fontSize: '11px', color: isMoversReading ? 'var(--ctb-sidebar-subtext, #6b7280)' : '#cbd5e1', marginTop: '2px' }}>
                  {isGatewayReadingWriting
                    ? (getQuestionCountForSection(sec) || sec.questions.length)
                    : sec.questions.length} câu hỏi
                </div>
              </div>
            ))}
            {!isMoversReading && (
              <button
                type="button"
                onClick={handleAddSection}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginTop: '8px',
                  fontSize: '13px',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="create" size={14} style={{ color: 'white' }} />{isGatewayReadingWriting ? "Thêm mục" : "Thêm Section"}</span>
              </button>
            )}
          </div>
        )}

        {/* Available Question Types */}
        {false && !isMoversReading && (
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: isMoversReading ? 'var(--ctb-sidebar-subtext, #6b7280)' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <InlineIcon name="writing" size={14} />
            Loại câu hỏi hỗ trợ
          </h4>
          <div style={{ fontSize: '12px' }}>
            {availableTypes.map(qt => (
              <div key={qt.id} style={{
                padding: '6px 10px',
                backgroundColor: isMoversReading ? '#f8fafc' : '#475569',
                color: isMoversReading ? 'var(--ctb-sidebar-text, #374151)' : 'white',
                border: isMoversReading ? '1px solid #e5e7eb' : 'none',
                borderRadius: isMoversReading ? '8px' : '4px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <InlineIcon name={QUESTION_TYPE_ICONS[qt.id] || 'questions'} size={14} style={{ color: isMoversReading ? 'var(--ctb-sidebar-muted, #475569)' : '#fff' }} />
                {qt.labelVi || qt.label}
              </div>
            ))}
          </div>
        </div>
        )}

        {isMoversReading && <div style={{ flex: 1 }} />}

        {false && isMoversReading && (
          <div className="ctb-sidebar-footer" style={{ paddingTop: '16px', marginTop: '16px', borderTop: '1px solid var(--ctb-sidebar-border, #dbe3ef)' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '9px',
                border: 'none',
                background: isSubmitting ? '#9ca3af' : '#6366f1',
                color: 'white',
                fontWeight: 700,
                fontSize: '14px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                marginBottom: '8px',
              }}
            >
              {isSubmitting
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="loading" size={14} style={{ color: 'white' }} />Đang lưu...</span>
                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="save" size={14} style={{ color: 'white' }} />{editId ? 'Cập nhật' : 'Lưu đề'}</span>}
            </button>
            <button
              type="button"
              onClick={handleManualDraftSave}
              disabled={isSubmitting}
              className="ctb-btn-draft"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '9px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><InlineIcon name="save" size={14} />Lưu nháp</span>
            </button>

            {message.text && (
              <div style={{
                marginTop: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: message.type === 'success' ? '#15803d' : '#dc2626',
                fontSize: '12px',
                fontWeight: 600,
                lineHeight: 1.4,
              }}>
                {message.text}
              </div>
            )}
          </div>
        )}
        {renderSidebarSavePanel()}
      </div>

      {/* Main Content */}
      <div className={`ctb-main${isMoversReading ? ' ctb-main--movers' : ''}`} style={{ 
        flex: 1,
        padding: isMoversReading ? '24px 28px' : '24px',
        overflowY: 'auto',
        height: '100vh',
      }}>
        {/* Header with Title and Save - Compact */}
        {!isMoversReading && (
          <div className="ctb-card" style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 className="ctb-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <InlineIcon name="graduation" size={18} style={{ color: '#0f172a' }} />
                {builderDisplayName}
              </h1>
              {/* Auto-save indicator */}
              <div style={{
                fontSize: '11px',
                color: isSaving ? '#f59e0b' : lastSaved ? '#22c55e' : '#9ca3af',
                fontStyle: 'italic',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                {isSaving ? <InlineIcon name="save" size={12} /> : lastSaved ? <InlineIcon name="correct" size={12} /> : null}
                {lastSaved ? lastSaved.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : isSaving ? 'Đang lưu' : 'Chưa lưu'}
              </div>
            </div>
            {false && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isSubmitting ? '#94a3b8' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                {isSubmitting ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="loading" size={14} style={{ color: 'white' }} />Đang lưu...</span> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="save" size={14} style={{ color: 'white' }} />Lưu</span>}
              </button>
            </div>}
          </div>
        )}

        {/* Message */}
        {!isMoversReading && message.text && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            color: message.type === 'error' ? '#dc2626' : '#16a34a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <InlineIcon name={message.type === 'error' ? 'error' : 'correct'} size={16} />
            {message.text}
          </div>
        )}

        {/* Test Info Form - Compact */}
        <div className={`ctb-card${isMoversReading ? ' ctb-card--movers' : ''}`} style={{
          borderRadius: isMoversReading ? '12px' : '8px',
          padding: isMoversReading ? '20px 24px' : '12px 16px',
          marginBottom: isMoversReading ? '24px' : '12px',
          boxShadow: isMoversReading ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
          border: isMoversReading ? '1px solid var(--builder-border, #d7dee8)' : 'none',
        }}>
          {isMoversReading && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <h3 className="ctb-card-title" style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <InlineIcon name="document" size={16} />
                Thông tin đề thi
              </h3>
              <div style={{
                fontSize: '12px',
                color: isSaving ? '#f59e0b' : lastSaved ? '#22c55e' : '#9ca3af',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}>
                {isSaving ? <InlineIcon name="save" size={12} /> : lastSaved ? <InlineIcon name="correct" size={12} /> : null}
                {lastSaved ? `Đã lưu ${lastSaved.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : isSaving ? 'Đang lưu...' : 'Chưa lưu nháp'}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: isMoversReading ? '14px' : '10px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontWeight: 600, 
                color: '#6b7280',
                fontSize: '12px',
              }}>
                {isMoversReading ? 'Tiêu đề *' : 'Tiêu đề đề thi *'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isMoversReading ? 'VD: MOVERS Reading Test – Tháng 10' : 'VD: KET Test 1'}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontWeight: 600, 
                color: '#6b7280',
                fontSize: '12px',
              }}>
                Mã lớp *
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                placeholder={isMoversReading ? 'VD: Practice Test Plus 2' : 'VD: KET-631-A'}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontWeight: 600, 
                color: '#6b7280',
                fontSize: '12px',
              }}>
                {isMoversReading ? 'Giáo viên' : 'Tên giáo viên'}
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                disabled
                placeholder="VD: Cô Lan"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  background: '#f8fafc',
                  color: '#334155',
                  cursor: 'not-allowed',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: 600,
                  color: '#6b7280',
                  fontSize: '12px',
                }}
              >
                Kết quả học sinh
              </label>
              <select
                value={studentResultVisibility}
                onChange={(event) => setStudentResultVisibility(event.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                }}
              >
                <option value="confirmation">Chỉ xác nhận đã nộp</option>
                <option value="score">Hiện tổng điểm</option>
                <option value="details">Hiện chi tiết kết quả</option>
              </select>
            </div>
          </div>
        </div>

        {/* Global Audio (Listening only) */}
        {isListeningTest && (
          <div className="ctb-card" style={{
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}>
            <label style={{
              marginBottom: '8px',
              fontWeight: 600,
              color: '#374151',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <InlineIcon name="listening" size={14} />
              Audio chung (toàn bài)
            </label>

            <AudioPreviewBlock
              audioUrl={mainAudioUrl}
              emptyText="Chưa có audio chung cho bài listening."
              onClear={() => setMainAudioUrl('')}
              buttonStyle={{
                border: '1px solid #ef4444',
                background: 'white',
                color: '#ef4444',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            />

            <div style={{ marginTop: '12px' }}>
              <input
                type="file"
                accept="audio/*"
                disabled={uploadingMainAudio}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  await uploadMainAudio(file);
                }}
              />
              {uploadingMainAudio && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#0e276f' }}>
                  Đang upload audio...
                </div>
              )}
              {mainAudioUploadError && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="error" size={14} />{mainAudioUploadError}</span>
                </div>
              )}
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="idea" size={12} />Audio chung sẽ phát xuyên suốt khi học sinh chuyển part.</span>
              </div>
            </div>
          </div>
        )}

        {selectedPartIndex !== -1 && currentPart && (
          <div className={`ctb-card${isMoversReading ? ' ctb-card--movers' : ''}`} style={{
            borderRadius: isMoversReading ? '12px' : '8px',
            padding: isMoversReading ? '20px 24px' : '16px',
            marginBottom: '20px',
            boxShadow: isMoversReading ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
            border: isMoversReading ? '1px solid var(--builder-border, #d7dee8)' : 'none',
          }}>
            {!isGatewayReadingWriting && <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: isMoversReading ? 'var(--builder-subtext, #64748b)' : '#374151',
              }}>
                Tiêu đề Part:
              </label>
              <input
                type="text"
                value={currentPart.title || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  updateParts(prevParts => prevParts.map((part, pIdx) => {
                    if (pIdx !== selectedPartIndex) return part;
                    return { ...part, title: value };
                  }));
                }}
                placeholder={`VD: Part ${selectedPartIndex + 1}`}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>}

            {!isGatewayReadingWriting && <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: isMoversReading ? 'var(--builder-subtext, #64748b)' : '#374151',
              }}>
                Hướng dẫn cho Part:
              </label>
              <div className="part-instruction-editor">
                <ReactQuill
                  key={`part-instruction-${selectedPartIndex}`}
                  ref={partInstructionRef}
                  theme="snow"
                  value={currentPart.instruction || ''}
                  onChange={(value) => {
                    const normalizedValue = normalizePartInstructionHtml(value);
                    partInstructionDraftRef.current = normalizedValue;
                    updateParts(prevParts => prevParts.map((part, pIdx) => {
                      if (pIdx !== selectedPartIndex) return part;
                      return { ...part, instruction: normalizedValue };
                    }), { syncCurrentPartInstruction: false });
                  }}
                  modules={partInstructionModules}
                  formats={[
                    'header',
                    'bold',
                    'italic',
                    'underline',
                    'color',
                    'background',
                    'list',
                    'bullet',
                    'align',
                    'link',
                    'image',
                  ]}
                  style={{
                    minHeight: '100px',
                    backgroundColor: 'white',
                  }}
                />
              </div>
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="idea" size={12} />Có thể thêm hình ảnh, định dạng text, màu sắc...</span>
              </p>
            </div>}

            {/* Part Audio (Listening only) */}
            {isListeningTest ? (
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 600,
                    color: '#374151',
                  }}
                >
                  Audio (file nghe cho Part này):
                </label>

                <div
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: 'white',
                  }}
                >
                  <AudioPreviewBlock
                    audioUrl={currentPart.audioUrl}
                    emptyText="Chưa có audio cho part này."
                    onClear={() => {
                      updateParts(prevParts => prevParts.map((part, pIdx) => {
                        if (pIdx !== selectedPartIndex) return part;
                        return { ...part, audioUrl: '' };
                      }));
                    }}
                    buttonStyle={{
                      border: '1px solid #ef4444',
                      background: 'white',
                      color: '#ef4444',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  />

                  <div style={{ marginTop: '12px' }}>
                    <input
                      type="file"
                      accept="audio/*"
                      disabled={uploadingAudioPartIndex === selectedPartIndex}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        await uploadAudioForPart(selectedPartIndex, file);
                      }}
                    />
                    {uploadingAudioPartIndex === selectedPartIndex && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#0e276f' }}>
                        Đang upload audio...
                      </div>
                    )}
                    {audioUploadError && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="error" size={14} />{audioUploadError}</span>
                      </div>
                    )}
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="idea" size={12} />Hỗ trợ file audio (mp3/wav/m4a/ogg...). Backend giới hạn 50MB.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : !isGatewayReadingWriting ? (
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 600,
                    color: '#374151',
                  }}
                >
                  Hình ảnh minh hoạ cho Part này:
                </label>

                <div
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: 'white',
                  }}
                >
                  {currentPart.imageUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <img
                        src={/^https?:\/\//i.test(currentPart.imageUrl) ? currentPart.imageUrl : hostPath(currentPart.imageUrl)}
                        alt="Part illustration"
                        style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                      />
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <a
                          href={/^https?:\/\//i.test(currentPart.imageUrl) ? currentPart.imageUrl : hostPath(currentPart.imageUrl)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px' }}
                        >
                          Mở hình ảnh
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            updateParts(prevParts => prevParts.map((part, pIdx) => {
                              if (pIdx !== selectedPartIndex) return part;
                              return { ...part, imageUrl: '' };
                            }));
                          }}
                          style={{
                            border: '1px solid #ef4444',
                            background: 'white',
                            color: '#ef4444',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          Xoá hình
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      Chưa có hình ảnh cho part này.
                    </div>
                  )}

                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <InlineIcon name="link" size={14} />
                      Nhập URL ảnh/GIF từ internet
                    </div>
                    <input
                      type="text"
                      value={currentPart.imageUrl && /^https?:\/\//i.test(currentPart.imageUrl) ? currentPart.imageUrl : ''}
                      onChange={(e) => {
                        const value = e.target.value.trim();
                        updateParts(prevParts => prevParts.map((part, pIdx) => {
                          if (pIdx !== selectedPartIndex) return part;
                          return { ...part, imageUrl: value };
                        }));
                      }}
                      placeholder="https://example.com/image.gif"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        color: currentPart.imageUrl && /^https?:\/\//i.test(currentPart.imageUrl) ? '#1d4ed8' : '#374151',
                      }}
                    />
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
                      Dán link GIF từ Giphy, Tenor, hoặc bất kỳ URL ảnh nào (jpg/png/gif/webp...)
                    </div>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <InlineIcon name="upload" size={14} />
                      Hoặc upload từ máy
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImagePartIndex === selectedPartIndex}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        await uploadImageForPart(selectedPartIndex, file);
                      }}
                    />
                    {uploadingImagePartIndex === selectedPartIndex && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#0e276f' }}>
                        Đang upload hình ảnh...
                      </div>
                    )}
                    {imageUploadError && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="error" size={14} />{imageUploadError}</span>
                      </div>
                    )}
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="idea" size={12} />Hỗ trợ file ảnh (jpg/png/gif/webp...). Nên dùng ảnh rõ nét, tỉ lệ phù hợp với bài thi.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Example Block (abc type only) - placed under part image area */}
            {currentSection && currentSection.questionType === 'abc' && (
              <div style={{ marginBottom: '20px', padding: '16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <InlineIcon name="starters" size={14} />
                  Câu mẫu (Example)
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                    Nội dung câu mẫu (ví dụ: đoạn hội thoại mẫu):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Nick: What did you do at the weekend? / Paul: ..."
                    value={currentSection.exampleText || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateParts(prevParts => prevParts.map((part, pIdx) => {
                        if (pIdx !== selectedPartIndex) return part;
                        return {
                          ...part,
                          sections: part.sections.map((sec, sIdx) => {
                            if (sIdx !== selectedSectionIndex) return sec;
                            return { ...sec, exampleText: val };
                          }),
                        };
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                    Đáp án đúng của câu mẫu:
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {['A', 'B', 'C'].map(letter => (
                      <label key={letter} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                        <input
                          type="radio"
                          name={`example-answer-${selectedPartIndex}-${selectedSectionIndex}`}
                          value={letter}
                          checked={(currentSection.exampleAnswer || '') === letter}
                          onChange={() => {
                            updateParts(prevParts => prevParts.map((part, pIdx) => {
                              if (pIdx !== selectedPartIndex) return part;
                              return {
                                ...part,
                                sections: part.sections.map((sec, sIdx) => {
                                  if (sIdx !== selectedSectionIndex) return sec;
                                  return { ...sec, exampleAnswer: letter };
                                }),
                              };
                            }));
                          }}
                        />
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: (currentSection.exampleAnswer || '') === letter ? '#0e276f' : '#e5e7eb',
                          color: (currentSection.exampleAnswer || '') === letter ? 'white' : '#374151',
                          fontWeight: 700,
                        }}>
                          {letter}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Section */}
            {currentSection && (
              <div style={{
                border: isMoversReading ? '2px solid var(--builder-border, #d7dee8)' : '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                backgroundColor: isMoversReading ? 'var(--builder-surface, #ffffff)' : '#f8fafc',
              }}>
                <h3 style={{ margin: '0 0 16px', color: isMoversReading ? 'var(--builder-text, #1f2937)' : '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <InlineIcon name="writing" size={16} />
                  {isGatewayReadingWriting || isGatewayListening
                    ? (currentSection.sectionTitle || `Mục ${selectedSectionIndex + 1}`)
                    : `Section ${selectedSectionIndex + 1}`}
                </h3>

                {currentPart?.sections?.length > 1 ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(selectedSectionIndex)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                      title="Xóa section hiện tại"
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <InlineIcon name="trash" size={14} style={{ color: 'white' }} />
                        Xóa Section
                      </span>
                    </button>
                  </div>
                ) : null}

                {/* Question Type Selector */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 600,
                    color: isMoversReading ? 'var(--builder-subtext, #64748b)' : '#374151',
                  }}>
                    Loại câu hỏi:
                  </label>
                  {isGatewaySectionTypeLocked ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          maxWidth: '400px',
                          padding: '10px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          color: '#0f172a',
                          fontWeight: 600,
                          fontSize: '13px',
                        }}
                      >
                        Cố định theo mẫu Gateway: {activeGatewaySectionBlueprint?.questionType}
                      </div>
                      <button
                        type="button"
                        onClick={handleRestoreGatewaySectionTemplate}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #2563eb',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        Khôi phục mẫu mục
                      </button>
                    </div>
                  ) : (
                    <QuestionTypeSelector
                      testType={testType}
                      questionTypes={questionTypeOptions}
                      value={currentSection.questionType}
                      onChange={handleQuestionTypeChange}
                      style={{ maxWidth: '400px' }}
                    />
                  )}
                </div>

                {/* Question Editor */}
                <div style={{
                  backgroundColor: isMoversReading ? 'var(--builder-input-muted-bg, #f3f6fa)' : 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  border: isMoversReading ? '1px solid var(--builder-border, #d7dee8)' : '1px solid #e5e7eb',
                }}>
                  {currentSection.questions.map((question, qIdx) => {
                    const isCollapsed = collapsedQuestions[`${selectedPartIndex}-${selectedSectionIndex}-${qIdx}`];
                    const startNum = questionStarts.questionStart[`${selectedPartIndex}-${selectedSectionIndex}-${qIdx}`] || 1;
                    
                    // For multi-question types (like long-text-mc), use section-based starting number
                    const sectionStartNum = questionStarts.sectionStart[`${selectedPartIndex}-${selectedSectionIndex}`] || 1;
                    
                    // Generate question preview text
                    const getQuestionPreview = () => {
                      if (question.questionText) return question.questionText;
                      if (question.items?.length) return `${question.items.length} matching items`;
                      if (question.options?.length) return `${question.options.length} options`;
                      return 'Empty question';
                    };
                    
                    return (
                      <div 
                        key={`${selectedPartIndex}-${selectedSectionIndex}-${qIdx}`}
                        style={{
                          marginBottom: '16px',
                          paddingBottom: '16px',
                          borderBottom: qIdx < currentSection.questions.length - 1
                            ? (isMoversReading ? '2px dashed var(--builder-border, #d7dee8)' : '2px dashed #e5e7eb')
                            : 'none',
                        }}
                      >
                        {/* Question Header with Controls */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: isCollapsed ? '0' : '12px',
                          flexWrap: 'wrap',
                          gap: '8px',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flex: 1,
                          }}>
                            {/* Chỉ hiện số câu hỏi cho question types đơn giản, không hiện cho multi-question types */}
                            {!['long-text-mc', 'cloze-mc', 'cloze-test', 'short-message', 'people-matching', 'gap-match', 'matching', 'word-form', 'matching-pictures', 'image-cloze', 'word-drag-cloze', 'reading-open-questions', 'true-false-not-given'].includes(currentSection.questionType) && (
                              <span style={{ 
                                fontWeight: 600, 
                                color: '#6366f1',
                                fontSize: '14px',
                              }}>
                                Câu hỏi #{startNum}
                              </span>
                            )}
                            
                            {/* Collapsed Preview */}
                            {isCollapsed && (
                              <span style={{
                                fontSize: '13px',
                                color: '#6b7280',
                                fontStyle: 'italic',
                              }}>
                                {getQuestionPreview().substring(0, 50)}...
                              </span>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div style={{
                            display: 'flex',
                            gap: '6px',
                            flexWrap: 'wrap',
                          }}>
                            {/* Collapse/Expand Button */}
                            <button
                              onClick={() => toggleCollapseQuestion(qIdx)}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: isCollapsed ? '#3b82f6' : '#e0e7ff',
                                color: isCollapsed ? 'white' : '#4f46e5',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}
                              title={isCollapsed ? 'Mở rộng' : 'Thu nhỏ'}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <InlineIcon name={isCollapsed ? 'eye' : 'chevron-up'} size={14} style={{ color: isCollapsed ? 'white' : '#4f46e5' }} />
                                {isCollapsed ? 'Mở' : 'Ẩn'}
                              </span>
                            </button>
                            
                            {/* Copy Button */}
                            <button
                              onClick={() => handleCopyQuestion(qIdx)}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}
                              title="Sao chép câu hỏi"
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="copy" size={14} style={{ color: 'white' }} />Copy</span>
                            </button>
                            
                            {/* Paste Button - only show if something is copied */}
                            {copiedQuestion && (
                              <button
                                onClick={handlePasteQuestion}
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#8b5cf6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                                title="Dán câu hỏi đã copy"
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="pin" size={14} style={{ color: 'white' }} />Paste</span>
                              </button>
                            )}
                            
                            {/* Delete Button */}
                            {currentSection.questions.length > 1 && (
                              <button
                                onClick={() => handleDeleteQuestion(qIdx)}
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                                title="Xóa câu hỏi"
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="trash" size={14} style={{ color: 'white' }} />Xóa</span>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Question Details - shown when NOT collapsed */}
                        {!isCollapsed && (
                          <div style={{
                            backgroundColor: '#f9fafb',
                            padding: '16px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                          }}>
                            <QuestionEditorFactory
                              questionType={currentSection.questionType}
                              question={question}
                              testType={testType}
                              sectionTitle={currentSection.sectionTitle}
                              sectionQuestionCount={currentSection.questions.length}
                              onSectionTitleChange={(sectionTitle) => {
                                updateParts(prevParts => prevParts.map((part, pIdx) => {
                                  if (pIdx !== selectedPartIndex) return part;
                                  return {
                                    ...part,
                                    sections: (part.sections || []).map((section, sIdx) => (
                                      sIdx === selectedSectionIndex ? { ...section, sectionTitle } : section
                                    )),
                                  };
                                }));
                              }}
                              onChange={(field, value) => {
                                updateParts(prevParts => prevParts.map((part, pIdx) => {
                                  if (pIdx !== selectedPartIndex) return part;
                                  const nextSections = (part.sections || []).map((section, sIdx) => {
                                    if (sIdx !== selectedSectionIndex) return section;
                                    const prevQuestions = Array.isArray(section.questions) ? section.questions : [];
                                    const prevQuestion = prevQuestions[qIdx] || {};
                                    const nextQuestions = prevQuestions.map((q, idx) => {
                                      if (idx !== qIdx) return q;
                                      return { ...prevQuestion, [field]: value };
                                    });
                                    return { ...section, questions: nextQuestions };
                                  });
                                  return { ...part, sections: nextSections };
                                }));
                              }}
                              questionIndex={qIdx}
                              startingNumber={['long-text-mc', 'cloze-mc', 'cloze-test', 'short-message', 'people-matching', 'gap-match', 'matching', 'word-form', 'matching-pictures', 'image-cloze', 'word-drag-cloze', 'story-completion', 'look-read-write', 'reading-open-questions', 'true-false-not-given'].includes(currentSection.questionType) ? sectionStartNum : startNum}
                              partIndex={selectedPartIndex}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <button
                    onClick={handleAddQuestion}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><InlineIcon name="create" size={14} style={{ color: 'white' }} />Thêm câu hỏi</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      {/* End grid */}
    </div>
    </div>
  );
};

// Custom styles for ReactQuill in Part Instruction
const quillStyles = `
  .part-instruction-editor .ql-container {
    min-height: 100px;
    font-size: 14px;
    line-height: 1.8;
    transition: all 0.2s ease;
  }
  .part-instruction-editor .ql-editor {
    min-height: 100px;
    background-color: #ffffff;
  }
  .part-instruction-editor .ql-editor.ql-blank::before {
    font-style: italic;
    color: #9ca3af;
  }
  
  /* Highlight khi focus vào ReactQuill */
  .part-instruction-editor .ql-container.ql-snow {
    border-color: #d1d5db;
  }
  .part-instruction-editor .ql-container.ql-snow:focus-within {
    background-color: #fef3c7;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
  .part-instruction-editor .ql-editor:focus {
    background-color: #fef3c7;
    outline: none;
  }
  
  /* Highlight toolbar khi đang active */
  .part-instruction-editor .ql-toolbar.ql-snow {
    border-color: #d1d5db;
    background-color: #f9fafb;
  }
  .part-instruction-editor:focus-within .ql-toolbar.ql-snow {
    background-color: #fef9e7;
    border-color: #f59e0b;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'part-instruction-quill-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = quillStyles;
    document.head.appendChild(styleEl);
  }
}

export default ExamCoreTestBuilder;
