export default function normalizeClassNames(
  ...classNames: Array<typeof undefined | boolean | null | string>
): Array<string> {
  const rval: Array<string> = [];
  for (const className of classNames) {
    if (className && typeof className === 'string') {
      for (const [s] of className.matchAll(/\S+/g)) {
        rval.push(s);
      }
    }
  }
  return rval;
}
