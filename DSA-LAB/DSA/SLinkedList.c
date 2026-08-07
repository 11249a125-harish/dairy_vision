//Aim:To create a newnode and insert at beginning  

#include<stdio.h>
#include<stdlib.h>
struct Node
{
    int data;
    struct Node* next;
};
struct Node *CreateNode(int data)
{
    struct Node *newnode=malloc(sizeof(struct Node));
    if(!newnode)
    {
        printf("Memory Allocation failed!\n");
        return NULL;
    }
    newnode->data=data;
    newnode->next=NULL;
    return newnode;
}
void insertatbeginning(struct Node **head ,int data)
{
    struct Node* newnode=CreateNode(data);
    newnode->next=*head;
    *head=newnode;
    printf("Node with data %d inserted at beginning successfully\n",data);
}
void insertatend(struct Node **head ,int data)
{
    struct Node* newnode=CreateNode(data);
    if(*head==NULL)
    {
        *head=newnode;
    }else
    {
        struct Node *temp=*head;
        while(temp->next!=NULL)
        {
            temp=temp->next;
        }
        temp->next=newnode;
    }
    printf("Node with data %d inserted at end successfully\n",data);
}
void insertatposition(struct Node **head,int data,int position)
{
    if(position<1)
    {
        printf("invalid position\n");
        return;
    }
    if(position==1)
    {
        insertatbeginning(head,data);
        return;
    }
    struct Node *prev=*head;
    for(int k=1;(k<position-1 && prev!=NULL);k++)
    {
        prev=prev->next;
    }
    if(prev==NULL)
    {
        printf("Given position is out of range!\n");
        return;
    }
    struct Node *newNode= CreateNode(data);
    newNode->next=prev->next;
    prev->next=newNode;
    printf("Node with data %d inserted at position %d successfully\n",data,position);
}
void deletenode(struct Node **head,int valuetodelete)
{
    if(*head==NULL)
    {
        printf("Linkedlist is empty");
        return;
    }
    struct Node *temp=*head;
    if(temp->data==valuetodelete)
    {
        *head=temp->next;
        free(temp);
        printf("Data %d deleted from list \n",valuetodelete);
        return;
    }
    struct Node* prev=*head;
    while(prev->next!=NULL)
    {
        if(prev->next->data==valuetodelete)
        {
            temp=prev->next;
            prev->next=temp->next;
            free(temp);
            printf("Data %d deleted from the list\n",valuetodelete);
            return;
        }
        prev=prev->next;
    }
    if(prev->next==NULL)
    {
        printf("Element %d not found.\n",valuetodelete);
        return;
    }
}
void DisplayList(struct Node *head)
{
    if(head==NULL)
    {
        printf("List is empty\n");
        return;
    }
    struct Node *temp;
    temp=head;
    printf("Linked list Nodes:");
    while(temp!=NULL)
    {
        printf("|At=%p|%d|Next=%p|->",temp,temp->data,temp->next);
        temp=temp->next;
    }
}
int main()
{
    struct Node *head=NULL;
    int choice,data,position;
    while(1)
    {
        printf("\n--Linked list Menu--\n");
        printf("\n 1. Insert at beginning\n");
        printf("\n 2. Insert at End\n");
        printf("\n 3. Insert at position\n");
        printf("\n 4. Delete by value\n");
        printf("\n 5. Display Nodes\n");
        printf("\n 6. Exit\n");
        printf("Enter your choice\n");
        scanf("%d",&choice);

        switch(choice)
        {
            case 1:
            printf("Enter the data to insert");
            scanf("%d",&data);
            insertatbeginning(&head,data);
            break;
            case 2:
            printf("Enter the data to insert");
            scanf("%d",&data);
            insertatend(&head,data);
            break;
            case 3:
            printf("Enter the data and positon to insert");
            scanf("%d %d",&data,&position);
            insertatposition(&head,data,position);
            break;
            case 4:
            printf("Enter the value to delete");
            scanf("%d",&data);
            deletenode(&head,data);
            break;
            case 5:
            DisplayList(head);
            break;
            case 6:
            printf("---Exiting--\n");
            exit(0);
            default:
            printf("Invalid choice!");
        }
    }
    return 0;
}
