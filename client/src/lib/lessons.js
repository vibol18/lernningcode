export const LESSONS = [
  {
    id: 'l1',
    language: 'c',
    title: 'C: Hello, World!',
    body: [
      'Every C program starts in a function called main(). The #include <stdio.h> line gives us access to input/output functions like printf.',
      'printf("Hello, World!\\n"); prints text to the screen. The \\n adds a new line.',
      'Press "Run code" to see the output. Try editing the text inside the quotes.',
    ],
    code: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    printf("I am learning C!\\n");
    return 0;
}
`,
  },
  {
    id: 'l2',
    language: 'c',
    title: 'C: Variables & Math',
    body: [
      'A variable stores a value. In C you must declare a type: int for whole numbers, float/double for decimals, char for one character.',
      'You can do math with +, -, *, and /. Use % to get the remainder.',
      'Try changing the values and rerunning.',
    ],
    code: `#include <stdio.h>

int main() {
    int a = 10;
    int b = 3;
    printf("a + b = %d\\n", a + b);
    printf("a - b = %d\\n", a - b);
    printf("a * b = %d\\n", a * b);
    printf("a / b = %d (integer division)\\n", a / b);
    printf("a %% b = %d\\n", a % b);
    return 0;
}
`,
  },
  {
    id: 'l3',
    language: 'c',
    title: 'C: If / Else',
    body: [
      'Conditionals let your program make decisions. if (condition) runs a block when the condition is true, else runs otherwise.',
      'Common operators: == (equal), != (not equal), <, >, <=, >=, && (and), || (or).',
    ],
    code: `#include <stdio.h>

int main() {
    int age = 17;
    if (age >= 18) {
        printf("You are an adult.\\n");
    } else {
        printf("You are a minor.\\n");
    }
    return 0;
}
`,
  },
  {
    id: 'l4',
    language: 'c',
    title: 'C: Loops',
    body: [
      'Loops repeat code. A for loop repeats a known number of times; a while loop repeats while a condition is true.',
      'This loop adds the numbers 1 through 10.',
    ],
    code: `#include <stdio.h>

int main() {
    int sum = 0;
    for (int i = 1; i <= 10; i++) {
        sum += i;
    }
    printf("Sum of 1..10 = %d\\n", sum);
    return 0;
}
`,
  },
  {
    id: 'l5',
    language: 'c',
    title: 'C: Reading Input',
    body: [
      'Use scanf() to read input from the user. %d reads an integer, %f a float, %c a character.',
      'The & before the variable tells scanf where to store the value. Enter text in the Input box before running.',
    ],
    code: `#include <stdio.h>

int main() {
    int number;
    printf("Enter a number: ");
    scanf("%d", &number);
    printf("You entered: %d\\n", number);
    return 0;
}
`,
  },
  {
    id: 'l6',
    language: 'cpp',
    title: 'C++: Hello, World!',
    body: [
      'C++ uses cout to print and cin to read, with << and >> operators. iostream gives us these.',
      'std::endl ends a line (same as a newline).',
    ],
    code: `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`,
  },
  {
    id: 'l7',
    language: 'cpp',
    title: 'C++: Variables & Types',
    body: [
      'C++ has int, double, char, bool, and std::string (from <string>). Auto can infer the type.',
      'Strings are easy with + for concatenation.',
    ],
    code: `#include <iostream>
#include <string>

int main() {
    int age = 20;
    double price = 19.99;
    std::string name = "Alex";
    std::cout << name << " is " << age << " years old." << std::endl;
    std::cout << "Price: " << price << std::endl;
    return 0;
}
`,
  },
  {
    id: 'l8',
    language: 'cpp',
    title: 'C++: Classes & Objects',
    body: [
      'A class is a blueprint for objects. It groups data (members) and functions (methods).',
      'This example defines an Animal class and a Dog subclass that overrides speak().',
    ],
    code: `#include <iostream>
#include <string>

class Dog {
public:
    std::string name;
    void speak() {
        std::cout << name << " says Woof!" << std::endl;
    }
};

int main() {
    Dog rex;
    rex.name = "Rex";
    rex.speak();
    return 0;
}
`,
  },
];
