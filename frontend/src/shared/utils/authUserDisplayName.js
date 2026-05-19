const readStoredAuthUser = () => {
  if (typeof window === "undefined") return null;

  const raw =
    window.localStorage.getItem("user") ??
    window.sessionStorage.getItem("user") ??
    null;

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_error) {
    window.localStorage.removeItem("user");
    window.sessionStorage.removeItem("user");
    return null;
  }
};

const resolveAuthUserDisplayName = (user) =>
  String(user?.name || user?.username || user?.fullName || "").trim();

export { readStoredAuthUser };
export default resolveAuthUserDisplayName;