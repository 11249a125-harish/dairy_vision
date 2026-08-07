'''➡️ Aim:
To develop a Python program that converts a binary number to its decimal equivalent and an octal number to its hexadecimal equivalent.

➡️ Algorithm:
• Start the program.  
• Accept a binary number and an octal number from the user.  
• Convert the binary number to decimal using int(binary, 2).  
• Convert the octal number to hexadecimal using hex(int(octal, 8)).  
• Display both converted values.  
• Stop the program.  

➡️ Program:'''
def binary_to_decimal(b):
    return int(b, 2)

def octal_to_hexadecimal(o):
    return hex(int(o, 8))

binary = input("Enter a binary number: ")
octal = input("Enter an octal number: ")

print("Decimal equivalent of binary:", binary_to_decimal(binary))
print("Hexadecimal equivalent of octal:", octal_to_hexadecimal(octal))

'''➡️ Result:
Thus the Python program to convert a binary number to decimal and an octal number to hexadecimal is executed successfully.'''
