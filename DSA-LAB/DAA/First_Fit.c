//Aim: To implement the First Fit Algorithm for the Bin Packing problem using C Program
#include<stdio.h>
void firstfit(int items[],int n,int c)
{
int bin[n];
int bincount=0;
for(int i=0;i<n;i++)
bin[i]=c;
for(int i=0;i<n;i++)
{
int placed=0;
for(int j=0;j<bincount;j++)
{
if(bin[j]>=items[i])
{
bin[j]-=items[i];
printf("item %d placed in bin %d\n",items[i],j+1);
placed=1;
break;
}
}
if(!placed)
{
bin[bincount]-=items[i];
printf("item %d placed in bin %d\n",items[i],bincount+1);
bincount++;
}
}
printf("total bins used =%d\n",bincount);
}

int main()
{
int n,c;
printf("enter number of items: ");
scanf("%d",&n);
int items[n];
printf("enter item size:\n");
for(int i=0;i<n;i++)
{
printf("item %d:",i+1);
scanf("%d",&items[i]);
}
printf("enter bin capacity: ");
scanf("%d",&c);
firstfit(items,n,c);
return 0;
}