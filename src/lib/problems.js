export const PROBLEMS = [
  {
    id: 'p1',
    language: 'c',
    title: 'Sum of two numbers',
    difficulty: 'easy',
    prompt:
      'Write a program that reads two integers from the input (one per line) and prints their sum.',
    input: '3\n5\n',
    expected: '8\n',
    starterCode: `#include <stdio.h>

int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    // TODO: print the sum of a and b
    return 0;
}
`,
  },
  {
    id: 'p2',
    language: 'c',
    title: 'Even or Odd',
    difficulty: 'easy',
    prompt: 'Read an integer. If it is even print "Even", otherwise print "Odd".',
    input: '7\n',
    expected: 'Odd\n',
    starterCode: `#include <stdio.h>

int main() {
    int n;
    scanf("%d", &n);
    // TODO: print "Even" or "Odd"
    return 0;
}
`,
  },
  {
    id: 'p3',
    language: 'c',
    title: 'Sum 1 to N',
    difficulty: 'medium',
    prompt: 'Read a positive integer N and print the sum of all integers from 1 to N.',
    input: '100\n',
    expected: '5050\n',
    starterCode: `#include <stdio.h>

int main() {
    int n, sum = 0;
    scanf("%d", &n);
    // TODO: compute sum of 1..n
    printf("%d\\n", sum);
    return 0;
}
`,
  },
  {
    id: 'p4',
    language: 'cpp',
    title: 'Greet by Name',
    difficulty: 'easy',
    prompt: 'Read a name (a word) and print "Hello, <name>!" where <name> is the input.',
    input: 'Ana\n',
    expected: 'Hello, Ana!\n',
    starterCode: `#include <iostream>
#include <string>

int main() {
    std::string name;
    std::cin >> name;
    // TODO: print "Hello, <name>!"
    return 0;
}
`,
  },
  {
    id: 'p5',
    language: 'cpp',
    title: 'Largest of three',
    difficulty: 'medium',
    prompt: 'Read three integers and print the largest one.',
    input: '7 3 9\n',
    expected: '9\n',
    starterCode: `#include <iostream>

int main() {
    int a, b, c;
    std::cin >> a >> b >> c;
    // TODO: print the largest
    return 0;
}
`,
  },
  {
    id: 'p6',
    language: 'cpp',
    title: 'Factorial',
    difficulty: 'hard',
    prompt: 'Read a number N (0 <= N <= 12) and print N! (N factorial).',
    input: '5\n',
    expected: '120\n',
    starterCode: `#include <iostream>

int main() {
    int n;
    std::cin >> n;
    // TODO: compute and print n!
    return 0;
}
`,
  },
];
