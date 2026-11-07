const jsonFieldGetter = (field, expectedType) => function getJsonField() {
  const stored = this.getDataValue(field);
  if (stored == null) return stored;

  let value = stored;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch (error) {
      throw new Error(`Invalid JSON in ${this.constructor.name}.${field}: ${error.message}`);
    }
  }

  const valid = expectedType === "array"
    ? Array.isArray(value)
    : value !== null && typeof value === "object" && !Array.isArray(value);
  if (!valid) {
    throw new Error(`Invalid ${this.constructor.name}.${field}: expected ${expectedType}.`);
  }
  return value;
};

module.exports = { jsonFieldGetter };
