//Aim:To implement a 2-approximation algorithm for finding a Vertex Cover of a given graph
#include <stdio.h>

#define V 5  // Number of vertices

// Function to find approximate Vertex Cover
void findVertexCover(int graph[V][V])
{
    int visited[V];

    // Initialize all vertices as not visited
    for (int i = 0; i < V; i++)
        visited[i] = 0;

    // Traverse all edges
    for (int u = 0; u < V; u++)
    {
        for (int v = 0; v < V; v++)
        {
            // If edge exists and both vertices are not yet selected
            if (graph[u][v] == 1 && !visited[u] && !visited[v])
            {
                // Include both vertices in vertex cover
                visited[u] = 1;
                visited[v] = 1;
            }
        }
    }

    // Print the Vertex Cover
    printf("Approximate Vertex Cover: ");
    int count = 0;

    for (int i = 0; i < V; i++)
    {
        if (visited[i])
        {
            printf("%d ", i);
            count++;
        }
    }

    printf("\nTotal vertices in cover: %d\n", count);
}

int main()
{
    int graph[V][V] = {
        {0, 1, 0, 0, 0},
        {1, 0, 1, 1, 0},
        {0, 1, 0, 1, 1},
        {0, 1, 1, 0, 1},
        {0, 0, 1, 1, 0}
    };

    printf("Executing Vertex Cover Approximation...\n");
    findVertexCover(graph);

    return 0;
}