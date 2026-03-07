const buildWordFormSentence = (sentence, rootWord, correctAnswer) => ({
  sentence,
  text: sentence,
  rootWord,
  correctAnswer,
});

export const buildMoversPracticeTest1Template = () => ({
  title: "Movers Reading & Writing Practice Test 1",
  teacherName: "",
  mainAudioUrl: "",
  parts: [
    {
      partNumber: 1,
      title: "Part 1",
      instruction:
        "Look and read. Choose the correct word from the word bank and write it next to numbers 1-5.",
      audioUrl: "",
      sections: [
        {
          sectionTitle: "Vocabulary matching",
          questionType: "fill",
          questions: [
            {
              questionType: "fill",
              questionText: "1. You can borrow and read books here.",
              correctAnswer: "library",
            },
            {
              questionType: "fill",
              questionText: "2. You can see films here.",
              correctAnswer: "cinema",
            },
            {
              questionType: "fill",
              questionText: "3. Trains stop here for people to get on and off.",
              correctAnswer: "station",
            },
            {
              questionType: "fill",
              questionText: "4. You go here when you need a doctor and a bed.",
              correctAnswer: "hospital",
            },
            {
              questionType: "fill",
              questionText: "5. Red, amber, and green lights that control cars.",
              correctAnswer: "traffic lights|traffic light",
            },
          ],
        },
      ],
    },
    {
      partNumber: 2,
      title: "Part 2",
      instruction: "Read the conversation and choose the best answer (A, B, or C).",
      audioUrl: "",
      sections: [
        {
          sectionTitle: "Conversation multiple choice",
          questionType: "abc",
          questions: [
            {
              questionType: "abc",
              questionText: "What did Emma do yesterday afternoon?",
              options: ["A. She visited her cousin.", "B. She did her homework.", "C. She played tennis."],
              correctAnswer: "A",
            },
            {
              questionType: "abc",
              questionText: "Where are they going this weekend?",
              options: ["A. To the beach.", "B. To the museum.", "C. To the sports center."],
              correctAnswer: "C",
            },
            {
              questionType: "abc",
              questionText: "What time does the class start?",
              options: ["A. 8:30.", "B. 9:00.", "C. 9:30."],
              correctAnswer: "B",
            },
            {
              questionType: "abc",
              questionText: "Which drink does the boy choose?",
              options: ["A. Orange juice.", "B. Lemonade.", "C. Water."],
              correctAnswer: "A",
            },
            {
              questionType: "abc",
              questionText: "What is the weather like today?",
              options: ["A. Windy.", "B. Rainy.", "C. Sunny."],
              correctAnswer: "C",
            },
            {
              questionType: "abc",
              questionText: "How does Lucy go to school?",
              options: ["A. By bus.", "B. By bike.", "C. On foot."],
              correctAnswer: "B",
            },
          ],
        },
      ],
    },
    {
      partNumber: 3,
      title: "Part 3",
      instruction: "Read the text. Choose the best word (A, B, or C) for each gap.",
      audioUrl: "",
      sections: [
        {
          sectionTitle: "Story gap fill",
          questionType: "cloze-mc",
          questions: [
            {
              questionType: "cloze-mc",
              passageTitle: "A day at the farm",
              passage:
                "Last Saturday, Anna and her brother went to their uncle's farm. They (11) very early in the morning and helped to feed the animals. Anna liked the sheep, but her brother wanted to (12) the horses. Before lunch, they (13) eggs from the chicken house. In the afternoon, the weather was sunny, so they (14) outside and played games. At the end of the day, they were tired but very (15).",
              blanks: [
                {
                  number: 11,
                  options: ["A. arrive", "B. arrived", "C. arriving"],
                  correctAnswer: "B",
                },
                {
                  number: 12,
                  options: ["A. ride", "B. rides", "C. rode"],
                  correctAnswer: "A",
                },
                {
                  number: 13,
                  options: ["A. collected", "B. collecting", "C. collect"],
                  correctAnswer: "A",
                },
                {
                  number: 14,
                  options: ["A. stay", "B. stayed", "C. stays"],
                  correctAnswer: "B",
                },
                {
                  number: 15,
                  options: ["A. happy", "B. happier", "C. happiest"],
                  correctAnswer: "A",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      partNumber: 4,
      title: "Part 4",
      instruction: "Choose the correct word for each numbered gap.",
      audioUrl: "",
      sections: [
        {
          sectionTitle: "Cloze with options",
          questionType: "cloze-mc",
          questions: [
            {
              questionType: "cloze-mc",
              passageTitle: "My new classroom",
              passage:
                "Our new classroom is very (16). There are twenty desks and a big board at the front. We keep our books on a shelf next to the (17). Our teacher puts pictures on the wall to make the room more (18).",
              blanks: [
                {
                  number: 16,
                  options: ["A. tidy", "B. tidier", "C. tidiest"],
                  correctAnswer: "A",
                },
                {
                  number: 17,
                  options: ["A. window", "B. windows", "C. windy"],
                  correctAnswer: "A",
                },
                {
                  number: 18,
                  options: ["A. color", "B. colorful", "C. colors"],
                  correctAnswer: "B",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      partNumber: 5,
      title: "Part 5",
      instruction: "Read the story and write one to three words to complete each sentence.",
      audioUrl: "",
      sections: [
        {
          sectionTitle: "Short answers",
          questionType: "word-form",
          questions: [
            {
              questionType: "word-form",
              sentences: [
                buildWordFormSentence("Mia and her brother went to the ___ after school.", "PLACE", "park"),
                buildWordFormSentence("They bought two ___ from a small shop.", "FOOD", "sandwiches|a sandwich"),
                buildWordFormSentence("Then they sat under a big ___ tree.", "TREE", "apple|an apple"),
                buildWordFormSentence("Mia took photos with her new ___.", "THING", "camera|a camera"),
                buildWordFormSentence("They got home before ___.", "TIME", "sunset|it got dark"),
              ],
            },
          ],
        },
      ],
    },
    {
      partNumber: 6,
      title: "Part 6",
      instruction:
        "Look and read the picture. Complete the sentences and answer the questions (1-4). Then write two sentences about the picture (5-6).",
      audioUrl: "",
      sections: [
        {
          sectionTitle: "Complete and answer",
          questionType: "fill",
          questions: [
            {
              questionType: "fill",
              questionText: "1. The boy who is sitting in the armchair is watching ______.",
              correctAnswer: "television|tv|a cartoon|cartoons",
            },
            {
              questionType: "fill",
              questionText: "2. The doctor is wearing blue ______.",
              correctAnswer: "trousers|pants|jeans",
            },
            {
              questionType: "fill",
              questionText: "3. What is the nurse giving the child?",
              correctAnswer: "medicine|some medicine",
            },
            {
              questionType: "fill",
              questionText: "4. What is the boy with black hair doing?",
              correctAnswer: "reading|reading a book",
            },
          ],
        },
        {
          sectionTitle: "Free writing",
          questionType: "short-message",
          questions: [
            {
              questionType: "short-message",
              messageType: "sentence",
              wordLimit: { min: 10, max: 40 },
              situation:
                "Now write two sentences about the picture.<br/><strong>5.</strong> Write one true sentence.<br/><strong>6.</strong> Write one more true sentence.",
              recipient: "",
              sampleAnswer:
                "There is a nurse standing next to a child. A boy with black hair is reading a book.",
            },
          ],
        },
      ],
    },
  ],
});
