//AIM: To implement fibonacci Series using Iterative method
#include<stdio.h>
int main()
{
  int n,i;
  int a=0,b=1,c;
  printf("Enter the no of Terms:");
  scanf("%d",&n);
  printf("Fibonacci Series Using Iterative Method:\n");
  for(int i=1;i<=n;i++)
  {
    printf("%d\n",a);
    c=a+b;
    a=b;
    b=c;
  }
return 0;
}
//AIM: To implement Fibonacci Series Using Recursive Method
#include<stdio.h>
int fibonacci(int n)
{
  if(n==0)
    return 0;
  else if(n==1)
    return 1;
  else
    return fibonacci(n-1)+fibonacci(n-2);
}
int main()
{
  int n,i;
  printf("Enter the no of terms: ");
  scanf("%d",&n);
  printf("Fibonacci Series Using Recursive Method:\n");
  for(int i=0;i<n;i++)
  {
     printf("%d\n",fibonacci(i));
  }
return 0;
}
