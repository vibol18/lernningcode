export const QUIZZES = [
  {
    id: 'q1',
    language: 'c',
    title: 'C Basics Quiz',
    questions: [
      {
        q: 'Which function is the entry point of every C program?',
        options: ['void()', 'main()', 'start()', 'run()'],
        answer: 1,
      },
      {
        q: 'Which header gives you printf and scanf?',
        options: ['#include <iostream>', '#include <math.h>', '#include <stdio.h>', '#include <string.h>'],
        answer: 2,
      },
      {
        q: 'What does %d read/write?',
        options: ['a float', 'an integer', 'a character', 'a string'],
        answer: 1,
      },
      {
        q: 'What is the result of 10 % 3?',
        options: ['3', '1', '0', '3.33'],
        answer: 1,
      },
      {
        q: 'Which loop runs at least once?',
        options: ['for', 'while', 'do-while', 'repeat'],
        answer: 2,
      },
    ],
  },
  {
    id: 'q2',
    language: 'cpp',
    title: 'C++ Basics Quiz',
    questions: [
      {
        q: 'How do you print in C++?',
        options: ['printf(...)', 'std::cout << ...', 'System.out.print(...)', 'console.log(...)'],
        answer: 1,
      },
      {
        q: 'Which type is best for a whole number?',
        options: ['double', 'std::string', 'int', 'bool'],
        answer: 2,
      },
      {
        q: 'What header defines std::string?',
        options: ['<iostream>', '<string>', '<vector>', '<cstdio>'],
        answer: 1,
      },
      {
        q: 'A class is a ...?',
        options: ['variable', 'function', 'blueprint for objects', 'loop'],
        answer: 2,
      },
      {
        q: 'Which keyword starts an object-oriented class?',
        options: ['class', 'struct only', 'object', 'template'],
        answer: 0,
      },
    ],
  },
];
