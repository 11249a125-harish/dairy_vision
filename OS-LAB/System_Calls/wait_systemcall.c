#include <stdio.h> 
#include <sys/types.h> 
#include <sys/wait.h> 
#include <unistd.h> 
int main() { 
    pid_t pid = fork(); 
    if (pid == 0) { 
        printf("Child process executing\n"); 
    } else { 
        wait(NULL); 
        printf("Parent process resumes after child\n"); 
    } 
    return 0; 
} 
