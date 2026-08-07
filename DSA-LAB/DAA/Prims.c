// Aim: To implement Prim's Algorithm to find MST of a connected weighted graph using an adjacency matrix

#include<stdio.h>
#include<stdlib.h>
#define V 5

// Function to find the vertex with minimum key value
int MINKEY(int key[], int visited[])
{
    int min = 999999;
    int min_index = 0;
    for(int i = 0; i < V; i++)
    {
        if(!visited[i] && key[i] < min)
        {
            min = key[i];
            min_index = i;
        }
    }
    return min_index;
}

// Function to print MST
void printPrimsMST(int parent[], int graph[V][V])
{
    printf("\nPrims MST:\n");
    printf("\nEdge\t Weight\n");
    int total = 0;
    for(int i = 1; i < V; i++)   // Start from 1 to skip root
    {
        printf("%d - %d\t%d\n", parent[i], i, graph[i][parent[i]]);
        total += graph[i][parent[i]];
    }
    printf("Total cost = %d\n", total);
}

// Algorithm Function
void primsMST(int graph[V][V])
{
    int parent[V];   // Store MST
    int key[V];      // Minimum weights
    int visited[V];  // Visited vertices

    // Initialize all values
    for(int i = 0; i < V; i++)
    {
        key[i] = 999999;  // Set all keys to large value
        visited[i] = 0;   // Mark all as unvisited
    }

    key[0] = 0;      // Start from vertex 0
    parent[0] = -1;  // Root has no parent

    // Build MST
    for(int COUNT = 0; COUNT < V - 1; COUNT++)
    {
        int u = MINKEY(key, visited);
        visited[u] = 1;

        // Update adjacent vertices
        for(int z = 0; z < V; z++)
        {
            // Check edge exists, not visited, and smaller weight
            if(graph[u][z] && !visited[z] && graph[u][z] < key[z])
            {
                parent[z] = u;
                key[z] = graph[u][z];
            }
        }
    }

    printPrimsMST(parent, graph);  // Print the MST
}

int main()
{
    // Adjacency matrix representation of graph
    int graph[V][V] = {
        {1, 5, 3, 0, 0},
        {2, 9, 5, 3, 0},
        {3, 4, 0, 0, 3},
        {0, 9, 0, 0, 2},
        {0, 7, 7, 2, 0}
    };

    primsMST(graph);  // Call function

    return 0;
}