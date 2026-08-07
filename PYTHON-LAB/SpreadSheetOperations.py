'''➡️ Aim:
#To demonstrate a Python program that reads data from a spreadsheet and writes data into a spreadsheet.

➡️ Algorithm:
• Start the program.  
• Import the openpyxl module.  
• Load the existing spreadsheet or create a new workbook.  
• Read data from specific cells.  
• Write data into cells.  
• Save the workbook.  
• Stop the program.  

 Program:'''
import openpyxl

# Create workbook
wb = openpyxl.Workbook()
sheet = wb.active

# Write data
sheet['A1'] = "Name"
sheet['B1'] = "Score"
sheet['A2'] = "Alice"
sheet['B2'] = 95

# Read data
print("Cell A2 value:", sheet['A2'].value)
print("Cell B2 value:", sheet['B2'].value)

wb.save("sample.xlsx")

# Result:
#Thus the Python program to read from and write data into a spreadsheet is executed successfully.
