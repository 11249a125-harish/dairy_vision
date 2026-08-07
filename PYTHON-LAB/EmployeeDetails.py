'''➡️ Aim:
To create a Python program that stores employee details and updates salary for employees in a given department.

➡️ Algorithm:
• Start the program.  
• Create a class Employee with attributes Name, Employee_ID, Department, and Salary.  
• Define a method to update salary for employees in a specific department.  
• Create employee objects and store them in a list.  
• Accept department and increment amount from the user.  
• Update salary for matching department.  
• Display employee details.  
• Stop the program.  

➡️ Program:'''
class Employee:
    def __init__(self, name, eid, dept, salary):
        self.name = name
        self.eid = eid
        self.dept = dept
        self.salary = salary

    def update_salary(self, dept, increment):
        if self.dept == dept:
            self.salary += increment

    def display(self):
        print(self.name, self.eid, self.dept, self.salary)

employees = [
    Employee("Alice", 101, "HR", 5000),
    Employee("Bob", 102, "IT", 6000),
    Employee("Charlie", 103, "HR", 5500)
]

dept = input("Enter department to update salary: ")
inc = float(input("Enter increment amount: "))

for emp in employees:
    emp.update_salary(dept, inc)

for emp in employees:
    emp.display()

'''➡️ Result:
Thus the Python program that stores employee details and updates salary for a given department is implemented successfully.'''
