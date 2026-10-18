import {
  getCurrentListeningAudioUrl,
  getListeningAudioMetadata,
} from "../examListeningAudio";

describe("Gateway Listening audio selection", () => {
  test("uses distinct part audio files instead of the global audio", () => {
    const test = {
      testType: "gateway-listening",
      mainAudioUrl: "/audio/full-test.mp3",
      parts: [
        { audioUrl: "/audio/part-a.mp3" },
        { audioUrl: "/audio/part-b.mp3" },
      ],
    };

    expect(getListeningAudioMetadata(test, "gateway-listening")).toMatchObject({
      hasAudio: true,
      uniqueCount: 2,
      isSingleFile: false,
      usesMain: false,
    });
    expect(
      getCurrentListeningAudioUrl(test, test.parts[1], "/audio/full-test.mp3", "gateway-listening")
    ).toBe("/audio/part-b.mp3");
  });

  test("falls back to the global audio for a part without its own file", () => {
    const test = {
      testType: "gateway-listening",
      mainAudioUrl: "/audio/full-test.mp3",
      parts: [{ audioUrl: "/audio/part-a.mp3" }, {}],
    };

    expect(
      getCurrentListeningAudioUrl(test, test.parts[1], "/audio/full-test.mp3", "gateway-listening")
    ).toBe("/audio/full-test.mp3");
  });

  test("preserves the global-audio priority for other exam types", () => {
    const test = {
      testType: "ket-listening",
      mainAudioUrl: "/audio/full-test.mp3",
      parts: [
        { audioUrl: "/audio/part-a.mp3" },
        { audioUrl: "/audio/part-b.mp3" },
      ],
    };

    expect(getListeningAudioMetadata(test, "ket-listening")).toMatchObject({
      uniqueCount: 1,
      isSingleFile: true,
      usesMain: true,
    });
    expect(
      getCurrentListeningAudioUrl(test, test.parts[1], "/audio/full-test.mp3", "ket-listening")
    ).toBe("/audio/full-test.mp3");
  });
});
