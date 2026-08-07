//Aim:To implement Dijkstra’s Algorithm to find the shortest path from a source vertex to all other vertices in a graph with non-negative edge weights.
#include <stdio.h>
#define V 5          // Number of vertices
#define INF 999999   // Represent infinity

// Function to find the vertex with minimum distance (not yet visited)
int Extractmin(int dist[], int visited[])
{
    int min = INF, min_index = -1;

    for (int i = 0; i < V; i++)
    {
        if (!visited[i] && dist[i] <= min)
        {
            min = dist[i];
            min_index = i;
        }
    }
    return min_index;
}

// Dijkstra's Algorithm function
void Dijkstras(int graph[V][V])
{
    int dist[V];     // Stores shortest distances
    int visited[V];  // Tracks visited vertices

    // Step 1: Initialize distances and visited array
    for (int i = 0; i < V; i++)
    {
        dist[i] = INF;   // Set all distances to infinity
        visited[i] = 0;  // Mark all as unvisited
    }

    dist[0] = 0;  // Source vertex (0) distance = 0

    // Step 2: Process all vertices
    for (int count = 0; count < V; count++)
    {
        int u = Extractmin(dist, visited); // Get min distance vertex

        if (u == -1)
            break;

        visited[u] = 1; // Mark as visited

        // Step 3: Relax adjacent vertices
        for (int v = 0; v < V; v++)
        {
            if (graph[u][v] > 0 && !visited[v])
            {
                if (dist[v] > dist[u] + graph[u][v])
                {
                    dist[v] = dist[u] + graph[u][v]; // Update distance
                }
            }
        }
    }

    // Step 4: Print shortest distances
    printf("\nVertex \t Distance from Source (0)\n");
    for (int i = 0; i < V; i++)
    {
        printf("%d --> %d\n", i, dist[i]);
    }
}

// Main function
int main()
{
    // Adjacency matrix representation of graph
    int graph[V][V] = {
        {0, 10, 0, 30, 100},
        {40, 0, 50, 0, 0},
        {0, 50, 0, 20, 10},
        {30, 0, 15, 0, 60},
        {10, 90, 1, 60, 0}
    };

    Dijkstras(graph);

    return 0;
}