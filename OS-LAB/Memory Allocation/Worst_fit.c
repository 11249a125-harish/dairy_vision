#include <stdio.h> 
int main() { 
    int nb, np, i, j; 
    int block[10], process[10], alloc[10]; 
    printf("Enter number of blocks: "); 
    scanf("%d", &nb); 
    printf("Enter block sizes:\n"); 
    for (i = 0; i < nb; i++) 
        scanf("%d", &block[i]); 
    printf("Enter number of processes: "); 
    scanf("%d", &np); 
    printf("Enter process sizes:\n"); 
    for (i = 0; i < np; i++) { 
        scanf("%d", &process[i]); 
        alloc[i] = -1; 
    } 
    for (i = 0; i < np; i++) { 
        int worst = -1; 
        for (j = 0; j < nb; j++) { 
            if (block[j] >= process[i]) { 
                if (worst == -1 || block[j] > block[worst]) 
                    worst = j; 
            } 
        } 
 
58 | Page 
 
        if (worst != -1) { 
            alloc[i] = worst; 
            block[worst] -= process[i]; 
        } 
    } 
    printf("\nProcess\tSize\tBlock\n"); 
    for (i = 0; i < np; i++) { 
        printf("P%d\t%d\t", i+1, process[i]); 
        if (alloc[i] != -1) 
            printf("B%d\n", alloc[i]+1); 
        else 
            printf("Not Allocated\n"); 
    } 
    return 0; 
}