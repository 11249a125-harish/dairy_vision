'''➡️ Aim:
To write a Python program to recognize a phone number pattern (415-555-4242) both with and without using regular expressions.

➡️ Algorithm:
• Start the program.  
• Define a function isphonenumber() to check the pattern manually.  
• Verify that the string length is 12 characters.  
• Ensure digits are present in correct positions and hyphens in positions 3 and 7.  
• Return True if the pattern matches, else False.  
• Using regular expressions, define pattern as \d{3}-\d{3}-\d{4}.  
• Use fullmatch() to check if the string matches the pattern.  
• Display both results.  
• Stop the program.  

➡️ Program:'''
def isphonenumber(text):
    if len(text) != 12:
        return False
    for i in range(0, 3):
        if not text[i].isdigit():
            return False
    if text[3] != '-':
        return False
    for i in range(4, 7):
        if not text[i].isdigit():
            return False
    if text[7] != '-':
        return False
    for i in range(8, 12):
        if not text[i].isdigit():
            return False
    return True

print("Without Regex:", isphonenumber("415-555-4242"))

import re
pattern = re.compile(r'\d{3}-\d{3}-\d{4}')
print("With Regex:", bool(pattern.fullmatch("415-555-4242")))

'''➡️ Result:
Thus the Python program that checks for a phone number pattern with and without using regular expressions is implemented successfully.'''
