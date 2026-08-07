#include <stdio.h>

int main() {
    int max;
    int choice, item;

    printf("Enter the size of the Stack:\n");
    scanf("%d", &max);

    int stack[max], top = -1;

    while (1) {
        printf("\n\n1. PUSH\n2. POP\n3. EXIT\n");
        printf("Choose the operation to be performed: ");
        scanf("%d", &choice);

        switch (choice) {
            case 1:
                if (top == max - 1) {
                    printf("Stack Overflow!\n");
                } else {
                    printf("Enter the element to be pushed: ");
                    scanf("%d", &item);
                    stack[++top] = item; // increment first, then assign
                    printf("Item %d has been pushed into the stack.\n", item);
                }
                break;

            case 2:
                if (top == -1) {
                    printf("Stack Underflow!\n");
                } else {
                    item = stack[top--]; // assign first, then decrement
                    printf("Item %d has been popped out of the stack.\n", item);
                }
                break;

            case 3:
                printf("Exiting Stack Program.\n");
                return 0;

            default:
                printf("Invalid choice! Please try again.\n");
        }
    }

    return 0;
}
