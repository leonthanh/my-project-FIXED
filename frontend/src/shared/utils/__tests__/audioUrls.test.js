import {
  buildAudioPreviewSources,
  normalizeAudioReference,
} from "../audioUrls";

describe("audioUrls", () => {
  it("normalizes legacy upload paths", () => {
    expect(normalizeAudioReference("/upload/audio/test.mp3")).toBe("/uploads/audio/test.mp3");
  });

  it("builds canonical and fallback preview sources for backend uploads", () => {
    const sources = buildAudioPreviewSources("http://localhost:5000", "/upload/audio/test.mp3?x=1");

    expect(sources[0]).toBe("http://localhost:5000/uploads/audio/test.mp3?x=1");
    expect(sources).toEqual(
      expect.arrayContaining([
        "http://localhost:5000/upload/audio/test.mp3?x=1",
        "http://localhost:5000/backend/uploads/audio/test.mp3?x=1",
      ])
    );
  });

  it("does not invent backend fallbacks for arbitrary external urls", () => {
    expect(buildAudioPreviewSources("http://localhost:5000", "https://cdn.example.com/audio/test.mp3")).toEqual([
      "https://cdn.example.com/audio/test.mp3",
    ]);
  });
});