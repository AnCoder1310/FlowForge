export function initials(name) {
  return (name || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(-2)
    .toUpperCase();
}

export function roleUi(role) {
  if (role === "ADMIN") return "Administrator";
  if (role === "OPERATOR") return "Operations Lead";
  if (role === "DEVELOPER") return "Workflow Developer";
  return "Platform Observer";
}

export const dmy = (iso) => (iso || "").split("-").reverse().join("/");
