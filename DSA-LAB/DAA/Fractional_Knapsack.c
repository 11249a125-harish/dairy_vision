//AIM: Implementation of Fractional knapsack
#include<stdio.h>
struct Item
{
    int weight;
    int profit;
    float ppw;
  };
void sort(struct Item items[],int n)
{
  struct Item temp;
  for(int i=0;i<n-1;i++)
  {
    for(int j=0;j<n-i-1;j++)
    {
      if(items[j].ppw<items[j+1].ppw)
      {
         temp=items[j];
         items[j]=items[j+1];
         items[j+1]=temp;
      }
    }
  }
}
int main()
{
  int n,capacity;
  printf("Enter number of items:");
  scanf("%d",&n);
  printf("Enter capacity:");
  scanf("%d",&capacity);
  struct Item items[n];
  printf("Enter weight and Profit of items:\n");
  for(int i=0;i<n;i++)
  {
    scanf("%d %d",&items[i].weight,&items[i].profit);
    items[i].ppw=(float)items[i].profit/items[i].weight;
  }
sort(items,n);
float totalprofit=0;
for(int i=0;i<n;i++)
{
if(items[i].weight<=capacity)
{
capacity-=items[i].weight;
totalprofit+=items[i].profit;
}else{
totalprofit+=items[i].ppw*capacity;
break;
}
}
printf("Total profit= %.2f\n",totalprofit);
return 0;
}


  
    
