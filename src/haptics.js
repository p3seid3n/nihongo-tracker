export function haptic(kind = "tap") {
  if (!("vibrate" in navigator)) return;
  try {
    const patterns = { tap: 10, success: [15, 40, 15], error: [30, 60, 30], select: 8 };
    navigator.vibrate(patterns[kind] ?? 10);
  } catch (e) { /* ignore */ }
}
