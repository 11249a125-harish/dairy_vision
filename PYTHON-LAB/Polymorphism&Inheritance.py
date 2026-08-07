'''➡️ Aim:
To write a Python program using polymorphism and inheritance to check whether an input (string or integer) is a palindrome.

➡️ Algorithm:
• Start the program.  
• Create a base class CheckPalindrome with method is_palindrome().  
• Derive two classes: StringCheck and IntCheck inheriting from base.  
• Override is_palindrome() method in both derived classes.  
• Accept input from user and detect type (string or int).  
• Call appropriate class method to check palindrome.  
• Display result.  
• Stop the program.  

➡️ Program:'''
class CheckPalindrome:
    def is_palindrome(self, data):
        pass

class StringCheck(CheckPalindrome):
    def is_palindrome(self, data):
        return data == data[::-1]

class IntCheck(CheckPalindrome):
    def is_palindrome(self, data):
        s = str(data)
        return s == s[::-1]

data = input("Enter a string or number: ")

try:
    data_int = int(data)
    checker = IntCheck()
except:
    checker = StringCheck()

if checker.is_palindrome(data):
    print("Palindrome")
else:
    print("Not Palindrome")

'''➡️ Result:
Thus the Python program using polymorphism and inheritance to check whether a string or integer is a palindrome is executed successfully.'''
