export const formatTime = (value) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

export const formatDate = (value) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

export const getInitials = (value) => {
  if (!value) {
    return "PC";
  }

  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

export const relativePresence = (isOnline, lastSeenAt) => {
  if (isOnline) {
    return "Active now";
  }

  if (!lastSeenAt) {
    return "Offline";
  }

  const minutes = Math.max(
    1,
    Math.round((Date.now() - new Date(lastSeenAt).getTime()) / 60000),
  );

  if (minutes < 60) {
    return `Last seen ${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `Last seen ${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `Last seen ${days}d ago`;
};
