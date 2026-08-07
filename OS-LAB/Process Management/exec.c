#include <stdio.h> 
#include <unistd.h> 
#include <sys/wait.h> 
int main() { 
    pid_t pid; 
    pid = fork(); 
    if (pid == 0) { 
        execl("/bin/ls", "ls", NULL); 
        printf("Exec failed\n"); 
    } else { 
        wait(NULL); 
        printf("Parent process completed\n"); 
    } 
    return 0; 
} 
 
