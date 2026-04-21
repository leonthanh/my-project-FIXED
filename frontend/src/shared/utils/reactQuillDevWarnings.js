const installFlag = "__stareduReactQuillDevWarningFilterInstalled__";

function shouldSuppressReactQuillDevWarning(args) {
  const message = args.map((value) => String(value ?? "")).join(" ");
  if (!message.includes("findDOMNode is deprecated")) return false;
  return /ReactQuill|ReactQuill2|react-quill/i.test(message);
}

function wrapConsoleMethod(methodName) {
  const originalMethod = console[methodName];
  if (typeof originalMethod !== "function") return;

  const boundOriginal = originalMethod.bind(console);
  console[methodName] = (...args) => {
    if (shouldSuppressReactQuillDevWarning(args)) return;
    boundOriginal(...args);
  };
}

function installReactQuillDevWarningFilter() {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  if (window[installFlag]) return;

  wrapConsoleMethod("warn");
  wrapConsoleMethod("error");
  window[installFlag] = true;
}

export { installReactQuillDevWarningFilter, shouldSuppressReactQuillDevWarning };