'''➡️ Aim:
To generate and display the Fibonacci sequence up to N terms using a user-defined function.

➡️ Algorithm:
• Start the program.  
• Define a function named fibonacci(n) to generate the sequence.  
• Check if n is greater than zero; otherwise, display an error message.  
• Initialize two variables, a = 0 and b = 1.  
• Print the first two terms, then calculate the next term as the sum of the previous two.  
• Continue this until n terms are printed.  
• Stop the program.  

➡️ Program:'''
def fibonacci(n):
    if n <= 0:
        print("Error: N must be greater than 0.")
        return
    a, b = 0, 1
    print("Fibonacci sequence:")
    print(a, b, end=" ")
    for _ in range(2, n):
        c = a + b
        print(c, end=" ")
        a, b = b, c

n = int(input("Enter number of terms (N): "))
fibonacci(n)

'''➡️ Result:
Thus the Python program to generate Fibonacci sequence up to N terms using a user-defined function is implemented successfully.'''
