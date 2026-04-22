// ============================================================
// CODE TEMPLATES — Educational C examples for each compiler phase
// ============================================================

const codeTemplates = [
  // === BASICS ===
  {
    id: 'hello-world',
    title: 'Hello World',
    category: 'Basics',
    icon: '👋',
    description: 'The simplest C program — prints a message to the screen.',
    lookFor: 'Notice how the lexer breaks the string literal and preprocessor directive into tokens.',
    code: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`
  },
  {
    id: 'variables-types',
    title: 'Variables & Types',
    category: 'Basics',
    icon: '📦',
    description: 'Demonstrates different data types and variable declarations.',
    lookFor: 'Check the Semantic tab — see how the symbol table tracks each variable\'s type and scope.',
    code: `#include <stdio.h>

int main() {
    int age = 25;
    float height = 5.9;
    char grade = 'A';
    
    int sum = age + 10;
    float product = height * 2.0;
    
    printf("Age: %d\\n", age);
    printf("Height: %.1f\\n", height);
    printf("Grade: %c\\n", grade);
    printf("Sum: %d, Product: %.1f\\n", sum, product);
    
    return 0;
}`
  },
  {
    id: 'arithmetic',
    title: 'Arithmetic Expressions',
    category: 'Basics',
    icon: '🔢',
    description: 'Shows how the parser builds expression trees with operator precedence.',
    lookFor: 'Look at the AST — see how multiplication binds tighter than addition, forming deeper subtrees.',
    code: `#include <stdio.h>

int main() {
    int a = 10;
    int b = 3;
    
    int sum = a + b;
    int diff = a - b;
    int product = a * b;
    int quotient = a / b;
    int remainder = a % b;
    
    // Precedence: * before +
    int complex = a + b * 2 - 1;
    
    printf("Sum: %d\\n", sum);
    printf("Diff: %d\\n", diff);
    printf("Product: %d\\n", product);
    printf("Quotient: %d\\n", quotient);
    printf("Remainder: %d\\n", remainder);
    printf("Complex: %d\\n", complex);
    
    return 0;
}`
  },

  // === CONTROL FLOW ===
  {
    id: 'if-else',
    title: 'If-Else Branching',
    category: 'Control Flow',
    icon: '🔀',
    description: 'Conditional branching — see how the compiler generates jump instructions.',
    lookFor: 'In IR Code, notice the conditional jumps (if...goto) and labels. The CFG shows the two branches clearly.',
    code: `#include <stdio.h>

int main() {
    int score = 85;
    
    if (score >= 90) {
        printf("Grade: A\\n");
    } else if (score >= 80) {
        printf("Grade: B\\n");
    } else if (score >= 70) {
        printf("Grade: C\\n");
    } else {
        printf("Grade: F\\n");
    }
    
    return 0;
}`
  },
  {
    id: 'for-loop',
    title: 'For Loop',
    category: 'Control Flow',
    icon: '🔄',
    description: 'Counted loop — see how the compiler breaks it into init, condition, body, and update.',
    lookFor: 'The IR shows the loop as labels and gotos. Notice the back-edge that jumps back to the condition check.',
    code: `#include <stdio.h>

int main() {
    int sum = 0;
    
    for (int i = 1; i <= 10; i++) {
        sum += i;
        printf("i=%d, sum=%d\\n", i, sum);
    }
    
    printf("Total: %d\\n", sum);
    return 0;
}`
  },
  {
    id: 'while-loop',
    title: 'While Loop',
    category: 'Control Flow',
    icon: '🔁',
    description: 'Condition-first loop — executes while condition remains true.',
    lookFor: 'Compare the IR output with the for-loop version — they generate very similar three-address code.',
    code: `#include <stdio.h>

int main() {
    int n = 5;
    int factorial = 1;
    
    while (n > 1) {
        factorial *= n;
        n--;
    }
    
    printf("Factorial: %d\\n", factorial);
    return 0;
}`
  },
  {
    id: 'nested-loops',
    title: 'Nested Loops',
    category: 'Control Flow',
    icon: '🌀',
    description: 'Loop inside a loop — notice how labels and jumps multiply in the IR.',
    lookFor: 'The CFG becomes much more complex with nested loops. Each loop adds its own back-edge.',
    code: `#include <stdio.h>

int main() {
    for (int i = 1; i <= 5; i++) {
        for (int j = 1; j <= i; j++) {
            printf("* ");
        }
        printf("\\n");
    }
    return 0;
}`
  },

  // === FUNCTIONS ===
  {
    id: 'functions',
    title: 'Function Calls',
    category: 'Functions',
    icon: '📞',
    description: 'Multiple functions — see how the compiler handles call/return.',
    lookFor: 'Each function gets its own func_begin/func_end in IR. Arguments are pushed onto a virtual stack.',
    code: `#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int multiply(int x, int y) {
    int result = x * y;
    return result;
}

int main() {
    int sum = add(5, 3);
    int product = multiply(4, 7);
    int combined = add(sum, product);
    
    printf("Sum: %d\\n", sum);
    printf("Product: %d\\n", product);
    printf("Combined: %d\\n", combined);
    
    return 0;
}`
  },
  {
    id: 'recursion',
    title: 'Recursion (Fibonacci)',
    category: 'Functions',
    icon: '🌊',
    description: 'Recursive function — each call creates a new stack frame.',
    lookFor: 'The AST shows the function calling itself. The IR reveals the recursive call pattern.',
    code: `#include <stdio.h>

int fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    for (int i = 0; i < 10; i++) {
        printf("fib(%d) = %d\\n", i, fibonacci(i));
    }
    return 0;
}`
  },

  // === OPTIMIZATION ===
  {
    id: 'constant-folding',
    title: 'Constant Folding',
    category: 'Optimization',
    icon: '🧮',
    description: 'The compiler evaluates constant expressions at compile time.',
    lookFor: 'Check the Optimize tab — expressions like 2*3+4 are replaced with their computed value.',
    code: `#include <stdio.h>

int main() {
    // These can be computed at compile time
    int a = 2 + 3;
    int b = 10 * 4;
    int c = 100 / 5;
    int d = a + b;
    
    // This involves a variable, so it can't be folded
    int x = 7;
    int y = x + 3;
    
    printf("a=%d, b=%d, c=%d, d=%d\\n", a, b, c, d);
    printf("y=%d\\n", y);
    
    return 0;
}`
  },
  {
    id: 'dead-code',
    title: 'Dead Code Elimination',
    category: 'Optimization',
    icon: '💀',
    description: 'Variables declared but never used — the optimizer removes them.',
    lookFor: 'The Optimize tab shows which variables are eliminated. Compare Original vs Optimized IR counts.',
    code: `#include <stdio.h>

int main() {
    int used = 42;
    int unused1 = 100;    // Dead code — never read
    int unused2 = 200;    // Dead code — never read
    int result = used + 8;
    int waste = 999;      // Dead code — never read
    
    printf("Result: %d\\n", result);
    
    return 0;
}`
  },
  {
    id: 'strength-reduction',
    title: 'Strength Reduction',
    category: 'Optimization',
    icon: '💪',
    description: 'Replace expensive operations (multiply/divide) with cheaper ones (bit shifts).',
    lookFor: 'Multiplications by powers of 2 become left shifts. Division by 2 becomes right shift.',
    code: `#include <stdio.h>

int main() {
    int x = 10;
    
    // These multiplications can be replaced with shifts
    int a = x * 2;    // x << 1
    int b = x * 4;    // x << 2
    int c = x * 8;    // x << 3
    int d = x * 16;   // x << 4
    
    // This division can be replaced with a shift
    int e = x / 2;    // x >> 1
    
    // This cannot be strength-reduced (not power of 2)
    int f = x * 3;
    
    printf("%d %d %d %d %d %d\\n", a, b, c, d, e, f);
    
    return 0;
}`
  },
];

export const CATEGORIES = [
  { id: 'Basics', icon: '📘', label: 'Basics' },
  { id: 'Control Flow', icon: '🔀', label: 'Control Flow' },
  { id: 'Functions', icon: '⚡', label: 'Functions' },
  { id: 'Optimization', icon: '🚀', label: 'Optimization' },
];

export default codeTemplates;
