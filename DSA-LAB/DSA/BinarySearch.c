/* Aim:  To find an element using Binary Search */
#include <stdio.h>

int main() {
    int n, key, low, high, mid;
    
    printf("Enter the size of the array: ");
    scanf("%d", &n);

    int a[n];
    printf("Enter %d sorted elements: ", n);
    for(int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
    }

    printf("Enter the element to search: ");
    scanf("%d", &key);

    low = 0;
    high = n - 1;

    int found = 0;
    while(low <= high) {
        mid = (low + high) / 2;

        if(a[mid] == key) {
            printf("Element %d found at position %d.\n", key, mid + 1);
            found = 1;
            break;
        } 
        else if(a[mid] < key) {
            low = mid + 1;
        } 
        else {
            high = mid - 1;
        }
    }

    if(!found)
        printf("Element %d not found in the array.\n", key);

    return 0;
}
