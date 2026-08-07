'''➡️ Aim:
To write a Python program to find the similarity percentage between two given strings using SequenceMatcher.

➡️ Algorithm:
• Start the program.  
• Accept two strings from the user.  
• Import SequenceMatcher from the difflib module.  
• Compute similarity ratio using SequenceMatcher(None, s1, s2).ratio().  
• Multiply by 100 to get the percentage.  
• Display the result.  
• Stop the program.  

➡️ Program:'''
from difflib import SequenceMatcher

s1 = input("Enter first string: ")
s2 = input("Enter second string: ")

similarity = SequenceMatcher(None, s1, s2).ratio()
print(f"String Similarity: {similarity * 100:.2f}%")

#➡️ Result:
#Thus the Python program that finds the similarity percentage between two given strings is executed successfully.
