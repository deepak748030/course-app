/** Minimal react-native stub for selfcheck runs outside the app runtime. */
export const Platform = { OS: 'web', select: <T,>(value: { web?: T; default?: T }) => value.web ?? value.default };
