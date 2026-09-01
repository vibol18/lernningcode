export const SAMPLES = {
    c: {
        hello: {
            name: 'Hello, World!',
            code: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    printf("Welcome to learning C!\\n");
    return 0;
}
`,
        },
        variables: {
            name: 'Variables & data types',
            code: `#include <stdio.h>

int main() {
    int age = 20;
    float height = 1.75f;
    char grade = 'A';
    char name[] = "Vibol";

    printf("Name: %s\\n", name);
    printf("Age: %d, Grade: %c, Height: %.2f\\n", age, grade, height);
    return 0;
}
`,
        },
        input: {
            name: 'Input / output (scanf)',
            code: `#include <stdio.h>

int main() {
    int age;
    char name[50];

    printf("Enter your name: ");
    scanf("%s", name);
    printf("Enter your age: ");
    scanf("%d", &age);

    printf("Hello %s, you are %d years old.\\n", name, age);
    return 0;
}
`,
        },
        operators: {
            name: 'Operators',
            code: `#include <stdio.h>

int main() {
    int a = 10, b = 3;
    printf("a + b = %d\\n", a + b);
    printf("a - b = %d\\n", a - b);
    printf("a * b = %d\\n", a * b);
    printf("a / b = %d (integer division)\\n", a / b);
    printf("a %% b = %d (remainder)\\n", a % b);
    return 0;
}
`,
        },
        ifelse: {
            name: 'if / else',
            code: `#include <stdio.h>

int main() {
    int score;
    printf("Enter score: ");
    scanf("%d", &score);

    if (score >= 90) printf("Grade: A\\n");
    else if (score >= 80) printf("Grade: B\\n");
    else if (score >= 70) printf("Grade: C\\n");
    else printf("Grade: F\\n");
    return 0;
}
`,
        },
        switch: {
            name: 'switch',
            code: `#include <stdio.h>

int main() {
    int day;
    printf("Enter day number (1-7): ");
    scanf("%d", &day);

    switch (day) {
        case 1: printf("Monday\\n"); break;
        case 2: printf("Tuesday\\n"); break;
        case 3: printf("Wednesday\\n"); break;
        default: printf("Another day\\n");
    }
    return 0;
}
`,
        },
        loops: {
            name: 'Loops',
            code: `#include <stdio.h>

int main() {
    printf("For loop:\\n");
    for (int i = 1; i <= 5; i++) printf("%d ", i);

    printf("\\nWhile loop:\\n");
    int j = 1;
    while (j <= 5) { printf("%d ", j); j++; }

    printf("\\nDo-while loop:\\n");
    int k = 1;
    do { printf("%d ", k); k++; } while (k <= 5);
    printf("\\n");
    return 0;
}
`,
        },
        arrays: {
            name: 'Arrays',
            code: `#include <stdio.h>

int main() {
    int nums[5] = {10, 20, 30, 40, 50};
    int sum = 0;

    for (int i = 0; i < 5; i++) sum += nums[i];

    printf("Sum: %d, Average: %.1f\\n", sum, sum / 5.0);
    return 0;
}
`,
        },
        strings: {
            name: 'Strings (char arrays)',
            code: `#include <stdio.h>
#include <string.h>

int main() {
    char first[50], last[50];
    printf("Enter first name: ");
    scanf("%s", first);
    printf("Enter last name: ");
    scanf("%s", last);

    char full[100];
    strcpy(full, first);
    strcat(full, " ");
    strcat(full, last);
    printf("Full name: %s (length %lu)\\n", full, strlen(full));
    return 0;
}
`,
        },
        functions: {
            name: 'Functions',
            code: `#include <stdio.h>

int add(int a, int b) { return a + b; }
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    printf("3 + 4 = %d\\n", add(3, 4));
    printf("5! = %d\\n", factorial(5));
    return 0;
}
`,
        },
        pointers: {
            name: 'Pointers',
            code: `#include <stdio.h>

int main() {
    int value = 42;
    int *ptr = &value;

    printf("value: %d\\n", value);
    printf("address: %p\\n", (void*)ptr);
    printf("dereferenced *ptr: %d\\n", *ptr);

    *ptr = 100;  // change via pointer
    printf("after *ptr = 100, value: %d\\n", value);
    return 0;
}
`,
        },
        structs: {
            name: 'Structs',
            code: `#include <stdio.h>
#include <string.h>

typedef struct {
    char name[50];
    int age;
} Student;

int main() {
    Student s;
    strcpy(s.name, "Vibol");
    s.age = 20;
    printf("Student: %s, age %d\\n", s.name, s.age);
    return 0;
}
`,
        },
        loop: {
            name: 'Loop example',
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
        segfault: {
            name: 'Bug: segmentation fault',
            code: `#include <stdio.h>

int main() {
    // This tries to write to an invalid memory location.
    int *ptr = NULL;
    *ptr = 42;
    printf("This line is never reached\\n");
    return 0;
}
`,
        },
        infinite: {
            name: 'Bug: infinite loop',
            code: `#include <stdio.h>

int main() {
    int i = 0;
    while (1) {
        i++;
    }
    return 0;
}
`,
        },
    },
    cpp: {
        hello: {
            name: 'Hello, World!',
            code: `#include <iostream>
using namespace std;
int main() {
    cout << "Hello, World!" <<endl;
    cout << "Welcome to learning C++!" <<endl;
    return 0;
}
`,
        },
        io: {
            name: 'Input / output (cin/cout)',
            code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    int age;
    string name;

    cout << "Enter your name: ";
    getline(cin, name);
    cout << "Enter your age: ";
    cin >> age;

    cout << "Hello " << name << ", you are " << age << " years old." << endl;
    return 0;
}
`,
        },
        vectors: {
            name: 'STL vector',
            code: `#include <iostream>
#include <vector>
#include <numeric>
using namespace std;

int main() {
    vector<int> nums = {5, 3, 8, 1};
    int sum = accumulate(nums.begin(), nums.end(), 0);
    double avg = (double)sum / nums.size();
    cout << "Sum: " << sum << ", Average: " << avg << endl;

    nums.push_back(100);
    cout << "After push_back, size = " << nums.size() << endl;
    return 0;
}
`,
        },
        map: {
            name: 'STL map',
            code: `#include <iostream>
#include <map>
using namespace std;

int main() {
    map<string, int> grades;
    grades["Alice"] = 90;
    grades["Bob"] = 85;
    grades["Carol"] = 95;

    for (const auto& pair : grades) {
        cout << pair.first << ": " << pair.second << endl;
    }
    return 0;
}
`,
        },
        classes: {
            name: 'Simple class',
            code: `#include <iostream>

class Animal {
public:
    Animal(const std::string& name) : name_(name) {}
    virtual void speak() const {
        std::cout << name_ << " makes a sound." << std::endl;
    }
protected:
    std::string name_;
};

class Dog : public Animal {
public:
    Dog(const std::string& name) : Animal(name) {}
    void speak() const override {
        std::cout << name_ << " says Woof!" << std::endl;
    }
};

int main() {
    Dog dog("Rex");
    dog.speak();
    return 0;
}
`,
        },
        inheritance: {
            name: 'Inheritance & polymorphism',
            code: `#include <iostream>
#include <vector>
using namespace std;

class Shape {
public:
    virtual double area() const = 0;   // pure virtual
    virtual ~Shape() = default;
    virtual void describe() const { cout << "A shape" << endl; }
};

class Circle : public Shape {
    double r;
public:
    Circle(double radius) : r(radius) {}
    double area() const override { return 3.14159 * r * r; }
    void describe() const override { cout << "Circle, r=" << r << endl; }
};

class Rectangle : public Shape {
    double w, h;
public:
    Rectangle(double w_, double h_) : w(w_), h(h_) {}
    double area() const override { return w * h; }
    void describe() const override { cout << "Rectangle " << w << "x" << h << endl; }
};

int main() {
    vector<Shape*> shapes;
    shapes.push_back(new Circle(2.0));
    shapes.push_back(new Rectangle(3.0, 4.0));
    for (Shape* s : shapes) {
        s->describe();
        cout << "  area = " << s->area() << endl;
        delete s;
    }
    return 0;
}
`,
        },
        string: {
            name: 'std::string',
            code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s1 = "Hello";
    string s2 = "World";
    string s3 = s1 + ", " + s2 + "!";
    cout << s3 << endl;
    cout << "Length: " << s3.length() << endl;
    cout << "First char: " << s3[0] << endl;
    cout << "Substring: " << s3.substr(7, 5) << endl;
    return 0;
}
`,
        },
        vector: {
            name: 'STL vector (legacy)',
            code: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> nums = {5, 3, 8, 1, 9, 2};
    std::sort(nums.begin(), nums.end());
    std::cout << "Sorted:";
    for (int n : nums) {
        std::cout << " " << n;
    }
    std::cout << std::endl;
    return 0;
}
`,
        },
    },
};

export const DEFAULT_CODE = SAMPLES.c.hello.code;
