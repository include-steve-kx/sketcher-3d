// output a float in range [a, b)
export function randomRangeFloat(a, b) {
  let c;
  if (a > b) {
    c = a;
    a = b;
    b = c;
  }
  return a + Math.random() * (b - a);
}

// output an integer in range [a, b)
export function randomRangeInt(a, b) {
  return Math.floor(randomRangeFloat(a, b));
}