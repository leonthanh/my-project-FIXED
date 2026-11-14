import createStyles from "../ExamCoreListeningRuntime.styles";

describe("ExamCoreListeningRuntime Gateway colors", () => {
  test("uses the Gateway book green for question and option badges", () => {
    const styles = createStyles(false, "GATEWAY");

    expect(styles.questionNum.backgroundColor).toBe("#2f7d46");
    expect(styles.optionBadge.backgroundColor).toBe("#2f7d46");
  });

  test("keeps the Cambridge color palette for KET", () => {
    const styles = createStyles(false, "KET");

    expect(styles.questionNum.backgroundColor).toBe("#0e276f");
    expect(styles.optionBadge.backgroundColor).toBe("#0e276f");
  });
});
