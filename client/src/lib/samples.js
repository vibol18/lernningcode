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

int main() {
    std::cout << "Hello, World!" << std::endl;
    std::cout << "Welcome to learning C++!" << std::endl;
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
    vector: {
      name: 'STL vector',
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
