'''➡️ Aim:
To develop a Python program that checks whether a given number is palindrome or not and counts the occurrence of each digit in the input number.

➡️ Algorithm:
• Start the program.  
• Accept a number from the user as input.  
• Convert the number to a string for easy comparison.  
• Check if the string is the same when reversed.  
• If yes, display that the number is a palindrome; otherwise, display that it is not.  
• Use a dictionary to count occurrences of each digit.  
• Display the count of each digit.  
• Stop the program.  

➡️ Program:'''
num = input("Enter a number: ")

if num == num[::-1]:
    print("The number is a Palindrome.")
else:
    print("The number is not a Palindrome.")

count = {}
for digit in num:
    count[digit] = count.get(digit, 0) + 1

print("Digit occurrences:")
for k, v in count.items():
    print(f"{k}: {v}")

'''➡️ Result:
Thus the Python program that checks whether a given number is palindrome or not and counts the occurrences of each digit is executed successfully.'''
