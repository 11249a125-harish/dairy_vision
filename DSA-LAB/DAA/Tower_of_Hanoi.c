//Aim: To Implement tower of hanoi using c program
#include<stdio.h>
void tower(int n,char s,char d,char t)
{
if(n==1)
{
    printf("Move disk %d from %c to %c \n",n,s,d);
    return;
}
    tower(n-1,'s','t','d');
    printf("Move disk %d from %c to %c \n",n,s,d);
    tower(n-1,'t','d','s');
}
int main()
{
    int disk_count;
    printf("Enter the no of disks:");
    scanf("%d",&disk_count);
    printf("\n Required Moves!!");
    tower(disk_count,'s','d','t');
}
