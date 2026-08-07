// Aim: To find an element using Linear Search

#include<stdio.h>
int main()
{
    int i,n,key,found=0;
    printf("Enter the size of the array:");
    scanf("%d",&n);
    int a[n];
    printf("Enter %d Elements");
    for(int i=0;i<n;i++)
    {
        scanf("%d",&a[i]);
    }
    printf("Enter the element to be searched:",n);
    scanf("%d",&key);
    for(int i=0;i<n;i++)
    {
        if(a[i]==key)
        {
            printf("Element found at index %d",i);
            found=1;
            break;
        }
    }
    if(found==0)
    {
        printf("Invalid input");
    }
    return 0;
}
