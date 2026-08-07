//AIM:To implement Kruskals Algorithm to find the Minimum Spanning Tree (MST) of a given weighted graph using a basic Disjoint Set approach.


#include <stdio.h>

#define V 5   // Number of vertice
#define E 6   // Number of edge

int Parent[V];  // Array to store parent of each vertex

// Function to find the leader (root) of a set
int findLeader(int v)
{
    while (Parent[v] != v)
        v = Parent[v];   // Move to parent
    return v;
}

// Function to merge two sets
void mergeSets(int u, int v)
{
    int a = findLeader(u);
    int b = findLeader(v);
    Parent[a] = b;   // Connect one root to another
}

// Function to sort edges based on weight (Bubble Sort)
void sortEdges(int edges[E][3])
{
    for (int i = 0; i < E - 1; i++)
    {
        for (int j = 0; j < E - i - 1; j++)
        {
            // Compare weights
            if (edges[j][2] > edges[j + 1][2])
            {
                // Swap edges
                for (int k = 0; k < 3; k++)
                {
                    int temp = edges[j][k];
                    edges[j][k] = edges[j + 1][k];
                    edges[j + 1][k] = temp;
                }
            }
        }
    }
}

// Kruskal's Algorithm function
void Kruskal(int edges[E][3])
{
    sortEdges(edges);   // Step 1: Sort edges

    // Initialize each vertex as its own parent
    for (int i = 0; i < V; i++)
        Parent[i] = i;

    int count = 0, cost = 0;

    printf("Selected Edges:\n");

    // Step 2: Pick edges one by one
    for (int i = 0; i < E; i++)
    {
        int u = edges[i][0];
        int v = edges[i][1];
        int w = edges[i][2];

        // Check if adding edge forms a cycle
        if (findLeader(u) != findLeader(v))
        {
            printf("%d -- %d (Weight: %d)\n", u, v, w);

            mergeSets(u, v);  
            cost += w;
            count++;
        }

        // Stop when MST has (V-1) edges
        if (count == V - 1)
            break;
    }

    printf("Total Cost: %d\n", cost);
}

// Main function
int main()
{
    int edges[E][3] = {
        {1, 1, 2},
        {0, 2, 3},
        {1, 4, 5},
        {1, 7, 3},
        {2, 4, 4},
        {0, 4, 8}
    };

    Kruskal(edges);

    return 0;
}