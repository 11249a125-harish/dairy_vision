// Aim: To reverse a string using stack operations

#include <stdio.h>
#include <string.h>

int top = -1;
int size;
char stack[50];

void push(char item) {
    if (top == size - 1) {
        printf("Stack overflow\n");
    } else {
        top++;
        stack[top] = item;
    }
}

char pop() {
    if (top == -1) {
        printf("Stack underflow\n");
        return '\0';
    } else {
        return stack[top--];
    }
}

int main() {
    printf("Enter the string to reverse: ");
    char input[50];
    scanf("%s", input);

    size = strlen(input);

    for (int i = 0; i < size; i++) {
        push(input[i]);
    }

    printf("Reversed string is:\n");
    for (int i = 0; i < size; i++) {
        printf("%c", pop());
    }

    printf("\n");
    return 0;
}
