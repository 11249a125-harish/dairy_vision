#include <stdio.h> 
int main() { 
    int n, m, i, j, k; 
    int alloc[10][10], max[10][10], need[10][10]; 
    int avail[10], finish[10] = {0}, safeSeq[10]; 
    printf("Enter number of processes: "); 
    scanf("%d", &n); 
 
    printf("Enter number of resources: "); 
    scanf("%d", &m); 
    printf("Enter allocation matrix:\n"); 
    for (i = 0; i < n; i++) 
 
49 | Page 
 
        for (j = 0; j < m; j++) 
            scanf("%d", &alloc[i][j]); 
    printf("Enter maximum matrix:\n"); 
    for (i = 0; i < n; i++) 
        for (j = 0; j < m; j++) 
            scanf("%d", &max[i][j]); 
    printf("Enter available resources:\n"); 
    for (i = 0; i < m; i++) 
        scanf("%d", &avail[i]); 
    for (i = 0; i < n; i++) 
        for (j = 0; j < m; j++) 
            need[i][j] = max[i][j] - alloc[i][j]; 
    for (k = 0; k < n; k++) { 
        for (i = 0; i < n; i++) { 
            if (!finish[i]) { 
                int flag = 1; 
                for (j = 0; j < m; j++) { 
                    if (need[i][j] > avail[j]) { 
                        flag = 0; 
                        break; 
                    } 
                } 
                if (flag) { 
                    for (j = 0; j < m; j++) 
                        avail[j] += alloc[i][j]; 
                    safeSeq[k] = i; 
                    finish[i] = 1; 
                } 
            } 
        } 
    } 
    int safe = 1; 
    for (i = 0; i < n; i++) { 
        if (!finish[i]) { 
            safe = 0; 
 
50 | Page 
 
            break; 
        } 
    } 
    if (safe) { 
        printf("\nSystem is in SAFE state.\nSafe sequence: "); 
        for (i = 0; i < n; i++) 
            printf("P%d ", safeSeq[i]); 
    } else { 
        printf("\nSystem is in DEADLOCK state.\n"); 
    } 
    return 0; 
}