function flattenDetail(detail: unknown): string | null {
  if (!detail) return null;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => flattenDetail(item))
      .filter((item): item is string => Boolean(item));
    return messages.length ? messages.join(" · ") : null;
  }

  if (typeof detail === "object") {
    const record = detail as Record<string, unknown>;

    if (typeof record.msg === "string") {
      return record.msg;
    }

    if (typeof record.message === "string") {
      return record.message;
    }

    const nestedMessages = Object.values(record)
      .map((value) => flattenDetail(value))
      .filter((value): value is string => Boolean(value));

    return nestedMessages.length ? nestedMessages.join(" · ") : null;
  }

  return null;
}


export function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const detail = flattenDetail((payload as { detail?: unknown }).detail);
  if (detail) {
    return detail;
  }

  const message = flattenDetail((payload as { message?: unknown }).message);
  return message || fallback;
}
