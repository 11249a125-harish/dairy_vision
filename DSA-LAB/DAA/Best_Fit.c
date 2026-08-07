#include<stdio.h>
void bestfit(int items[],int n,int capacity){
int bin[n];
int bincount=0;
for(int i=0;i<n;i++)bin[i]=capacity;
for(int i=0;i<n;i++){
int bestindex=-1;
int minspace=capacity+1;
for(int j=0;j<bincount;j++){
if(bin[j]>=items[i]&&(bin[j]-items[i])<minspace){
bestindex=j;
minspace=bin[j]-items[i];
}}
if(bestindex!=-1){
bin[bestindex]-=items[i];
printf("Item %d (weight %d) placed in Bin %d\n",i+1,items[i],bestindex+1);
}else{
bin[bincount]-=items[i];
printf("Item %d (weight %d) placed in Bin %d\n",i+1,items[i],bincount+1);
bincount++;
}}
printf("Total bins used = %d\n",bincount);
}
int main(){
int n,capacity;
printf("Enter number of items: ");
scanf("%d",&n);
int items[n];
printf("Enter bin capacity: ");
scanf("%d",&capacity);
printf("Enter item sizes:\n");
for(int i=0;i<n;i++){
int itemsize;
printf("Item %d: ",i+1);
scanf("%d",&itemsize);
if(itemsize<=capacity){
items[i]=itemsize;
}else{
printf("Item size exceeds bin capacity. Please enter again.\n");
i--;
}}
bestfit(items,n,capacity);
return 0;
}