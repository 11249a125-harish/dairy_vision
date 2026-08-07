// 5a stat() System call
#include <stdio.h>
#include <sys/stat.h>
int main() 
{
 struct stat st;
 char fname[50];
 printf("Enter file name: ");
 scanf("%s", fname);
 stat(fname, &st);
 printf("File size: %ld bytes\n", st.st_size);
 printf("Inode number: %ld\n", st.st_ino);
 printf("Permissions: %o\n", st.st_mode);
 return 0;
}                       



