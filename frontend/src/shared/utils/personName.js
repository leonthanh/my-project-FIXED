const isWordSeparator = (value) => value === "-" || value === "'";

const capitalizeNameToken = (token, locale) => {
  const normalizedToken = String(token || "");
  if (!normalizedToken) return "";

  const lowerToken = normalizedToken.toLocaleLowerCase(locale);
  let output = "";
  let shouldUppercaseNext = true;

  for (const char of lowerToken) {
    if (isWordSeparator(char)) {
      output += char;
      shouldUppercaseNext = true;
      continue;
    }

    if (shouldUppercaseNext) {
      output += char.toLocaleUpperCase(locale);
      shouldUppercaseNext = false;
      continue;
    }

    output += char;
  }

  return output;
};

const formatStudentDisplayName = (value, fallback = "N/A") => {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  if (/^n\/a$/i.test(raw)) return "N/A";

  const locale = "vi-VN";
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (!tokens.length) return fallback;

  return tokens.map((token) => capitalizeNameToken(token, locale)).join(" ");
};

export { formatStudentDisplayName };
